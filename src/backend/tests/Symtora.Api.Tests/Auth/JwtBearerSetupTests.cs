using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Symtora.Api.Auth;
using Symtora.Api.Options;
using Symtora.Api.Services.Auth;
using Xunit;

namespace Symtora.Api.Tests.Auth;

/// <summary>
/// Runs a real token through the API's own JwtBearer settings and on to GetUserId(). The token
/// generator tests read the raw token, so they could not catch the `sub` claim being renamed on
/// the way in — which made every authenticated endpoint answer 500.
/// </summary>
public class JwtBearerSetupTests
{
    private const string Secret = "unit-test-secret-at-least-32-characters-long";
    private const string Issuer = "test-issuer";
    private const string Audience = "test-audience";

    private static string IssueToken(Guid userId) =>
        new JwtTokenGenerator(Microsoft.Extensions.Options.Options.Create(new JwtOptions
        {
            Secret = Secret,
            Issuer = Issuer,
            Audience = Audience,
            ExpiryMinutes = 60,
        })).GenerateToken(userId, "person@example.com").Token;

    private static async Task<ClaimsPrincipal> ValidateAsync(JwtBearerOptions options, string token)
    {
        var result = await options.TokenHandlers[0].ValidateTokenAsync(token, options.TokenValidationParameters);
        Assert.True(result.IsValid, result.Exception?.Message);
        return new ClaimsPrincipal(result.ClaimsIdentity);
    }

    [Fact]
    public async Task Validated_token_yields_the_user_id()
    {
        var userId = Guid.NewGuid();
        var options = new JwtBearerOptions();
        JwtBearerSetup.Configure(options, Secret, Issuer, Audience);

        var principal = await ValidateAsync(options, IssueToken(userId));

        Assert.Equal(userId, principal.GetUserId());
    }

    [Fact]
    public async Task Default_claim_mapping_would_hide_the_sub_claim()
    {
        // Proves the test above actually depends on MapInboundClaims = false.
        var options = new JwtBearerOptions();
        JwtBearerSetup.Configure(options, Secret, Issuer, Audience);
        options.MapInboundClaims = true;

        var principal = await ValidateAsync(options, IssueToken(Guid.NewGuid()));

        Assert.Throws<InvalidOperationException>(() => principal.GetUserId());
    }

    [Fact]
    public async Task Rejects_a_token_for_another_audience()
    {
        var options = new JwtBearerOptions();
        JwtBearerSetup.Configure(options, Secret, Issuer, "some-other-app");

        var result = await options.TokenHandlers[0].ValidateTokenAsync(
            IssueToken(Guid.NewGuid()),
            options.TokenValidationParameters);

        Assert.False(result.IsValid);
    }
}
