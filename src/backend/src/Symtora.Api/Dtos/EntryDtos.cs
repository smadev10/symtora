using System.ComponentModel.DataAnnotations;
using Symtora.Api.Models;

namespace Symtora.Api.Dtos;

public record CreateEntryRequest(
    [Required, MinLength(1)] string Text,
    string? BodyRegion);

public record CreateEntryResponse(Guid Id, string Status);

public record AssessmentResponse(
    List<AssessmentCause> Causes,
    string Urgency,
    List<string> NextSteps,
    DateTimeOffset GeneratedAt);

public record EntryResponse(
    Guid Id,
    string RawText,
    string? BodyRegion,
    string Status,
    DateTimeOffset CreatedAt,
    AssessmentResponse? Assessment);

public record PatternResponse(string BodyRegion, int EntryCount, string? LastUrgency, DateTimeOffset LastEntryAt);

public static class EntryMapping
{
    public static EntryResponse ToResponse(this SymptomEntry entry) => new(
        entry.Id,
        entry.RawText,
        entry.BodyRegion,
        entry.Status.ToString(),
        entry.CreatedAt,
        entry.Assessment is null
            ? null
            : new AssessmentResponse(
                System.Text.Json.JsonSerializer.Deserialize<List<AssessmentCause>>(entry.Assessment.CausesJson) ?? [],
                entry.Assessment.Urgency,
                System.Text.Json.JsonSerializer.Deserialize<List<string>>(entry.Assessment.NextStepsJson) ?? [],
                entry.Assessment.GeneratedAt));
}
