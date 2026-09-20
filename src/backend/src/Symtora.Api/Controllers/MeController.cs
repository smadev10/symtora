using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Symtora.Api.Auth;
using Symtora.Api.Data;

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
}
