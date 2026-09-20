namespace Symtora.Api.Services.Auth;

public interface IAuthService
{
    Task<AuthResult> RegisterAsync(string email, string password, CancellationToken ct);

    Task<AuthResult> LoginAsync(string email, string password, CancellationToken ct);
}
