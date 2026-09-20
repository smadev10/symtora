using Symtora.Api.Models;

namespace Symtora.Api.Services.Analysis;

public record AnalysisResult(string Urgency, List<AssessmentCause> Causes, List<string> NextSteps);
