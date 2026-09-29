using System.Text.Json.Nodes;

namespace Symtora.Api.Services.Analysis;

public interface IOllamaClient
{
    /// <param name="prompt">The full prompt.</param>
    /// <param name="format">JSON schema the output must follow (Ollama structured output).</param>
    /// <param name="ct">Cancellation.</param>
    Task<string> GenerateAsync(string prompt, JsonNode format, CancellationToken ct);

    /// <summary>Loads the model into memory without generating anything.</summary>
    Task WarmUpAsync(CancellationToken ct);
}
