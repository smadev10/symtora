using Symtora.Api.Services.Analysis;
using Xunit;

namespace Symtora.Api.Tests.Services.Analysis;

public class AnalysisResponseParserTests
{
    [Fact]
    public void Parses_well_formed_json()
    {
        const string raw = """
            {
              "urgency": "mid",
              "causes": [
                { "label": "Tension headache", "tier": "high" },
                { "label": "Dehydration", "tier": "mid" }
              ],
              "nextSteps": ["Rest and hydrate", "See a doctor if it persists beyond 3 days"]
            }
            """;

        var ok = AnalysisResponseParser.TryParse(raw, out var result);

        Assert.True(ok);
        Assert.Equal("mid", result!.Urgency);
        Assert.Equal(2, result.Causes.Count);
        Assert.Equal("Tension headache", result.Causes[0].Label);
        Assert.Equal("high", result.Causes[0].Tier);
        Assert.Equal(2, result.NextSteps.Count);
    }

    [Fact]
    public void Extracts_json_wrapped_in_markdown_fences_and_prose()
    {
        const string raw = """
            Sure, here is the assessment:
            ```json
            { "urgency": "low", "causes": [], "nextSteps": ["Monitor for now."] }
            ```
            Let me know if you need anything else!
            """;

        var ok = AnalysisResponseParser.TryParse(raw, out var result);

        Assert.True(ok);
        Assert.Equal("low", result!.Urgency);
        Assert.Empty(result.Causes);
        Assert.Equal(["Monitor for now."], result.NextSteps);
    }

    [Theory]
    [InlineData("URGENT")]
    [InlineData("")]
    [InlineData(null)]
    public void Falls_back_to_mid_urgency_for_invalid_or_missing_values(string? urgency)
    {
        var raw = $$"""{ "urgency": {{(urgency is null ? "null" : $"\"{urgency}\"")}}, "causes": [], "nextSteps": [] }""";

        var ok = AnalysisResponseParser.TryParse(raw, out var result);

        Assert.True(ok);
        Assert.Equal("mid", result!.Urgency);
    }

    [Fact]
    public void Normalizes_urgency_and_tier_casing()
    {
        const string raw = """
            { "urgency": "HIGH", "causes": [{ "label": "x", "tier": "Low" }], "nextSteps": [] }
            """;

        AnalysisResponseParser.TryParse(raw, out var result);

        Assert.Equal("high", result!.Urgency);
        Assert.Equal("low", result.Causes[0].Tier);
    }

    [Fact]
    public void Drops_causes_with_blank_labels()
    {
        const string raw = """
            { "urgency": "low", "causes": [{ "label": "  ", "tier": "low" }, { "label": "Real cause", "tier": "low" }], "nextSteps": [] }
            """;

        AnalysisResponseParser.TryParse(raw, out var result);

        Assert.Equal(["Real cause"], result!.Causes.Select(c => c.Label));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("just some prose with no JSON at all")]
    [InlineData("{ not valid json")]
    public void Fails_for_unparseable_input(string? raw)
    {
        var ok = AnalysisResponseParser.TryParse(raw, out var result);

        Assert.False(ok);
        Assert.Null(result);
    }
}
