using System.Net;
using System.Text;
using Symtora.Api.Services.Transcription;

namespace Symtora.Api.Tests.Services.Transcription;

public class WhisperClientTests
{
    /// <summary>Records the request and answers with a canned response.</summary>
    private sealed class StubHandler(Func<HttpRequestMessage, Task<HttpResponseMessage>> respond) : HttpMessageHandler
    {
        public HttpRequestMessage? Request { get; private set; }
        public string? Body { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Request = request;
            Body = request.Content is null ? null : await request.Content.ReadAsStringAsync(ct);
            return await respond(request);
        }
    }

    private static (WhisperClient Client, StubHandler Handler) Create(Func<HttpRequestMessage, Task<HttpResponseMessage>> respond)
    {
        var handler = new StubHandler(respond);
        var http = new HttpClient(handler) { BaseAddress = new Uri("http://whisper:9000") };
        return (new WhisperClient(http), handler);
    }

    private static Task<HttpResponseMessage> Json(string json, HttpStatusCode status = HttpStatusCode.OK) =>
        Task.FromResult(new HttpResponseMessage(status) { Content = new StringContent(json, Encoding.UTF8, "application/json") });

    private static MemoryStream Audio() => new([1, 2, 3, 4]);

    [Fact]
    public async Task Returns_the_trimmed_text_from_the_json_response()
    {
        var (client, _) = Create(_ => Json("""{ "text": "  Seit gestern Kopfweh. ", "language": "de", "segments": [] }"""));

        var text = await client.TranscribeAsync(Audio(), "recording.m4a", "de", CancellationToken.None);

        Assert.Equal("Seit gestern Kopfweh.", text);
    }

    [Fact]
    public async Task Posts_to_asr_with_transcribe_json_vad_and_the_language()
    {
        var (client, handler) = Create(_ => Json("""{ "text": "x" }"""));

        await client.TranscribeAsync(Audio(), "recording.m4a", "fr", CancellationToken.None);

        Assert.Equal(HttpMethod.Post, handler.Request!.Method);
        Assert.Equal("/asr", handler.Request.RequestUri!.AbsolutePath);
        var query = handler.Request.RequestUri.Query;
        Assert.Contains("task=transcribe", query);
        Assert.Contains("output=json", query);
        Assert.Contains("vad_filter=true", query);
        Assert.Contains("language=fr", query);
        Assert.Contains("audio_file", handler.Body);
    }

    [Fact]
    public async Task Leaves_the_language_out_so_whisper_detects_it_when_none_is_given()
    {
        var (client, handler) = Create(_ => Json("""{ "text": "x" }"""));

        await client.TranscribeAsync(Audio(), "recording.m4a", null, CancellationToken.None);

        Assert.DoesNotContain("language=", handler.Request!.RequestUri!.Query);
    }

    [Fact]
    public async Task Returns_empty_text_for_silence_rather_than_failing()
    {
        var (client, _) = Create(_ => Json("""{ "text": "" }"""));

        Assert.Equal("", await client.TranscribeAsync(Audio(), "a.m4a", "de", CancellationToken.None));
    }

    [Fact]
    public async Task Throws_unavailable_when_whisper_answers_an_error()
    {
        var (client, _) = Create(_ => Json("{}", HttpStatusCode.InternalServerError));

        await Assert.ThrowsAsync<WhisperUnavailableException>(
            () => client.TranscribeAsync(Audio(), "a.m4a", "de", CancellationToken.None));
    }

    [Fact]
    public async Task Throws_unavailable_when_whisper_cannot_be_reached()
    {
        var (client, _) = Create(_ => throw new HttpRequestException("connection refused"));

        await Assert.ThrowsAsync<WhisperUnavailableException>(
            () => client.TranscribeAsync(Audio(), "a.m4a", "de", CancellationToken.None));
    }

    [Fact]
    public async Task Throws_unavailable_on_a_timeout_but_not_when_the_caller_cancels()
    {
        var (client, _) = Create(_ => throw new TaskCanceledException("timeout"));
        await Assert.ThrowsAsync<WhisperUnavailableException>(
            () => client.TranscribeAsync(Audio(), "a.m4a", "de", CancellationToken.None));

        using var cts = new CancellationTokenSource();
        cts.Cancel();
        var (cancelled, _) = Create(_ => throw new TaskCanceledException("cancelled"));
        await Assert.ThrowsAnyAsync<OperationCanceledException>(
            () => cancelled.TranscribeAsync(Audio(), "a.m4a", "de", cts.Token));
    }
}
