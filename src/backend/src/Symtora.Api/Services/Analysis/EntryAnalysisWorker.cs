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
public class EntryAnalysisWorker(
    IEntryAnalysisQueue queue,
    IServiceScopeFactory scopeFactory,
    IOllamaClient ollamaClient,
    ILogger<EntryAnalysisWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var entryId in queue.DequeueAllAsync(stoppingToken))
        {
            await ProcessAsync(entryId, stoppingToken);
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

        try
        {
            var prompt = AnalysisPromptBuilder.Build(entry.RawText, entry.BodyRegion);
            var rawOutput = await ollamaClient.GenerateAsync(prompt, ct);

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
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Entry {EntryId}: analysis failed", entryId);
            entry.Status = EntryStatus.Failed;
            await db.SaveChangesAsync(ct);
        }
    }
}
