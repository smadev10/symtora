using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace Symtora.Api.Services.Transcription;

/// <summary>Talks to the self-hosted whisper-asr-webservice container over the Docker network —
/// audio never reaches a third party. Nothing here logs or stores the audio or the text.</summary>
public class WhisperClient(HttpClient httpClient) : IWhisperClient
{
    public async Task<string> TranscribeAsync(Stream audio, string fileName, string? language, CancellationToken ct)
    {
        // vad_filter drops silent stretches, which also stops Whisper inventing words in them.
        var url = "/asr?task=transcribe&output=json&vad_filter=true"
                  + (language is null ? "" : $"&language={Uri.EscapeDataString(language)}");

        using var file = new StreamContent(audio);
        file.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
        using var form = new MultipartFormDataContent { { file, "audio_file", fileName } };

        try
        {
            using var response = await httpClient.PostAsync(url, form, ct);
            if (!response.IsSuccessStatusCode)
                throw new WhisperUnavailableException($"Whisper answered {(int)response.StatusCode}.");

            var body = await response.Content.ReadFromJsonAsync<AsrResponse>(cancellationToken: ct);
            return body?.Text?.Trim() ?? "";
        }
        catch (HttpRequestException ex)
        {
            throw new WhisperUnavailableException("Whisper could not be reached.", ex);
        }
        catch (TaskCanceledException ex) when (!ct.IsCancellationRequested)
        {
            // HttpClient reports its own timeout as a cancellation; the caller didn't cancel.
            throw new WhisperUnavailableException("Whisper did not answer in time.", ex);
        }
    }

    private sealed record AsrResponse([property: JsonPropertyName("text")] string? Text);
}
