using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Symtora.Api.Data;
using Symtora.Api.Models;
using Symtora.Api.Services.Analysis;
using Xunit;

namespace Symtora.Api.Tests.Services.Analysis;

public class EntryAnalysisWorkerTests
{
    private const string ValidOutput = """
        {
          "urgency": "low",
          "causes": [{ "label": "Tension headache", "tier": "high", "reason": "Fits the neck stiffness." }],
          "nextSteps": ["Drink water."]
        }
        """;

    /// <summary>Answers per prompt, so one test can mix failing and succeeding entries.</summary>
    private sealed class FakeOllamaClient(Func<string, Task<string>> generate) : IOllamaClient
    {
        public List<string> Prompts { get; } = [];

        public Task<string> GenerateAsync(string prompt, JsonNode format, CancellationToken ct)
        {
            lock (Prompts) Prompts.Add(prompt);
            return generate(prompt);
        }

        public Task WarmUpAsync(CancellationToken ct) => Task.CompletedTask;
    }

    private sealed class Harness : IAsyncDisposable
    {
        private readonly ServiceProvider _services;

        public Harness(IOllamaClient client)
        {
            var dbName = Guid.NewGuid().ToString();
            _services = new ServiceCollection()
                .AddDbContext<SymtoraDbContext>(o => o.UseInMemoryDatabase(dbName))
                .BuildServiceProvider();

            Queue = new EntryAnalysisQueue();
            Worker = new EntryAnalysisWorker(
                Queue,
                _services.GetRequiredService<IServiceScopeFactory>(),
                client,
                NullLogger<EntryAnalysisWorker>.Instance);
        }

        public EntryAnalysisQueue Queue { get; }
        public EntryAnalysisWorker Worker { get; }

        public async Task<Guid> SeedAsync(string text, EntryStatus status = EntryStatus.Pending, string language = "de")
        {
            await using var db = Db();
            var entry = new SymptomEntry
            {
                Id = Guid.NewGuid(),
                UserId = Guid.NewGuid(),
                RawText = text,
                Status = status,
                Language = language,
                CreatedAt = DateTimeOffset.UtcNow,
            };
            db.Entries.Add(entry);
            await db.SaveChangesAsync();
            return entry.Id;
        }

        public async Task<EntryStatus> StatusAsync(Guid id)
        {
            await using var db = Db();
            return (await db.Entries.SingleAsync(e => e.Id == id)).Status;
        }

        /// <summary>Polls until the entry leaves Pending; the worker runs on its own task.</summary>
        public async Task<EntryStatus> SettledStatusAsync(Guid id)
        {
            var deadline = DateTime.UtcNow.AddSeconds(10);
            while (DateTime.UtcNow < deadline)
            {
                var status = await StatusAsync(id);
                if (status != EntryStatus.Pending) return status;
                await Task.Delay(20);
            }

            throw new TimeoutException($"Entry {id} stayed Pending");
        }

        private SymtoraDbContext Db() =>
            _services.CreateScope().ServiceProvider.GetRequiredService<SymtoraDbContext>();

        public async ValueTask DisposeAsync()
        {
            await Worker.StopAsync(CancellationToken.None);
            await _services.DisposeAsync();
        }
    }

    [Fact]
    public async Task A_model_timeout_fails_that_entry_and_the_worker_keeps_going()
    {
        // HttpClient reports its timeout as a TaskCanceledException — this used to escape the
        // worker and stop the whole API.
        var client = new FakeOllamaClient(prompt => prompt.Contains("slow entry")
            ? Task.FromException<string>(new TaskCanceledException("HttpClient.Timeout elapsed", new TimeoutException()))
            : Task.FromResult(ValidOutput));
        await using var harness = new Harness(client);
        await harness.Worker.StartAsync(CancellationToken.None);

        var slow = await harness.SeedAsync("slow entry");
        var next = await harness.SeedAsync("next entry");
        harness.Queue.Enqueue(slow);
        harness.Queue.Enqueue(next);

        Assert.Equal(EntryStatus.Failed, await harness.SettledStatusAsync(slow));
        Assert.Equal(EntryStatus.Done, await harness.SettledStatusAsync(next));
        Assert.False(harness.Worker.ExecuteTask!.IsCompleted);
    }

    [Fact]
    public async Task Entries_left_pending_by_a_previous_run_are_processed_on_start()
    {
        var client = new FakeOllamaClient(_ => Task.FromResult(ValidOutput));
        await using var harness = new Harness(client);
        var stranded = await harness.SeedAsync("from before the restart");

        await harness.Worker.StartAsync(CancellationToken.None);

        Assert.Equal(EntryStatus.Done, await harness.SettledStatusAsync(stranded));
    }

    [Fact]
    public async Task An_entry_that_is_no_longer_pending_is_not_analysed_again()
    {
        var client = new FakeOllamaClient(_ => Task.FromResult(ValidOutput));
        await using var harness = new Harness(client);
        await harness.Worker.StartAsync(CancellationToken.None);

        var done = await harness.SeedAsync("already done", EntryStatus.Done);
        var pending = await harness.SeedAsync("still pending");
        harness.Queue.Enqueue(done);
        harness.Queue.Enqueue(pending);

        Assert.Equal(EntryStatus.Done, await harness.SettledStatusAsync(pending));
        Assert.Single(client.Prompts);
        Assert.Contains("still pending", client.Prompts[0]);
    }

    [Fact]
    public async Task The_prompt_asks_for_the_entry_language()
    {
        var client = new FakeOllamaClient(_ => Task.FromResult(ValidOutput));
        await using var harness = new Harness(client);
        await harness.Worker.StartAsync(CancellationToken.None);

        var id = await harness.SeedAsync("mal de tête", language: "fr");
        harness.Queue.Enqueue(id);

        await harness.SettledStatusAsync(id);
        Assert.Contains("in French", client.Prompts.Single());
    }

    [Fact]
    public async Task Unparseable_model_output_fails_the_entry()
    {
        var client = new FakeOllamaClient(_ => Task.FromResult("I cannot help with that."));
        await using var harness = new Harness(client);
        await harness.Worker.StartAsync(CancellationToken.None);

        var id = await harness.SeedAsync("anything");
        harness.Queue.Enqueue(id);

        Assert.Equal(EntryStatus.Failed, await harness.SettledStatusAsync(id));
    }
}
