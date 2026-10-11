using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Symtora.Api.Dtos;
using Symtora.Api.Options;
using Symtora.Api.Services.Transcription;

namespace Symtora.Api.Controllers;

/// <summary>Speech to text for voice input, on the self-hosted Whisper service.</summary>
[ApiController]
[Authorize]
[Route("transcriptions")]
public class TranscriptionsController(IWhisperClient whisper, IOptions<WhisperOptions> options) : ControllerBase
{
    private static readonly HashSet<string> Languages = ["de", "en", "fr"];

    /// <summary>Transcribes a short recording and returns the text.</summary>
    /// <remarks>
    /// The audio is held in memory for the duration of the request only — it is never written to
    /// the database or disk, and neither it nor the text is logged. The app shows the text for the
    /// user to review; nothing is analysed until they submit it via `POST /entries`.
    /// </remarks>
    /// <param name="audio">The recording (m4a from iOS/Android, webm from a browser).</param>
    /// <param name="language">`de`, `en` or `fr`; omit to let Whisper detect it.</param>
    /// <param name="ct">Cancellation.</param>
    /// <response code="200">The transcript; empty text when no speech was recognised.</response>
    /// <response code="400">Empty file or unsupported language.</response>
    /// <response code="413">The file is larger than the configured limit.</response>
    /// <response code="503">The transcription service is not reachable right now.</response>
    [HttpPost]
    // Keeps the whole upload in memory: ASP.NET otherwise buffers anything over 64 KB to a temp file.
    [RequestFormLimits(MultipartBodyLengthLimit = 11 * 1024 * 1024, MemoryBufferThreshold = 11 * 1024 * 1024)]
    [RequestSizeLimit(11 * 1024 * 1024)]
    public async Task<ActionResult<TranscriptionResponse>> Create(IFormFile audio, [FromForm] string? language, CancellationToken ct)
    {
        if (audio is null || audio.Length == 0)
            return BadRequest(new ProblemDetails { Title = "The recording is empty." });
        if (audio.Length > options.Value.MaxUploadBytes)
            return StatusCode(StatusCodes.Status413PayloadTooLarge, new ProblemDetails { Title = "The recording is too long." });
        if (language is not null && !Languages.Contains(language))
            return BadRequest(new ProblemDetails { Title = "Language must be de, en or fr." });

        try
        {
            await using var stream = audio.OpenReadStream();
            var text = await whisper.TranscribeAsync(stream, audio.FileName, language, ct);
            return Ok(new TranscriptionResponse(text));
        }
        catch (WhisperUnavailableException)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ProblemDetails { Title = "Transcription unavailable." });
        }
    }
}
