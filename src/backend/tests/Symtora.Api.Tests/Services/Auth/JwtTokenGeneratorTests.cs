using System.IdentityModel.Tokens.Jwt;
using Microsoft.Extensions.Options;
using Symtora.Api.Options;
using Symtora.Api.Services.Auth;
using Xunit;

namespace Symtora.Api.Tests.Services.Auth;

public class JwtTokenGeneratorTests
{
    private static JwtTokenGenerator CreateGenerator(int expiryMinutes = 60) =>
        new(Microsoft.Extensions.Options.Options.Create(new JwtOptions
        {
            Secret = "unit-test-secret-at-least-32-characters-long",
            Issuer = "test-issuer",
            Audience = "test-audience",
            ExpiryMinutes = expiryMinutes,
        }));

    [Fact]
    public void GenerateToken_embeds_user_id_and_email_as_claims()
    {
        var generator = CreateGenerator();
        var userId = Guid.NewGuid();

        var issued = generator.GenerateToken(userId, "person@example.com");

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(issued.Token);
        Assert.Equal(userId.ToString(), jwt.Claims.First(c => c.Type == JwtRegisteredClaimNames.Sub).Value);
        Assert.Equal("person@example.com", jwt.Claims.First(c => c.Type == JwtRegisteredClaimNames.Email).Value);
        Assert.Equal("test-issuer", jwt.Issuer);
        Assert.Contains("test-audience", jwt.Audiences);
    }

    [Fact]
    public void GenerateToken_sets_expiry_according_to_options()
    {
        var generator = CreateGenerator(expiryMinutes: 30);

        var issued = generator.GenerateToken(Guid.NewGuid(), "person@example.com");

        var expectedExpiry = DateTimeOffset.UtcNow.AddMinutes(30);
        Assert.True(Math.Abs((issued.ExpiresAt - expectedExpiry).TotalSeconds) < 5);
    }
}
