namespace Symtora.Api.Services.Auth;

public record IssuedToken(string Token, DateTimeOffset ExpiresAt);

public interface IJwtTokenGenerator
{
    IssuedToken GenerateToken(Guid userId, string email);
}
