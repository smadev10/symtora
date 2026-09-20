namespace Symtora.Api.Services.Analysis;

public interface IOllamaClient
{
    Task<string> GenerateAsync(string prompt, CancellationToken ct);
}
