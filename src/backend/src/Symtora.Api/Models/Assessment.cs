namespace Symtora.Api.Models;

/// <summary>
/// Result of running a <see cref="SymptomEntry"/> through the model. Causes and next-steps are
/// stored as JSON columns (rather than child tables) since a capstone-scale app never queries
/// into them individually — they're always read/written as a whole alongside the entry.
/// </summary>
public class Assessment
{
    public Guid Id { get; set; }
    public Guid EntryId { get; set; }
    public SymptomEntry? Entry { get; set; }

    /// <summary>Serialized <c>List&lt;AssessmentCause&gt;</c>.</summary>
    public string CausesJson { get; set; } = "[]";

    /// <summary>"low" | "mid" | "high".</summary>
    public string Urgency { get; set; } = "low";

    /// <summary>Serialized <c>List&lt;string&gt;</c>.</summary>
    public string NextStepsJson { get; set; } = "[]";

    public DateTimeOffset GeneratedAt { get; set; }
}

/// <param name="Label">Name of the possible cause.</param>
/// <param name="Tier">"low" | "mid" | "high" likelihood.</param>
/// <param name="Reason">
/// One sentence on why it fits. Null for assessments stored before reasons were asked for —
/// they live in the same JSON column, so no migration was needed.
/// </param>
public record AssessmentCause(string Label, string Tier, string? Reason = null);
