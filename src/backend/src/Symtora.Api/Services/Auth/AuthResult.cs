namespace Symtora.Api.Services.Auth;

public enum AuthError
{
    None,
    EmailAlreadyRegistered,
    InvalidCredentials,
}

public record AuthResult(bool Success, AuthError Error, string? Token, DateTimeOffset? ExpiresAt, string? Name)
{
    public static AuthResult Ok(IssuedToken issued, string name) =>
        new(true, AuthError.None, issued.Token, issued.ExpiresAt, name);

    public static AuthResult Fail(AuthError error) => new(false, error, null, null, null);
}
