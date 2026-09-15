namespace Symtora.Api.Services.Auth;

public enum AuthError
{
    None,
    EmailAlreadyRegistered,
    InvalidCredentials,
}

public record AuthResult(bool Success, AuthError Error, string? Token, DateTimeOffset? ExpiresAt)
{
    public static AuthResult Ok(IssuedToken issued) => new(true, AuthError.None, issued.Token, issued.ExpiresAt);

    public static AuthResult Fail(AuthError error) => new(false, error, null, null);
}
