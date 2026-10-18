using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Symtora.Api.Controllers;
using Symtora.Api.Data;
using Symtora.Api.Dtos;
using Symtora.Api.Models;

namespace Symtora.Api.Tests.Controllers;

public class MeControllerTests
{
    private static SymtoraDbContext CreateInMemoryDb() =>
        new(new DbContextOptionsBuilder<SymtoraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static MeController Controller(SymtoraDbContext db, Guid userId) => new(db)
    {
        ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(JwtRegisteredClaimNames.Sub, userId.ToString())], "test")),
            },
        },
    };

    private static User AddUser(SymtoraDbContext db, string email, params string[] entryTexts)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            Name = email.Split('@')[0],
            PasswordHash = "hash",
            CreatedAt = DateTimeOffset.UtcNow,
        };
        db.Users.Add(user);

        foreach (var text in entryTexts)
        {
            var entry = new SymptomEntry
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                RawText = text,
                Status = EntryStatus.Done,
                CreatedAt = DateTimeOffset.UtcNow,
            };
            entry.Assessment = new Assessment { Id = Guid.NewGuid(), EntryId = entry.Id, Urgency = "low", GeneratedAt = DateTimeOffset.UtcNow };
            db.Entries.Add(entry);
        }

        db.SaveChanges();
        return user;
    }

    [Fact]
    public async Task DeleteAccount_removes_the_user_and_all_their_health_data()
    {
        using var db = CreateInMemoryDb();
        var me = AddUser(db, "me@example.com", "Kopfweh", "Halsweh");

        var result = await Controller(db, me.Id).DeleteAccount(CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        Assert.Empty(await db.Users.ToListAsync());
        Assert.Empty(await db.Entries.ToListAsync());
        Assert.Empty(await db.Assessments.ToListAsync());
    }

    [Fact]
    public async Task DeleteAccount_leaves_other_users_alone()
    {
        using var db = CreateInMemoryDb();
        var me = AddUser(db, "me@example.com", "Kopfweh");
        var other = AddUser(db, "other@example.com", "Rückenschmerzen");

        await Controller(db, me.Id).DeleteAccount(CancellationToken.None);

        Assert.Equal(other.Id, (await db.Users.SingleAsync()).Id);
        Assert.Equal("Rückenschmerzen", (await db.Entries.SingleAsync()).RawText);
    }

    [Fact]
    public async Task DeleteAccount_for_an_already_deleted_account_is_still_no_content()
    {
        using var db = CreateInMemoryDb();

        var result = await Controller(db, Guid.NewGuid()).DeleteAccount(CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task Export_contains_profile_and_only_the_callers_entries()
    {
        using var db = CreateInMemoryDb();
        var me = AddUser(db, "me@example.com", "Kopfweh", "Halsweh");
        AddUser(db, "other@example.com", "Rückenschmerzen");

        var result = await Controller(db, me.Id).Export(CancellationToken.None);

        var export = Assert.IsType<MyDataExport>(result.Value);
        Assert.Equal("me@example.com", export.Profile.Email);
        Assert.Equal("me", export.Profile.Name);
        Assert.Equal(new[] { "Halsweh", "Kopfweh" },export.Entries.Select(e => e.RawText).Order());
        Assert.All(export.Entries, e => Assert.NotNull(e.Assessment));
    }

    [Fact]
    public async Task Export_for_a_deleted_account_is_not_found()
    {
        using var db = CreateInMemoryDb();

        var result = await Controller(db, Guid.NewGuid()).Export(CancellationToken.None);

        Assert.IsType<NotFoundResult>(result.Result);
    }
}
