namespace Symtora.Api.Services.Auth;

public interface IAuthService
{
    Task<AuthResult> RegisterAsync(string name, string email, string password, CancellationToken ct);

    Task<AuthResult> LoginAsync(string email, string password, CancellationToken ct);

    /// <returns><see cref="AuthError.None"/> once the new password is stored, otherwise why not.</returns>
    Task<AuthError> ChangePasswordAsync(Guid userId, string currentPassword, string newPassword, CancellationToken ct);
}
