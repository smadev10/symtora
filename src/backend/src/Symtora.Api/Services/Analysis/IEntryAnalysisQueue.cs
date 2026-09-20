namespace Symtora.Api.Services.Analysis;

public interface IEntryAnalysisQueue
{
    void Enqueue(Guid entryId);

    IAsyncEnumerable<Guid> DequeueAllAsync(CancellationToken ct);
}
