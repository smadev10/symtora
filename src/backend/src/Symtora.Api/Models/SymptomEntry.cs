namespace Symtora.Api.Models;

public enum EntryStatus
{
    Pending,
    Done,
    Failed,
}

public class SymptomEntry
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User? User { get; set; }

    public string RawText { get; set; } = default!;
    public string? BodyRegion { get; set; }
    public EntryStatus Status { get; set; } = EntryStatus.Pending;
    public DateTimeOffset CreatedAt { get; set; }

    public Assessment? Assessment { get; set; }
}
