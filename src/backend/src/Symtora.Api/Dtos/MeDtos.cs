namespace Symtora.Api.Dtos;

public record ProfileExport(string Email, string Name, DateTimeOffset CreatedAt);

/// <summary>Everything Symtora stores about one user, in a machine-readable form.</summary>
public record MyDataExport(DateTimeOffset ExportedAt, ProfileExport Profile, List<EntryResponse> Entries);
