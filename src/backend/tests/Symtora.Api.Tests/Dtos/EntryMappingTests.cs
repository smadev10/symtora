using Symtora.Api.Dtos;
using Symtora.Api.Models;
using Xunit;

namespace Symtora.Api.Tests.Dtos;

public class EntryMappingTests
{
    private static SymptomEntry EntryWithCauses(string causesJson) => new()
    {
        Id = Guid.NewGuid(),
        RawText = "Kopfweh",
        Status = EntryStatus.Done,
        CreatedAt = DateTimeOffset.UtcNow,
        Assessment = new Assessment
        {
            CausesJson = causesJson,
            Urgency = "low",
            NextStepsJson = "[]",
            GeneratedAt = DateTimeOffset.UtcNow,
        },
    };

    [Fact]
    public void Assessments_stored_before_reasons_existed_still_load()
    {
        // Reasons were added without a migration, so old rows lack the property entirely.
        var response = EntryWithCauses("""[{"Label":"Migraine","Tier":"mid"}]""").ToResponse();

        var cause = Assert.Single(response.Assessment!.Causes);
        Assert.Equal("Migraine", cause.Label);
        Assert.Null(cause.Reason);
    }

    [Fact]
    public void Carries_the_reason_through_to_the_response()
    {
        var response = EntryWithCauses("""[{"Label":"Migraine","Tier":"mid","Reason":"Light hurts."}]""").ToResponse();

        Assert.Equal("Light hurts.", response.Assessment!.Causes[0].Reason);
    }
}
