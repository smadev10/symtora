using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

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
    }
}
