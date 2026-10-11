namespace Symtora.Api.Options;

public class WhisperOptions
{
    public const string SectionName = "Whisper";

    public string BaseUrl { get; set; } = "http://whisper:9000";

    /// <summary>
    /// Per-request limit. The first request after a restart also downloads/loads the model, and a
    /// CPU-only box needs several seconds per minute of audio.
    /// </summary>
    public int TimeoutSeconds { get; set; } = 300;

    /// <summary>Largest accepted upload. Two minutes of AAC at 128 kbit/s is about 2 MB.</summary>
    public long MaxUploadBytes { get; set; } = 10 * 1024 * 1024;
}
