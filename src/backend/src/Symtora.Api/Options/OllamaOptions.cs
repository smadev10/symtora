namespace Symtora.Api.Options;

public class OllamaOptions
{
    public const string SectionName = "Ollama";

    public string BaseUrl { get; set; } = "http://model:11434";

    /// <summary>A 3B model keeps CPU-only inference around a minute; 8B took over two.</summary>
    public string Model { get; set; } = "llama3.2:3b";

    /// <summary>
    /// Per-request limit. Generous on purpose: the first call after a restart also pays the
    /// model load, and a CPU-only box is slow. A timeout marks the entry Failed.
    /// </summary>
    public int TimeoutSeconds { get; set; } = 300;

    /// <summary>How long Ollama keeps the model in memory after a request (Ollama duration syntax).</summary>
    public string KeepAlive { get; set; } = "30m";
}
