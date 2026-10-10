namespace Symtora.Api.Services.Transcription;

public interface IWhisperClient
{
    /// <summary>Turns recorded speech into text. Empty when nothing was said.</summary>
    /// <param name="audio">The recording, any format ffmpeg reads (m4a, webm, 3gp …).</param>
    /// <param name="fileName">Original file name; Whisper uses the extension as a hint.</param>
    /// <param name="language">"de", "en" or "fr"; null lets Whisper detect it.</param>
    /// <param name="ct">Cancellation from the incoming request.</param>
    /// <exception cref="WhisperUnavailableException">Whisper is down, too slow, or failed.</exception>
    Task<string> TranscribeAsync(Stream audio, string fileName, string? language, CancellationToken ct);
}

/// <summary>The transcription service could not produce a result; the caller should answer 503.</summary>
public class WhisperUnavailableException(string message, Exception? inner = null) : Exception(message, inner);
