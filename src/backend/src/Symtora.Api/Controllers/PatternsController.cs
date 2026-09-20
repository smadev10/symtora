using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Symtora.Api.Auth;
using Symtora.Api.Data;
using Symtora.Api.Dtos;

namespace Symtora.Api.Controllers;

/// <summary>Aggregated views over a user's history, for the app's patterns screen.</summary>
[ApiController]
[Authorize]
[Route("patterns")]
public class PatternsController(SymtoraDbContext db) : ControllerBase
{
    /// <summary>Body-region breakdown of the signed-in user's analysed entries.</summary>
    /// <remarks>
    /// One row per body region, ordered by most recent: how many entries it has, the urgency of
    /// the latest one, and when that was. Entries without a body region, or still awaiting
    /// analysis, are left out.
    /// </remarks>
    /// <response code="200">The breakdown. An empty array until entries have been analysed.</response>
    [HttpGet]
    public async Task<ActionResult<List<PatternResponse>>> Get(CancellationToken ct)
    {
        var userId = User.GetUserId();

        var grouped = await db.Entries
            .Include(e => e.Assessment)
            .Where(e => e.UserId == userId && e.BodyRegion != null && e.Assessment != null)
            .GroupBy(e => e.BodyRegion)
            .Select(g => new PatternResponse(
                g.Key!,
                g.Count(),
                g.OrderByDescending(e => e.CreatedAt).Select(e => e.Assessment!.Urgency).FirstOrDefault(),
                g.Max(e => e.CreatedAt)))
            .OrderByDescending(p => p.LastEntryAt)
            .ToListAsync(ct);

        return Ok(grouped);
    }
}
