using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Symtora.Api.Auth;

public static class ClaimsPrincipalExtensions
{
    public static Guid GetUserId(this ClaimsPrincipal principal)
    {
        var sub = principal.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? throw new InvalidOperationException("Token has no 'sub' claim.");
        return Guid.Parse(sub);
    }
}
