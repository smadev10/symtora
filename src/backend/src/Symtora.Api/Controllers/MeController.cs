using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Symtora.Api.Auth;
using Symtora.Api.Data;
using Symtora.Api.Dtos;

namespace Symtora.Api.Controllers;

/// <summary>The signed-in user's own account and data controls.</summary>
[ApiController]
[Authorize]
[Route("me")]
public class MeController(SymtoraDbContext db) : ControllerBase
{
    /// <summary>Deletes all of the signed-in user's health data.</summary>
    /// <remarks>
    /// Backs the app's "deletable at any time" promise: removes every symptom entry and its
    /// assessment. The account itself is kept, so the user stays logged in and can start over —
    /// this deletes health data, not the account. There is no undo.
    /// </remarks>
    /// <response code="204">Everything deleted.</response>
    [HttpDelete("data")]
    public async Task<IActionResult> DeleteMyData(CancellationToken ct)
    {
        var userId = User.GetUserId();

        await db.Entries.Where(e => e.UserId == userId).ExecuteDeleteAsync(ct);

        return NoContent();
    }

    /// <summary>Deletes the signed-in user's account and everything stored with it.</summary>
    /// <remarks>
    /// Removes the account (email, name, password hash) together with every symptom entry and
    /// assessment. The database cascades the delete, so nothing is left behind. Tokens issued
    /// for the account stop working right away. There is no undo.
    /// </remarks>
    /// <response code="204">The account is gone, or was already gone.</response>
    [HttpDelete]
    public async Task<IActionResult> DeleteAccount(CancellationToken ct)
    {
        var user = await db.Users.FindAsync([User.GetUserId()], ct);
        if (user is not null)
        {
            db.Users.Remove(user);
            await db.SaveChangesAsync(ct);
        }

        return NoContent();
    }

    /// <summary>Exports everything stored about the signed-in user as JSON.</summary>
    /// <remarks>
    /// Backs the right of access and data portability (nDSG Art. 25 and 28, GDPR Art. 15 and
    /// 20): the profile plus every symptom entry with its assessment. The password hash is left
    /// out because it is a credential, not information about the person.
    /// </remarks>
    /// <response code="200">The export.</response>
    /// <response code="404">The account no longer exists.</response>
    [HttpGet("export")]
    public async Task<ActionResult<MyDataExport>> Export(CancellationToken ct)
    {
        var userId = User.GetUserId();

        var user = await db.Users.AsNoTracking().SingleOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null)
            return NotFound();

        var entries = await db.Entries
            .AsNoTracking()
            .Include(e => e.Assessment)
            .Where(e => e.UserId == userId)
            .OrderBy(e => e.CreatedAt)
            .ToListAsync(ct);

        return new MyDataExport(
            DateTimeOffset.UtcNow,
            new ProfileExport(user.Email, user.Name, user.CreatedAt),
            entries.Select(e => e.ToResponse()).ToList());
    }
}
