using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Symtora.Api.Data;
using Symtora.Api.Models;

namespace Symtora.Api.Services.Analysis;

/// <summary>
/// Drains <see cref="IEntryAnalysisQueue"/> and runs each entry through the model, persisting the
/// resulting <see cref="Assessment"/> and flipping the entry's status. Runs as a singleton
/// background service, so it resolves a scoped <see cref="SymtoraDbContext"/> per job rather than
/// holding one for the worker's lifetime.
/// </summary>
/// <remarks>
/// An exception escaping <see cref="ExecuteAsync"/> stops the whole host (the default
/// BackgroundServiceExceptionBehavior), so nothing a single job does may leave this loop — only
/// a real shutdown ends it.
/// </remarks>
public class EntryAnalysisWorker(
    IEntryAnalysisQueue queue,
    IServiceScopeFactory scopeFactory,
    IOllamaClient ollamaClient,
    ILogger<EntryAnalysisWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await RequeuePendingEntriesAsync(stoppingToken);
        _ = WarmUpModelAsync(stoppingToken);

        await foreach (var entryId in queue.DequeueAllAsync(stoppingToken))
        {
            try
            {
                await ProcessAsync(entryId, stoppingToken);
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                // Last resort, e.g. the database was unreachable while recording the failure.
                logger.LogError(ex, "Entry {EntryId}: analysis job crashed", entryId);
            }
        }
    }

    /// <summary>
    /// The queue is in memory, so entries still pending when the API last stopped would otherwise
    /// never be analysed.
    /// </summary>
    private async Task RequeuePendingEntriesAsync(CancellationToken ct)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<SymtoraDbContext>();

            var pendingIds = await db.Entries
                .Where(e => e.Status == EntryStatus.Pending)
                .OrderBy(e => e.CreatedAt)
                .Select(e => e.Id)
                .ToListAsync(ct);

            foreach (var id in pendingIds)
            {
                queue.Enqueue(id);
            }

            if (pendingIds.Count > 0)
            {
                logger.LogInformation("Re-queued {Count} entries left pending by a previous run", pendingIds.Count);
            }
        }
        catch (Exception ex) when (!ct.IsCancellationRequested)
        {
            logger.LogError(ex, "Could not re-queue pending entries");
        }
    }

    /// <summary>Loads the model up front so the first user doesn't wait for it. Best effort.</summary>
    private async Task WarmUpModelAsync(CancellationToken ct)
    {
        try
        {
            await ollamaClient.WarmUpAsync(ct);
        }
        catch (Exception ex) when (!ct.IsCancellationRequested)
        {
            logger.LogWarning(ex, "Model warm-up failed; the first analysis will load it instead");
        }
    }

    private async Task ProcessAsync(Guid entryId, CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SymtoraDbContext>();

        var entry = await db.Entries.FirstOrDefaultAsync(e => e.Id == entryId, ct);
        if (entry is null)
        {
            logger.LogWarning("Analysis job for unknown entry {EntryId} — skipping", entryId);
            return;
        }

        // An entry can be queued twice when the startup re-queue races a new submission.
        if (entry.Status != EntryStatus.Pending)
        {
            return;
        }

        try
        {
            var prompt = AnalysisPromptBuilder.Build(entry.RawText, entry.BodyRegion, entry.Language);
            var rawOutput = await ollamaClient.GenerateAsync(prompt, AnalysisPromptBuilder.ResponseSchema, ct);

            if (!AnalysisResponseParser.TryParse(rawOutput, out var analysis) || analysis is null)
            {
                logger.LogWarning("Entry {EntryId}: model output could not be parsed", entryId);
                entry.Status = EntryStatus.Failed;
                await db.SaveChangesAsync(ct);
                return;
            }

            db.Assessments.Add(new Assessment
            {
                Id = Guid.NewGuid(),
                EntryId = entry.Id,
                Urgency = analysis.Urgency,
                CausesJson = JsonSerializer.Serialize(analysis.Causes),
                NextStepsJson = JsonSerializer.Serialize(analysis.NextSteps),
                GeneratedAt = DateTimeOffset.UtcNow,
            });
            entry.Status = EntryStatus.Done;
            await db.SaveChangesAsync(ct);
        }
        // Not `ex is not OperationCanceledException`: an HttpClient timeout is a
        // TaskCanceledException too, and letting it through stopped the whole API.
        catch (Exception ex) when (!ct.IsCancellationRequested)
        {
            logger.LogError(ex, "Entry {EntryId}: analysis failed", entryId);
            entry.Status = EntryStatus.Failed;
            await db.SaveChangesAsync(ct);
        }
    }
}
