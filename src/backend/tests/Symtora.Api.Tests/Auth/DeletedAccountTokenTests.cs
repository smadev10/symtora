using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Symtora.Api.Auth;
using Symtora.Api.Data;
using Symtora.Api.Models;

namespace Symtora.Api.Tests.Auth;

/// <summary>
/// A JWT stays cryptographically valid for its whole lifetime, so without this check a token
/// issued before "delete my account" would keep authenticating a user who no longer exists.
/// </summary>
public class DeletedAccountTokenTests
{
    private static async Task<TokenValidatedContext> ValidateAsync(Guid tokenUserId, Action<SymtoraDbContext> seed)
    {
        var databaseName = Guid.NewGuid().ToString(); // outside the lambda, or every scope gets its own database
        var services = new ServiceCollection()
            .AddDbContext<SymtoraDbContext>(o => o.UseInMemoryDatabase(databaseName))
            .BuildServiceProvider();
        using (var scope = services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<SymtoraDbContext>();
            seed(db);
            db.SaveChanges();
        }

        var httpContext = new DefaultHttpContext { RequestServices = services.CreateScope().ServiceProvider };
        var context = new TokenValidatedContext(
            httpContext,
            new AuthenticationScheme(JwtBearerDefaults.AuthenticationScheme, null, typeof(JwtBearerHandler)),
            new JwtBearerOptions())
        {
            Principal = new ClaimsPrincipal(new ClaimsIdentity([new Claim(JwtRegisteredClaimNames.Sub, tokenUserId.ToString())], "test")),
        };

        await JwtBearerSetup.RejectDeletedAccountsAsync(context);
        return context;
    }

    [Fact]
    public async Task Token_for_an_existing_account_passes()
    {
        var userId = Guid.NewGuid();

        var context = await ValidateAsync(userId, db => db.Users.Add(new User
        {
            Id = userId,
            Email = "me@example.com",
            Name = "me",
            PasswordHash = "hash",
            CreatedAt = DateTimeOffset.UtcNow,
        }));

        Assert.Null(context.Result);
    }

    [Fact]
    public async Task Token_for_a_deleted_account_fails()
    {
        var context = await ValidateAsync(Guid.NewGuid(), _ => { });

        Assert.NotNull(context.Result);
        Assert.False(context.Result.Succeeded);
    }
}
