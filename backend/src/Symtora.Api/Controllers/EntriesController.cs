using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Symtora.Api.Auth;
using Symtora.Api.Data;
using Symtora.Api.Dtos;
using Symtora.Api.Models;
using Symtora.Api.Services.Analysis;

namespace Symtora.Api.Controllers;

[ApiController]
[Authorize]
[Route("entries")]
public class EntriesController(SymtoraDbContext db, IEntryAnalysisQueue queue) : ControllerBase
{
    /// <summary>
    /// Enqueues the entry for analysis and returns immediately — see the backend plan for why
    /// this is async rather than a synchronous call that waits on the model. Clients poll
    /// <see cref="GetById"/> until <c>status</c> is no longer "Pending".
    /// </summary>
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

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<EntryResponse>> GetById(Guid id, CancellationToken ct)
    {
        var entry = await OwnedEntryQuery().FirstOrDefaultAsync(e => e.Id == id, ct);
        return entry is null ? NotFound() : Ok(entry.ToResponse());
    }

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
