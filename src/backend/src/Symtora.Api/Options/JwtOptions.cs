namespace Symtora.Api.Options;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Secret { get; set; } = default!;
    public string Issuer { get; set; } = "symtora-api";
    public string Audience { get; set; } = "symtora-app";
    public int ExpiryMinutes { get; set; } = 60 * 24 * 7; // 7 days — mobile app, no refresh-token flow for the capstone MVP
}
