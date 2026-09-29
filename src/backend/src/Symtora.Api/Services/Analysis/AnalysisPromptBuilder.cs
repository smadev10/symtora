using System.Text.Json.Nodes;

namespace Symtora.Api.Services.Analysis;

/// <summary>
/// Builds the prompt sent to the self-hosted model for a symptom entry, and the JSON schema its
/// answer must follow. Both live here so the shape described in words and the shape enforced by
/// Ollama's structured output can't drift apart. Pure/stateless so it's trivially unit-testable
/// without a running model.
/// </summary>
public static class AnalysisPromptBuilder
{
    /// <summary>The app's languages. Anything else is answered in German, the app's default.</summary>
    private static readonly Dictionary<string, string> LanguageNames = new(StringComparer.OrdinalIgnoreCase)
    {
        ["de"] = "German",
        ["en"] = "English",
        ["fr"] = "French",
    };

    /// <summary>Passed as Ollama's <c>format</c>, which constrains generation to this schema.</summary>
    public static JsonNode ResponseSchema => JsonNode.Parse("""
        {
          "type": "object",
          "properties": {
            "urgency": { "type": "string", "enum": ["low", "mid", "high"] },
            "causes": {
              "type": "array",
              "minItems": 2,
              "maxItems": 4,
              "items": {
                "type": "object",
                "properties": {
                  "label": { "type": "string" },
                  "tier": { "type": "string", "enum": ["low", "mid", "high"] },
                  "reason": { "type": "string" }
                },
                "required": ["label", "tier", "reason"]
              }
            },
            "nextSteps": {
              "type": "array",
              "minItems": 1,
              "maxItems": 4,
              "items": { "type": "string" }
            }
          },
          "required": ["urgency", "causes", "nextSteps"]
        }
        """)!;

    public static string Build(string rawText, string? bodyRegion, string? language)
    {
        var region = string.IsNullOrWhiteSpace(bodyRegion) ? "unspecified" : bodyRegion.Trim();
        var languageName = language is not null && LanguageNames.TryGetValue(language, out var name)
            ? name
            : LanguageNames["de"];

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
              "causes": [ { "label": string, "tier": "low" | "mid" | "high", "reason": string } ],
              "nextSteps": [ string ]
            }

            "causes" should be ordered most-likely first (2-4 entries). Each "reason" is one short
            sentence saying which part of the description fits that cause. "nextSteps" should be
            short, actionable, non-alarmist advice (1-4 entries). If anything suggests a medical
            emergency, set "urgency" to "high" and say so in the first "nextSteps" entry.

            Write every "label", "reason" and "nextSteps" entry in {{languageName}}. Keep the
            "urgency" and "tier" values exactly as listed above, in English.
            """;
    }
}
