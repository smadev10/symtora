using Microsoft.AspNetCore.Mvc;
using Symtora.Api.Dtos;
using Symtora.Api.Services.Auth;

namespace Symtora.Api.Controllers;

[ApiController]
[Route("auth")]
public class AuthController(IAuthService authService) : ControllerBase
{
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
