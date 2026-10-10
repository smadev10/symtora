using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Symtora.Api.Controllers;
using Symtora.Api.Dtos;
using Symtora.Api.Options;
using Symtora.Api.Services.Transcription;

namespace Symtora.Api.Tests.Controllers;

public class TranscriptionsControllerTests
{
    private sealed class FakeWhisper(Func<Task<string>> answer) : IWhisperClient
    {
        public int Calls { get; private set; }
        public string? Language { get; private set; }

        public Task<string> TranscribeAsync(Stream audio, string fileName, string? language, CancellationToken ct)
        {
            Calls++;
            Language = language;
            return answer();
        }
    }

    private static IFormFile File(int bytes) =>
        new FormFile(new MemoryStream(new byte[bytes]), 0, bytes, "audio", "recording.m4a");

    private static TranscriptionsController Controller(FakeWhisper whisper, long maxBytes = 1000) =>
        new(whisper, Microsoft.Extensions.Options.Options.Create(new WhisperOptions { MaxUploadBytes = maxBytes }));

    [Fact]
    public async Task Returns_the_transcript()
    {
        var whisper = new FakeWhisper(() => Task.FromResult("Halsweh seit heute."));

        var result = await Controller(whisper).Create(File(10), "de", CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(new TranscriptionResponse("Halsweh seit heute."), ok.Value);
        Assert.Equal("de", whisper.Language);
    }

    [Fact]
    public async Task Passes_no_language_through_when_none_is_given()
    {
        var whisper = new FakeWhisper(() => Task.FromResult("x"));

        await Controller(whisper).Create(File(10), null, CancellationToken.None);

        Assert.Null(whisper.Language);
    }

    [Fact]
    public async Task Rejects_an_empty_file_without_calling_whisper()
    {
        var whisper = new FakeWhisper(() => Task.FromResult("x"));

        var result = await Controller(whisper).Create(File(0), "de", CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal(0, whisper.Calls);
    }

    [Fact]
    public async Task Rejects_an_unknown_language_without_calling_whisper()
    {
        var whisper = new FakeWhisper(() => Task.FromResult("x"));

        var result = await Controller(whisper).Create(File(10), "it", CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal(0, whisper.Calls);
    }

    [Fact]
    public async Task Rejects_a_file_over_the_limit_with_413_without_calling_whisper()
    {
        var whisper = new FakeWhisper(() => Task.FromResult("x"));

        var result = await Controller(whisper, maxBytes: 100).Create(File(101), "de", CancellationToken.None);

        var status = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status413PayloadTooLarge, status.StatusCode);
        Assert.Equal(0, whisper.Calls);
    }

    [Fact]
    public async Task Answers_503_when_whisper_is_unavailable()
    {
        var whisper = new FakeWhisper(() => throw new WhisperUnavailableException("down"));

        var result = await Controller(whisper).Create(File(10), "de", CancellationToken.None);

        var status = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, status.StatusCode);
    }
}
