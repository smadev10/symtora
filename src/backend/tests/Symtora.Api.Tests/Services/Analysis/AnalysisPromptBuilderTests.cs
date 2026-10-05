using Symtora.Api.Services.Analysis;
using Xunit;

namespace Symtora.Api.Tests.Services.Analysis;

public class AnalysisPromptBuilderTests
{
    [Fact]
    public void Includes_symptom_text_and_body_region()
    {
        var prompt = AnalysisPromptBuilder.Build("throbbing pain behind my eyes", "head", "en");

        Assert.Contains("throbbing pain behind my eyes", prompt);
        Assert.Contains("head", prompt);
    }

    [Fact]
    public void Defaults_body_region_to_unspecified_when_missing()
    {
        var prompt = AnalysisPromptBuilder.Build("stomach ache", null, "en");

        Assert.Contains("unspecified", prompt);
    }

    [Fact]
    public void Instructs_model_to_avoid_diagnosis_and_respond_with_json_only()
    {
        var prompt = AnalysisPromptBuilder.Build("sore throat", "throat", "en");

        Assert.Contains("do NOT provide a medical diagnosis", prompt);
        Assert.Contains("ONLY a single JSON object", prompt);
    }

    [Theory]
    [InlineData("de", "German")]
    [InlineData("en", "English")]
    [InlineData("fr", "French")]
    [InlineData("FR", "French")]
    public void Asks_for_the_answer_in_the_app_language(string code, string languageName)
    {
        var prompt = AnalysisPromptBuilder.Build("Kopfweh", "head", code);

        Assert.Contains($"in {languageName}", prompt);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("it")]
    public void Falls_back_to_german_for_an_unknown_language(string? code)
    {
        var prompt = AnalysisPromptBuilder.Build("Kopfweh", "head", code);

        Assert.Contains("in German", prompt);
    }

    [Fact]
    public void Asks_for_a_reason_per_cause_in_prompt_and_schema()
    {
        var prompt = AnalysisPromptBuilder.Build("sore throat", "throat", "en");
        var causeRequired = AnalysisPromptBuilder.ResponseSchema["properties"]!["causes"]!["items"]!["required"]!
            .AsArray()
            .Select(n => n!.GetValue<string>());

        Assert.Contains("\"reason\"", prompt);
        Assert.Contains("reason", causeRequired);
    }
}
