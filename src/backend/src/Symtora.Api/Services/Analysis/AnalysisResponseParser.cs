using System.Text.Json;
using System.Text.Json.Serialization;
using Symtora.Api.Models;

namespace Symtora.Api.Services.Analysis;

/// <summary>
/// Parses the model's raw text output into a structured <see cref="AnalysisResult"/>. Local
/// models frequently wrap JSON in prose or markdown fences despite instructions not to, so this
/// extracts the outermost {...} object before deserializing, and normalizes/validates the
/// urgency and tier values rather than trusting the model's casing or spelling.
/// </summary>
public static class AnalysisResponseParser
{
    private static readonly HashSet<string> ValidLevels = new(StringComparer.OrdinalIgnoreCase)
    {
        "low", "mid", "high",
    };

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public static bool TryParse(string? rawModelOutput, out AnalysisResult? result)
    {
        result = null;

        var json = ExtractJsonObject(rawModelOutput);
        if (json is null)
        {
            return false;
        }

        ModelOutputDto? dto;
        try
        {
            dto = JsonSerializer.Deserialize<ModelOutputDto>(json, JsonOptions);
        }
        catch (JsonException)
        {
            return false;
        }

        if (dto is null)
        {
            return false;
        }

        // Uncertain/invalid urgency defaults to "mid" rather than "low" — safer to over- than
        // under-estimate urgency when the model output can't be trusted.
        var urgency = NormalizeLevel(dto.Urgency, fallback: "mid");

        var causes = (dto.Causes ?? [])
            .Where(c => !string.IsNullOrWhiteSpace(c.Label))
            .Select(c => new AssessmentCause(c.Label.Trim(), NormalizeLevel(c.Tier, fallback: "mid")))
            .ToList();

        var nextSteps = (dto.NextSteps ?? [])
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(s => s.Trim())
            .ToList();

        result = new AnalysisResult(urgency, causes, nextSteps);
        return true;
    }

    private static string NormalizeLevel(string? value, string fallback) =>
        value is not null && ValidLevels.Contains(value) ? value.ToLowerInvariant() : fallback;

    private static string? ExtractJsonObject(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        var start = text.IndexOf('{');
        var end = text.LastIndexOf('}');
        return start >= 0 && end > start ? text[start..(end + 1)] : null;
    }

    private sealed class ModelOutputDto
    {
        [JsonPropertyName("urgency")]
        public string? Urgency { get; set; }

        [JsonPropertyName("causes")]
        public List<CauseDto>? Causes { get; set; }

        [JsonPropertyName("nextSteps")]
        public List<string>? NextSteps { get; set; }
    }

    private sealed class CauseDto
    {
        [JsonPropertyName("label")]
        public string Label { get; set; } = "";

        [JsonPropertyName("tier")]
        public string? Tier { get; set; }
    }
}
