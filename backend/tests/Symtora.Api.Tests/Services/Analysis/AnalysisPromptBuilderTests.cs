using Symtora.Api.Services.Analysis;
using Xunit;

namespace Symtora.Api.Tests.Services.Analysis;

public class AnalysisPromptBuilderTests
{
    [Fact]
    public void Includes_symptom_text_and_body_region()
    {
        var prompt = AnalysisPromptBuilder.Build("throbbing pain behind my eyes", "head");

        Assert.Contains("throbbing pain behind my eyes", prompt);
        Assert.Contains("head", prompt);
    }

    [Fact]
    public void Defaults_body_region_to_unspecified_when_missing()
    {
        var prompt = AnalysisPromptBuilder.Build("stomach ache", null);

        Assert.Contains("unspecified", prompt);
    }

    [Fact]
    public void Instructs_model_to_avoid_diagnosis_and_respond_with_json_only()
    {
        var prompt = AnalysisPromptBuilder.Build("sore throat", "throat");

        Assert.Contains("do NOT provide a medical diagnosis", prompt);
        Assert.Contains("ONLY a single JSON object", prompt);
    }
}
