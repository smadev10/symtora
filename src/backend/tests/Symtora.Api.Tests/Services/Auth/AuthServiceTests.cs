using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Symtora.Api.Data;
using Symtora.Api.Models;
using Symtora.Api.Services.Auth;
using Xunit;

namespace Symtora.Api.Tests.Services.Auth;

public class AuthServiceTests
{
    private static AuthService CreateService(SymtoraDbContext db) =>
        new(db, new PasswordHasher<User>(), new FakeTokenGenerator());

    private static SymtoraDbContext CreateInMemoryDb() =>
        new(new DbContextOptionsBuilder<SymtoraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    [Fact]
    public async Task RegisterAsync_creates_user_and_returns_token()
    {
        using var db = CreateInMemoryDb();
        var service = CreateService(db);

        var result = await service.RegisterAsync("Person", "Person@Example.com", "correct-password", CancellationToken.None);

        Assert.True(result.Success);
        Assert.Equal(FakeTokenGenerator.Token, result.Token);
        var stored = await db.Users.SingleAsync();
        Assert.Equal("person@example.com", stored.Email); // normalized to lowercase
        Assert.Equal("Person", stored.Name);
        Assert.Equal("Person", result.Name);
        Assert.NotEqual("correct-password", stored.PasswordHash);
    }

    [Fact]
    public async Task RegisterAsync_rejects_duplicate_email_case_insensitively()
    {
        using var db = CreateInMemoryDb();
        var service = CreateService(db);
        await service.RegisterAsync("Person", "person@example.com", "correct-password", CancellationToken.None);

        var result = await service.RegisterAsync("Person", "PERSON@example.com", "another-password", CancellationToken.None);

        Assert.False(result.Success);
        Assert.Equal(AuthError.EmailAlreadyRegistered, result.Error);
        Assert.Single(await db.Users.ToListAsync());
    }

    [Fact]
    public async Task LoginAsync_succeeds_with_correct_password()
    {
        using var db = CreateInMemoryDb();
        var service = CreateService(db);
        await service.RegisterAsync("Person", "person@example.com", "correct-password", CancellationToken.None);

        var result = await service.LoginAsync("person@example.com", "correct-password", CancellationToken.None);

        Assert.True(result.Success);
        Assert.Equal(FakeTokenGenerator.Token, result.Token);
        Assert.Equal("Person", result.Name); // the name given at registration comes back on login
    }

    [Fact]
    public async Task LoginAsync_fails_with_wrong_password()
    {
        using var db = CreateInMemoryDb();
        var service = CreateService(db);
        await service.RegisterAsync("Person", "person@example.com", "correct-password", CancellationToken.None);

        var result = await service.LoginAsync("person@example.com", "wrong-password", CancellationToken.None);

        Assert.False(result.Success);
        Assert.Equal(AuthError.InvalidCredentials, result.Error);
    }

    [Fact]
    public async Task LoginAsync_fails_for_unknown_email()
    {
        using var db = CreateInMemoryDb();
        var service = CreateService(db);

        var result = await service.LoginAsync("nobody@example.com", "whatever", CancellationToken.None);

        Assert.False(result.Success);
        Assert.Equal(AuthError.InvalidCredentials, result.Error);
    }

    private class FakeTokenGenerator : IJwtTokenGenerator
    {
        public const string Token = "fake-token";

        public IssuedToken GenerateToken(Guid userId, string email) =>
            new(Token, DateTimeOffset.UtcNow.AddHours(1));
    }
}
