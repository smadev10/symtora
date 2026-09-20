using System.Threading.Channels;

namespace Symtora.Api.Services.Analysis;

/// <summary>
/// In-memory job queue so <c>POST /entries</c> can return immediately (202) instead of blocking
/// the request on the model call — see the backend plan's rationale on why a long synchronous
/// call is a poor fit for a mobile client. This is intentionally simple (single-process,
/// in-memory) for a capstone deployment; a multi-instance deployment would swap this for a real
/// queue (e.g. Postgres-backed or a message broker) without changing the controller/worker
/// contracts.
/// </summary>
public class EntryAnalysisQueue : IEntryAnalysisQueue
{
    private readonly Channel<Guid> _channel = Channel.CreateUnbounded<Guid>();

    public void Enqueue(Guid entryId) => _channel.Writer.TryWrite(entryId);

    public IAsyncEnumerable<Guid> DequeueAllAsync(CancellationToken ct) =>
        _channel.Reader.ReadAllAsync(ct);
}
