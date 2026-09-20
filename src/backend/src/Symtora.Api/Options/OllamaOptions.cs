namespace Symtora.Api.Options;

public class OllamaOptions
{
    public const string SectionName = "Ollama";

    public string BaseUrl { get; set; } = "http://model:11434";
    public string Model { get; set; } = "llama3.1:8b";
}
