using System.Net.Http.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using Symtora.Api.Options;

namespace Symtora.Api.Services.Analysis;

/// <summary>Talks to a self-hosted Ollama instance over its local HTTP API — never leaves the
/// Docker network, so symptom text stays on infrastructure we control.</summary>
public class OllamaClient(HttpClient httpClient, IOptions<OllamaOptions> options) : IOllamaClient
{
    /// <summary>Low but not zero: triage should be stable between runs, not creative.</summary>
    private const double Temperature = 0.2;

    private readonly OllamaOptions _options = options.Value;

    public async Task<string> GenerateAsync(string prompt, JsonNode format, CancellationToken ct)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/generate",
            new GenerateRequest(
                _options.Model,
                prompt,
                Stream: false,
                format,
                _options.KeepAlive,
                new GenerateOptions(Temperature)),
            ct);

        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<GenerateResponse>(cancellationToken: ct);
        return body?.Response ?? "";
    }

    public async Task WarmUpAsync(CancellationToken ct)
    {
        // A generate request without a prompt makes Ollama load the model and return at once.
        var response = await httpClient.PostAsJsonAsync(
            "/api/generate",
            new WarmUpRequest(_options.Model, _options.KeepAlive),
            ct);

        response.EnsureSuccessStatusCode();
    }

    private sealed record GenerateRequest(
        [property: JsonPropertyName("model")] string Model,
        [property: JsonPropertyName("prompt")] string Prompt,
        [property: JsonPropertyName("stream")] bool Stream,
        [property: JsonPropertyName("format")] JsonNode Format,
        [property: JsonPropertyName("keep_alive")] string KeepAlive,
        [property: JsonPropertyName("options")] GenerateOptions Options);

    private sealed record GenerateOptions(
        [property: JsonPropertyName("temperature")] double Temperature);

    private sealed record WarmUpRequest(
        [property: JsonPropertyName("model")] string Model,
        [property: JsonPropertyName("keep_alive")] string KeepAlive);

    private sealed record GenerateResponse([property: JsonPropertyName("response")] string? Response);
}
