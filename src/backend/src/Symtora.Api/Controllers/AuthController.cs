using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Symtora.Api.Auth;
using Symtora.Api.Dtos;
using Symtora.Api.Services.Auth;

namespace Symtora.Api.Controllers;

/// <summary>Creating an account and logging in. Both endpoints return the bearer token every other endpoint needs.</summary>
[ApiController]
[Route("auth")]
public class AuthController(IAuthService authService) : ControllerBase
{
    /// <summary>Registers a new account and returns a token for it.</summary>
    /// <remarks>
    /// The name is stored for display only (at most 100 characters) and comes back on every login.
    /// The password must be at least 8 characters. Emails are unique — registering one that
    /// already exists returns 409 rather than logging the existing user in.
    /// </remarks>
    /// <response code="200">Account created. Use the returned token as `Authorization: Bearer &lt;token&gt;`.</response>
    /// <response code="409">That email is already registered.</response>
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request, CancellationToken ct)
    {
        var result = await authService.RegisterAsync(request.Name, request.Email, request.Password, ct);

        if (!result.Success)
        {
            return Conflict(new ProblemDetails { Title = "Email already registered." });
        }

        return Ok(new AuthResponse(result.Token!, result.ExpiresAt!.Value, result.Name!));
    }

    /// <summary>Exchanges email and password for a bearer token.</summary>
    /// <remarks>
    /// Wrong email and wrong password give the same 401, so the response cannot be used to find
    /// out which addresses are registered.
    /// </remarks>
    /// <response code="200">Signed in. The token expires at the returned `expiresAt`.</response>
    /// <response code="401">Invalid email or password.</response>
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request, CancellationToken ct)
    {
        var result = await authService.LoginAsync(request.Email, request.Password, ct);

        if (!result.Success)
        {
            return Unauthorized(new ProblemDetails { Title = "Invalid email or password." });
        }

        return Ok(new AuthResponse(result.Token!, result.ExpiresAt!.Value, result.Name!));
    }

    /// <summary>Changes the signed-in user's password.</summary>
    /// <remarks>
    /// Needs the current password as well, so an unlocked phone alone can't be used to take over
    /// the account. A wrong current password is a 400 on `currentPassword`, not a 401: the token
    /// is fine, only the input is wrong. Tokens already issued stay valid until they expire.
    /// </remarks>
    /// <response code="204">Password changed. The old one no longer works for login.</response>
    /// <response code="400">The current password is wrong, or a field is not a SHA-256 hash.</response>
    [HttpPut("password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request, CancellationToken ct)
    {
        var error = await authService.ChangePasswordAsync(User.GetUserId(), request.CurrentPassword, request.NewPassword, ct);

        if (error != AuthError.None)
        {
            ModelState.AddModelError("currentPassword", "The current password is wrong.");
            return ValidationProblem(ModelState);
        }

        return NoContent();
    }
}
