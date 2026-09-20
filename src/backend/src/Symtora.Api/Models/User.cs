namespace Symtora.Api.Models;

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = default!;
    public string PasswordHash { get; set; } = default!;
    public DateTimeOffset CreatedAt { get; set; }

    public List<SymptomEntry> Entries { get; set; } = new();
}
