using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Symtora.Api.Data;

namespace Symtora.Api.Auth;

/// <summary>
/// The JwtBearer configuration, pulled out of Program.cs so a test can run a real token through
/// exactly the handler settings the API uses.
/// </summary>
public static class JwtBearerSetup
{
    public static void Configure(JwtBearerOptions options, string secret, string? issuer, string? audience)
    {
        // Keep claim names as issued. The default mapping renames `sub` to
        // ClaimTypes.NameIdentifier, which GetUserId() would then never find.
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = issuer,
            ValidAudience = audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
        };
        options.Events = new JwtBearerEvents { OnTokenValidated = RejectDeletedAccountsAsync };
    }

    /// <summary>
    /// Fails a correctly signed token whose account has since been deleted. Tokens live for days
    /// and can't be recalled, so this lookup is what makes "delete my account" take effect on
    /// every device at once instead of when the last token expires.
    /// </summary>
    public static async Task RejectDeletedAccountsAsync(TokenValidatedContext context)
    {
        var db = context.HttpContext.RequestServices.GetRequiredService<SymtoraDbContext>();
        var userId = context.Principal!.GetUserId();

        if (!await db.Users.AnyAsync(u => u.Id == userId, context.HttpContext.RequestAborted))
            context.Fail("The account for this token no longer exists.");
    }
}
