namespace Symtora.Api.Models;

public enum EntryStatus
{
    Pending,
    Done,
    Failed,
}

public class SymptomEntry
{
    public const int LanguageMaxLength = 2;
    public const string DefaultLanguage = "de";

    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User? User { get; set; }

    public string RawText { get; set; } = default!;
    public string? BodyRegion { get; set; }

    /// <summary>App language at submission ("de" | "en" | "fr"); the model answers in it.</summary>
    public string Language { get; set; } = DefaultLanguage;
    public EntryStatus Status { get; set; } = EntryStatus.Pending;
    public DateTimeOffset CreatedAt { get; set; }

    public Assessment? Assessment { get; set; }
}
