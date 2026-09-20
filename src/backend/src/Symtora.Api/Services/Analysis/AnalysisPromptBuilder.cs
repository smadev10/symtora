namespace Symtora.Api.Services.Analysis;

/// <summary>
/// Builds the prompt sent to the self-hosted model for a symptom entry. Pure/stateless so it's
/// trivially unit-testable without a running model.
/// </summary>
public static class AnalysisPromptBuilder
{
    public static string Build(string rawText, string? bodyRegion)
    {
        var region = string.IsNullOrWhiteSpace(bodyRegion) ? "unspecified" : bodyRegion.Trim();

        return $$"""
            You are a symptom-triage assistant. You do NOT provide a medical diagnosis — you only
            suggest possible, non-definitive causes and a suggested urgency so the person knows
            whether to rest, see a doctor soon, or seek emergency care.

            Body region: {{region}}
            Symptom description: "{{rawText.Trim()}}"

            Respond with ONLY a single JSON object, no markdown fences, no extra prose, matching
            exactly this shape:
            {
              "urgency": "low" | "mid" | "high",
              "causes": [ { "label": string, "tier": "low" | "mid" | "high" } ],
              "nextSteps": [ string ]
            }

            "causes" should be ordered most-likely first (2-4 entries). "nextSteps" should be
            short, actionable, non-alarmist advice (1-4 entries). If anything suggests a medical
            emergency, set "urgency" to "high" and say so in the first "nextSteps" entry.
            """;
    }
}
