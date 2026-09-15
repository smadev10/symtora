using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Symtora.Api.Auth;
using Symtora.Api.Data;
using Symtora.Api.Dtos;

namespace Symtora.Api.Controllers;

[ApiController]
[Authorize]
[Route("patterns")]
public class PatternsController(SymtoraDbContext db) : ControllerBase
{
    /// <summary>Body-region breakdown of the current user's completed entries over time.</summary>
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
