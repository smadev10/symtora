using Microsoft.AspNetCore.Mvc;
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
    /// The password must be at least 8 characters. Emails are unique — registering one that
    /// already exists returns 409 rather than logging the existing user in.
    /// </remarks>
    /// <response code="200">Account created. Use the returned token as `Authorization: Bearer &lt;token&gt;`.</response>
    /// <response code="409">That email is already registered.</response>
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request, CancellationToken ct)
    {
        var result = await authService.RegisterAsync(request.Email, request.Password, ct);

        if (!result.Success)
        {
            return Conflict(new ProblemDetails { Title = "Email already registered." });
        }

        return Ok(new AuthResponse(result.Token!, result.ExpiresAt!.Value));
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

        return Ok(new AuthResponse(result.Token!, result.ExpiresAt!.Value));
    }
}
