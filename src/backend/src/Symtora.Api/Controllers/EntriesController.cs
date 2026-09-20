using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Symtora.Api.Auth;
using Symtora.Api.Data;
using Symtora.Api.Dtos;
using Symtora.Api.Models;
using Symtora.Api.Services.Analysis;

namespace Symtora.Api.Controllers;

/// <summary>Symptom entries and the assessments the model produces for them.</summary>
[ApiController]
[Authorize]
[Route("entries")]
public class EntriesController(SymtoraDbContext db, IEntryAnalysisQueue queue) : ControllerBase
{
    /// <summary>Submits a symptom description for analysis.</summary>
    /// <remarks>
    /// Returns 202 immediately with `status: "Pending"` — it does not wait for the model. Analysis
    /// runs in the background on a self-hosted model, which can take a while, so poll
    /// `GET /entries/{id}` until the status is `Done` or `Failed` rather than holding a request
    /// open on a mobile connection.
    /// </remarks>
    /// <param name="request">The symptom text, plus an optional body region such as `head` or `knee`.</param>
    /// <response code="202">Queued. The `Location` header points at the entry to poll.</response>
    [HttpPost]
    public async Task<ActionResult<CreateEntryResponse>> Create(CreateEntryRequest request, CancellationToken ct)
    {
        var entry = new SymptomEntry
        {
            Id = Guid.NewGuid(),
            UserId = User.GetUserId(),
            RawText = request.Text.Trim(),
            BodyRegion = string.IsNullOrWhiteSpace(request.BodyRegion) ? null : request.BodyRegion.Trim(),
            Status = EntryStatus.Pending,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        db.Entries.Add(entry);
        await db.SaveChangesAsync(ct);

        queue.Enqueue(entry.Id);

        return AcceptedAtAction(nameof(GetById), new { id = entry.Id }, new CreateEntryResponse(entry.Id, entry.Status.ToString()));
    }

    /// <summary>Fetches one entry — poll this after creating one.</summary>
    /// <remarks>
    /// `status` is `Pending` while the model is working, then `Done` (with `assessment` filled in)
    /// or `Failed`. Only the current user's own entries are visible; anyone else's id returns 404.
    /// </remarks>
    /// <param name="id">The entry id returned by `POST /entries`.</param>
    /// <response code="200">The entry, with its assessment once analysis finished.</response>
    /// <response code="404">No such entry for the signed-in user.</response>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<EntryResponse>> GetById(Guid id, CancellationToken ct)
    {
        var entry = await OwnedEntryQuery().FirstOrDefaultAsync(e => e.Id == id, ct);
        return entry is null ? NotFound() : Ok(entry.ToResponse());
    }

    /// <summary>Lists the signed-in user's full entry history, newest first.</summary>
    /// <remarks>Feeds the app's history list. Entries still being analysed are included, with `status: "Pending"`.</remarks>
    /// <response code="200">The history. An empty array for a new account.</response>
    [HttpGet]
    public async Task<ActionResult<List<EntryResponse>>> List(CancellationToken ct)
    {
        var entries = await OwnedEntryQuery()
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync(ct);

        return Ok(entries.Select(e => e.ToResponse()));
    }

    private IQueryable<SymptomEntry> OwnedEntryQuery()
    {
        var userId = User.GetUserId();
        return db.Entries.Include(e => e.Assessment).Where(e => e.UserId == userId);
    }
}
