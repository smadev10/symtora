using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using Symtora.Api.Options;

namespace Symtora.Api.Services.Analysis;

/// <summary>Talks to a self-hosted Ollama instance over its local HTTP API — never leaves the
/// Docker network, so symptom text stays on infrastructure we control.</summary>
public class OllamaClient(HttpClient httpClient, IOptions<OllamaOptions> options) : IOllamaClient
{
    private readonly OllamaOptions _options = options.Value;

    public async Task<string> GenerateAsync(string prompt, CancellationToken ct)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/generate",
            new GenerateRequest(_options.Model, prompt, Stream: false),
            ct);

        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<GenerateResponse>(cancellationToken: ct);
        return body?.Response ?? "";
    }

    private sealed record GenerateRequest(
        [property: JsonPropertyName("model")] string Model,
        [property: JsonPropertyName("prompt")] string Prompt,
        [property: JsonPropertyName("stream")] bool Stream);

    private sealed record GenerateResponse([property: JsonPropertyName("response")] string? Response);
}
