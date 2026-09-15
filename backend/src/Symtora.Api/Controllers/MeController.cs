using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Symtora.Api.Auth;
using Symtora.Api.Data;

namespace Symtora.Api.Controllers;

[ApiController]
[Authorize]
[Route("me")]
public class MeController(SymtoraDbContext db) : ControllerBase
{
    /// <summary>
    /// Fulfills the app's "delete your data anytime" promise: removes every symptom entry and
    /// assessment for the current user (assessments cascade via the FK). The user account itself
    /// is kept so they can still log in — this deletes their health data, not their account.
    /// </summary>
    [HttpDelete("data")]
    public async Task<IActionResult> DeleteMyData(CancellationToken ct)
    {
        var userId = User.GetUserId();

        await db.Entries.Where(e => e.UserId == userId).ExecuteDeleteAsync(ct);

        return NoContent();
    }
}
