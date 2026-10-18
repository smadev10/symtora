using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Symtora.Api.Data;
using Symtora.Api.Models;

namespace Symtora.Api.Services.Auth;

public class AuthService(
    SymtoraDbContext db,
    IPasswordHasher<User> passwordHasher,
    IJwtTokenGenerator tokenGenerator) : IAuthService
{
    public async Task<AuthResult> RegisterAsync(string name, string email, string password, CancellationToken ct)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();

        var alreadyExists = await db.Users.AnyAsync(u => u.Email == normalizedEmail, ct);
        if (alreadyExists)
        {
            return AuthResult.Fail(AuthError.EmailAlreadyRegistered);
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = normalizedEmail,
            Name = name.Trim(),
            CreatedAt = DateTimeOffset.UtcNow,
        };
        user.PasswordHash = passwordHasher.HashPassword(user, password);

        db.Users.Add(user);
        await db.SaveChangesAsync(ct);

        return AuthResult.Ok(tokenGenerator.GenerateToken(user.Id, user.Email), user.Name);
    }

    public async Task<AuthResult> LoginAsync(string email, string password, CancellationToken ct)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();

        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail, ct);
        if (user is null)
        {
            return AuthResult.Fail(AuthError.InvalidCredentials);
        }

        var verification = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password);
        if (verification == PasswordVerificationResult.Failed)
        {
            return AuthResult.Fail(AuthError.InvalidCredentials);
        }

        return AuthResult.Ok(tokenGenerator.GenerateToken(user.Id, user.Email), user.Name);
    }

    public async Task<AuthError> ChangePasswordAsync(Guid userId, string currentPassword, string newPassword, CancellationToken ct)
    {
        var user = await db.Users.FindAsync([userId], ct);
        if (user is null)
        {
            return AuthError.InvalidCredentials;
        }

        var verification = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, currentPassword);
        if (verification == PasswordVerificationResult.Failed)
        {
            return AuthError.InvalidCredentials;
        }

        user.PasswordHash = passwordHasher.HashPassword(user, newPassword);
        await db.SaveChangesAsync(ct);

        return AuthError.None;
    }
}
