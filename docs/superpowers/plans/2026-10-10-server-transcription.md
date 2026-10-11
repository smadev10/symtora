# Server Transcription (Whisper) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make voice input work in Expo Go (and on web) by recording audio in the app and transcribing it with a self-hosted Whisper service behind the Symtora API, while development builds keep using on-device recognition.

**Architecture:** The app records with `expo-audio` (part of Expo Go), uploads the file to a new authenticated `POST /transcriptions` endpoint, which forwards it in memory to a Whisper container (`onerahmet/openai-whisper-asr-webservice`, faster-whisper engine) on the Docker network and returns only the text. On the client, a facade hook `useDictation` picks the engine once per mount: on-device (`expo-speech-recognition`, existing) when its native module exists, otherwise server. Both engines share the existing dictation reducer, so the record screen, hand-off and error UI stay one code path.

**Tech Stack:** ASP.NET Core (.NET 10), xUnit, Docker Compose; Expo SDK 57, `expo-audio`, React Native 0.86, jest-expo + @testing-library/react-native 14.

**Spec:** No separate spec document. The design was agreed in conversation on 2026-10-10 ("Whisper auf dem eigenen Server als Standard, Erkennung auf dem Gerät im Development Build"). This plan is the reference.

## Global Constraints

- Read the Expo v57 docs before writing client code (`AGENTS.md`): https://docs.expo.dev/versions/v57.0.0/sdk/audio/
- Audio never goes to a third party. Whisper runs as a container you operate; the API keeps the upload in memory only (no DB row, no file on disk, no logging of audio or transcript text).
- Max recording length: **120 s**. Max upload size: **10 MB** (`10 * 1024 * 1024` bytes).
- Upload request: `multipart/form-data`, file field **`audio`**, optional form field **`language`** ∈ `de` | `en` | `fr`.
- Whisper call: `POST {Whisper:BaseUrl}/asr?task=transcribe&output=json&vad_filter=true[&language=xx]`, multipart field **`audio_file`**, JSON response field **`text`**.
- Whisper container: image `onerahmet/openai-whisper-asr-webservice:latest`, port `9000`, env `ASR_ENGINE=faster_whisper`, `ASR_MODEL=${WHISPER_MODEL:-small}`, `ASR_MODEL_PATH=/data/whisper`, volume `whisper_models:/data/whisper`.
- All user-facing strings in DE/EN/FR; `src/frontend/src/i18n/de.ts` defines the type; Swiss spelling (no "ß").
- RNTL 14: `fireEvent`, `act`, `render`, `renderHook`, `rerender` are async — always `await` them.
- Do not change the on-device engine's behaviour; development builds must behave exactly as today.

## Review Focus

1. **Recording left running** → it must stop itself at 120 s and transcribe, not grow past the upload limit. Test in Task 4.
2. **Silence / Whisper returns empty or whitespace text** → "Nichts verstanden" (noSpeech), never an empty string handed to the text box. Test in Task 4.
3. **Server unreachable (school Wi-Fi, API down, Whisper down)** → a "server unavailable" message with retry, not a generic crash or endless spinner. Tests in Task 2 (API answers 503) and Task 4 (client maps it).
4. **User cancels while the upload/transcription is in flight** → the late result is ignored and nothing lands in the text box. Test in Task 4.
5. **Oversized or empty upload** → API answers 413/400 without calling Whisper. Test in Task 2.

---

## File Structure

**Backend (`src/backend/`)**
- Create `src/Symtora.Api/Options/WhisperOptions.cs`: base URL, timeout, max upload bytes.
- Create `src/Symtora.Api/Services/Transcription/IWhisperClient.cs` and `WhisperClient.cs`: the HTTP call to the Whisper container, plus `WhisperUnavailableException`.
- Create `src/Symtora.Api/Controllers/TranscriptionsController.cs`: `POST /transcriptions`.
- Create `src/Symtora.Api/Dtos/TranscriptionDtos.cs`: `TranscriptionResponse(string Text)`.
- Modify `src/Symtora.Api/Program.cs`, `appsettings.json`, `appsettings.Development.json`.
- Create `tests/Symtora.Api.Tests/Services/Transcription/WhisperClientTests.cs` and `tests/Symtora.Api.Tests/Controllers/TranscriptionsControllerTests.cs`.
- Modify `README.md` (backend).

**Root**
- Modify `docker-compose.yml`, `.env.example`, `README.md`.

**Frontend (`src/frontend/`)**
- Modify `src/api/client.ts` (+ `client.test.ts`): `form` and per-request `timeoutMs`.
- Create `src/api/transcriptions.ts` (+ `transcriptions.test.ts`).
- Rename `src/state/dictation/useDictation.ts` → `useOnDeviceDictation.ts` (export renamed, `enabled` flag added).
- Create `src/state/dictation/useServerDictation.ts` (+ `useServerDictation.test.tsx`).
- Create `src/state/dictation/useDictation.ts`: the facade that picks the engine.
- Modify `src/state/dictation/reducer.ts`: new error kind `serverUnavailable`.
- Modify `src/app/record.tsx`, `src/app/(tabs)/new.tsx`, `src/i18n/{de,en,fr}.ts`, `jest.setup.js`, `src/__tests__/dictation.test.tsx`, `src/state/dictation/reducer.test.ts`.

---

### Task 1: Whisper client (backend)

**Files:**
- Create: `src/backend/src/Symtora.Api/Options/WhisperOptions.cs`
- Create: `src/backend/src/Symtora.Api/Services/Transcription/IWhisperClient.cs`
- Create: `src/backend/src/Symtora.Api/Services/Transcription/WhisperClient.cs`
- Test: `src/backend/tests/Symtora.Api.Tests/Services/Transcription/WhisperClientTests.cs`

**Interfaces:**
- Produces: `IWhisperClient.TranscribeAsync(Stream audio, string fileName, string? language, CancellationToken ct) : Task<string>`; throws `WhisperUnavailableException` when Whisper can't be reached, times out, or answers non-2xx. `WhisperOptions { BaseUrl, TimeoutSeconds, MaxUploadBytes }`, `SectionName = "Whisper"`.

- [ ] **Step 1: Write the failing tests**

```csharp
// src/backend/tests/Symtora.Api.Tests/Services/Transcription/WhisperClientTests.cs
using System.Net;
using System.Text;
using Symtora.Api.Services.Transcription;

namespace Symtora.Api.Tests.Services.Transcription;

public class WhisperClientTests
{
    /// <summary>Records the request and answers with a canned response.</summary>
    private sealed class StubHandler(Func<HttpRequestMessage, Task<HttpResponseMessage>> respond) : HttpMessageHandler
    {
        public HttpRequestMessage? Request { get; private set; }
        public string? Body { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Request = request;
            Body = request.Content is null ? null : await request.Content.ReadAsStringAsync(ct);
            return await respond(request);
        }
    }

    private static (WhisperClient Client, StubHandler Handler) Create(Func<HttpRequestMessage, Task<HttpResponseMessage>> respond)
    {
        var handler = new StubHandler(respond);
        var http = new HttpClient(handler) { BaseAddress = new Uri("http://whisper:9000") };
        return (new WhisperClient(http), handler);
    }

    private static Task<HttpResponseMessage> Json(string json, HttpStatusCode status = HttpStatusCode.OK) =>
        Task.FromResult(new HttpResponseMessage(status) { Content = new StringContent(json, Encoding.UTF8, "application/json") });

    private static MemoryStream Audio() => new([1, 2, 3, 4]);

    [Fact]
    public async Task Returns_the_trimmed_text_from_the_json_response()
    {
        var (client, _) = Create(_ => Json("""{ "text": "  Seit gestern Kopfweh. ", "language": "de", "segments": [] }"""));

        var text = await client.TranscribeAsync(Audio(), "recording.m4a", "de", CancellationToken.None);

        Assert.Equal("Seit gestern Kopfweh.", text);
    }

    [Fact]
    public async Task Posts_to_asr_with_transcribe_json_vad_and_the_language()
    {
        var (client, handler) = Create(_ => Json("""{ "text": "x" }"""));

        await client.TranscribeAsync(Audio(), "recording.m4a", "fr", CancellationToken.None);

        Assert.Equal(HttpMethod.Post, handler.Request!.Method);
        Assert.Equal("/asr", handler.Request.RequestUri!.AbsolutePath);
        var query = handler.Request.RequestUri.Query;
        Assert.Contains("task=transcribe", query);
        Assert.Contains("output=json", query);
        Assert.Contains("vad_filter=true", query);
        Assert.Contains("language=fr", query);
        Assert.Contains("audio_file", handler.Body);
    }

    [Fact]
    public async Task Leaves_the_language_out_so_whisper_detects_it_when_none_is_given()
    {
        var (client, handler) = Create(_ => Json("""{ "text": "x" }"""));

        await client.TranscribeAsync(Audio(), "recording.m4a", null, CancellationToken.None);

        Assert.DoesNotContain("language=", handler.Request!.RequestUri!.Query);
    }

    [Fact]
    public async Task Returns_empty_text_for_silence_rather_than_failing()
    {
        var (client, _) = Create(_ => Json("""{ "text": "" }"""));

        Assert.Equal("", await client.TranscribeAsync(Audio(), "a.m4a", "de", CancellationToken.None));
    }

    [Fact]
    public async Task Throws_unavailable_when_whisper_answers_an_error()
    {
        var (client, _) = Create(_ => Json("{}", HttpStatusCode.InternalServerError));

        await Assert.ThrowsAsync<WhisperUnavailableException>(
            () => client.TranscribeAsync(Audio(), "a.m4a", "de", CancellationToken.None));
    }

    [Fact]
    public async Task Throws_unavailable_when_whisper_cannot_be_reached()
    {
        var (client, _) = Create(_ => throw new HttpRequestException("connection refused"));

        await Assert.ThrowsAsync<WhisperUnavailableException>(
            () => client.TranscribeAsync(Audio(), "a.m4a", "de", CancellationToken.None));
    }

    [Fact]
    public async Task Throws_unavailable_on_a_timeout_but_not_when_the_caller_cancels()
    {
        var (client, _) = Create(_ => throw new TaskCanceledException("timeout"));
        await Assert.ThrowsAsync<WhisperUnavailableException>(
            () => client.TranscribeAsync(Audio(), "a.m4a", "de", CancellationToken.None));

        using var cts = new CancellationTokenSource();
        cts.Cancel();
        var (cancelled, _) = Create(_ => throw new TaskCanceledException("cancelled"));
        await Assert.ThrowsAnyAsync<OperationCanceledException>(
            () => cancelled.TranscribeAsync(Audio(), "a.m4a", "de", cts.Token));
    }
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (from `src/backend/`): `dotnet test --filter FullyQualifiedName~WhisperClientTests`
Expected: build FAIL with "The type or namespace name 'Transcription' does not exist".

- [ ] **Step 3: Write the implementation**

```csharp
// src/backend/src/Symtora.Api/Options/WhisperOptions.cs
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
```

```csharp
// src/backend/src/Symtora.Api/Services/Transcription/IWhisperClient.cs
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
```

```csharp
// src/backend/src/Symtora.Api/Services/Transcription/WhisperClient.cs
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `dotnet test --filter FullyQualifiedName~WhisperClientTests`
Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add src/backend/src/Symtora.Api/Options/WhisperOptions.cs src/backend/src/Symtora.Api/Services/Transcription src/backend/tests/Symtora.Api.Tests/Services/Transcription
git commit -m "feat(api): add client for the self-hosted Whisper service"
```

---

### Task 2: `POST /transcriptions` endpoint, wiring and Whisper container

**Files:**
- Create: `src/backend/src/Symtora.Api/Dtos/TranscriptionDtos.cs`
- Create: `src/backend/src/Symtora.Api/Controllers/TranscriptionsController.cs`
- Test: `src/backend/tests/Symtora.Api.Tests/Controllers/TranscriptionsControllerTests.cs`
- Modify: `src/backend/src/Symtora.Api/Program.cs` (after the `AddHttpClient<IOllamaClient, OllamaClient>` block)
- Modify: `src/backend/src/Symtora.Api/appsettings.json`, `appsettings.Development.json`
- Modify: `docker-compose.yml`, `.env.example`, `src/backend/README.md`

**Interfaces:**
- Consumes: `IWhisperClient`, `WhisperUnavailableException`, `WhisperOptions` (Task 1).
- Produces: `POST /transcriptions` (Bearer). Request: multipart, file `audio`, optional `language`. Responses: `200 { "text": string }`; `400` empty file or bad language; `413` file over `MaxUploadBytes`; `503` ProblemDetails `{ title: "Transcription unavailable." }`.

- [ ] **Step 1: Write the failing tests**

```csharp
// src/backend/tests/Symtora.Api.Tests/Controllers/TranscriptionsControllerTests.cs
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Symtora.Api.Controllers;
using Symtora.Api.Dtos;
using Symtora.Api.Options;
using Symtora.Api.Services.Transcription;

namespace Symtora.Api.Tests.Controllers;

public class TranscriptionsControllerTests
{
    private sealed class FakeWhisper(Func<Task<string>> answer) : IWhisperClient
    {
        public int Calls { get; private set; }
        public string? Language { get; private set; }

        public Task<string> TranscribeAsync(Stream audio, string fileName, string? language, CancellationToken ct)
        {
            Calls++;
            Language = language;
            return answer();
        }
    }

    private static IFormFile File(int bytes) =>
        new FormFile(new MemoryStream(new byte[bytes]), 0, bytes, "audio", "recording.m4a");

    private static TranscriptionsController Controller(FakeWhisper whisper, long maxBytes = 1000) =>
        new(whisper, Microsoft.Extensions.Options.Options.Create(new WhisperOptions { MaxUploadBytes = maxBytes }));

    [Fact]
    public async Task Returns_the_transcript()
    {
        var whisper = new FakeWhisper(() => Task.FromResult("Halsweh seit heute."));

        var result = await Controller(whisper).Create(File(10), "de", CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(new TranscriptionResponse("Halsweh seit heute."), ok.Value);
        Assert.Equal("de", whisper.Language);
    }

    [Fact]
    public async Task Passes_no_language_through_when_none_is_given()
    {
        var whisper = new FakeWhisper(() => Task.FromResult("x"));

        await Controller(whisper).Create(File(10), null, CancellationToken.None);

        Assert.Null(whisper.Language);
    }

    [Fact]
    public async Task Rejects_an_empty_file_without_calling_whisper()
    {
        var whisper = new FakeWhisper(() => Task.FromResult("x"));

        var result = await Controller(whisper).Create(File(0), "de", CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal(0, whisper.Calls);
    }

    [Fact]
    public async Task Rejects_an_unknown_language_without_calling_whisper()
    {
        var whisper = new FakeWhisper(() => Task.FromResult("x"));

        var result = await Controller(whisper).Create(File(10), "it", CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal(0, whisper.Calls);
    }

    [Fact]
    public async Task Rejects_a_file_over_the_limit_with_413_without_calling_whisper()
    {
        var whisper = new FakeWhisper(() => Task.FromResult("x"));

        var result = await Controller(whisper, maxBytes: 100).Create(File(101), "de", CancellationToken.None);

        var status = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status413PayloadTooLarge, status.StatusCode);
        Assert.Equal(0, whisper.Calls);
    }

    [Fact]
    public async Task Answers_503_when_whisper_is_unavailable()
    {
        var whisper = new FakeWhisper(() => throw new WhisperUnavailableException("down"));

        var result = await Controller(whisper).Create(File(10), "de", CancellationToken.None);

        var status = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, status.StatusCode);
    }
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `dotnet test --filter FullyQualifiedName~TranscriptionsControllerTests`
Expected: build FAIL, "TranscriptionsController could not be found".

- [ ] **Step 3: Write the DTO and controller**

```csharp
// src/backend/src/Symtora.Api/Dtos/TranscriptionDtos.cs
namespace Symtora.Api.Dtos;

public record TranscriptionResponse(string Text);
```

```csharp
// src/backend/src/Symtora.Api/Controllers/TranscriptionsController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Symtora.Api.Dtos;
using Symtora.Api.Options;
using Symtora.Api.Services.Transcription;

namespace Symtora.Api.Controllers;

/// <summary>Speech to text for voice input, on the self-hosted Whisper service.</summary>
[ApiController]
[Authorize]
[Route("transcriptions")]
public class TranscriptionsController(IWhisperClient whisper, IOptions<WhisperOptions> options) : ControllerBase
{
    private static readonly HashSet<string> Languages = ["de", "en", "fr"];

    /// <summary>Transcribes a short recording and returns the text.</summary>
    /// <remarks>
    /// The audio is held in memory for the duration of the request only — it is never written to
    /// the database or disk, and neither it nor the text is logged. The app shows the text for the
    /// user to review; nothing is analysed until they submit it via `POST /entries`.
    /// </remarks>
    /// <param name="audio">The recording (m4a from iOS/Android, webm from a browser).</param>
    /// <param name="language">`de`, `en` or `fr`; omit to let Whisper detect it.</param>
    /// <param name="ct">Cancellation.</param>
    /// <response code="200">The transcript; empty text when no speech was recognised.</response>
    /// <response code="400">Empty file or unsupported language.</response>
    /// <response code="413">The file is larger than the configured limit.</response>
    /// <response code="503">The transcription service is not reachable right now.</response>
    [HttpPost]
    // Keeps the whole upload in memory: ASP.NET otherwise buffers anything over 64 KB to a temp file.
    [RequestFormLimits(MultipartBodyLengthLimit = 11 * 1024 * 1024, MemoryBufferThreshold = 11 * 1024 * 1024)]
    [RequestSizeLimit(11 * 1024 * 1024)]
    public async Task<ActionResult<TranscriptionResponse>> Create(IFormFile audio, [FromForm] string? language, CancellationToken ct)
    {
        if (audio is null || audio.Length == 0)
            return BadRequest(new ProblemDetails { Title = "The recording is empty." });
        if (audio.Length > options.Value.MaxUploadBytes)
            return StatusCode(StatusCodes.Status413PayloadTooLarge, new ProblemDetails { Title = "The recording is too long." });
        if (language is not null && !Languages.Contains(language))
            return BadRequest(new ProblemDetails { Title = "Language must be de, en or fr." });

        try
        {
            await using var stream = audio.OpenReadStream();
            var text = await whisper.TranscribeAsync(stream, audio.FileName, language, ct);
            return Ok(new TranscriptionResponse(text));
        }
        catch (WhisperUnavailableException)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ProblemDetails { Title = "Transcription unavailable." });
        }
    }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `dotnet test --filter FullyQualifiedName~TranscriptionsControllerTests`
Expected: 6 passed.

- [ ] **Step 5: Wire it up in `Program.cs`**

Below `builder.Services.Configure<OllamaOptions>(…);` add:

```csharp
builder.Services.Configure<WhisperOptions>(builder.Configuration.GetSection(WhisperOptions.SectionName));
```

Below the `AddHttpClient<IOllamaClient, OllamaClient>(…)` block add:

```csharp
builder.Services.AddHttpClient<IWhisperClient, WhisperClient>((sp, client) =>
{
    var whisper = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<WhisperOptions>>().Value;
    client.BaseAddress = new Uri(whisper.BaseUrl);
    client.Timeout = TimeSpan.FromSeconds(whisper.TimeoutSeconds); // CPU transcription and first-run model load
});
```

and add `using Symtora.Api.Services.Transcription;` to the usings.

In `appsettings.json` add, after the `"Ollama"` section:

```json
  "Whisper": {
    "BaseUrl": "http://whisper:9000"
  }
```

In `appsettings.Development.json` add, after the `"Ollama"` section:

```json
  "Whisper": {
    "BaseUrl": "http://localhost:9000"
  }
```

- [ ] **Step 6: Add the Whisper container**

In `docker-compose.yml`, add this service after `model-init`:

```yaml
  # Speech to text for voice input. The model is downloaded into `whisper_models` on the first
  # transcription (≈500 MB for `small`), so that first request is slow. Published on loopback only,
  # for `dotnet run` during development — the API reaches it as http://whisper:9000.
  whisper:
    image: onerahmet/openai-whisper-asr-webservice:latest
    environment:
      ASR_ENGINE: faster_whisper
      ASR_MODEL: ${WHISPER_MODEL:-small}
      ASR_MODEL_PATH: /data/whisper
    volumes:
      - whisper_models:/data/whisper
    ports:
      - "127.0.0.1:9000:9000"
```

In the `api` service: add `whisper: { condition: service_started }` under `depends_on` (YAML block form like the others) and `Whisper__BaseUrl: http://whisper:9000` under `environment`. Under the top-level `volumes:` add `whisper_models:`.

In `.env.example` append:

```bash

# Whisper model for voice input: tiny, base, small, medium (multilingual). `small` handles
# German, French and English well enough on CPU; larger is more accurate but much slower.
WHISPER_MODEL=small
```

- [ ] **Step 7: Document the endpoint**

In `src/backend/README.md`, add to the API table after the `DELETE /me/data` row:

```markdown
| `POST /transcriptions` | Bearer | multipart `audio` (+ `language`) → `{ text }`; audio is not stored. `413` over 10 MB, `503` if Whisper is down |
```

and in the layout table add a row: ``| `src/Symtora.Api/Services/Transcription/` | Whisper client for voice input |``.

- [ ] **Step 8: Run the whole backend suite and smoke-test the container**

Run: `dotnet test` (from `src/backend/`). Expected: all pass.
Run: `docker compose up -d whisper`, then `curl -s -F "audio_file=@<any short m4a/wav>" "http://localhost:9000/asr?output=json&language=de"`. Expected: JSON containing `"text"` (first call is slow while the model downloads).

- [ ] **Step 9: Commit**

```bash
git add src/backend docker-compose.yml .env.example
git commit -m "feat(api): add POST /transcriptions backed by a Whisper container"
```

---

### Task 3: Client upload support and transcriptions API (frontend)

**Files:**
- Modify: `src/frontend/src/api/client.ts` (`RequestOptions`, `request()`)
- Test: `src/frontend/src/api/client.test.ts`
- Create: `src/frontend/src/api/transcriptions.ts`
- Test: `src/frontend/src/api/transcriptions.test.ts`

**Interfaces:**
- Consumes: `POST /transcriptions` (Task 2).
- Produces: `RequestOptions.form?: FormData`, `RequestOptions.timeoutMs?: number`; `transcriptionsApi.transcribe(audioUri: string, lang: Lang): Promise<string>` (resolves to the trimmed text; rejects with `ApiError`). `TRANSCRIBE_TIMEOUT_MS = 120_000`.

- [ ] **Step 1: Write the failing client tests** (append to `client.test.ts`, reusing its `clientWith` and `json` helpers)

```ts
describe('form uploads', () => {
  it('sends FormData as-is and leaves the multipart content type to fetch', async () => {
    const { client, calls } = clientWith(() => json({ text: 'ok' }));
    const form = new FormData();
    form.append('language', 'de');

    await client.request('/transcriptions', { method: 'POST', form });

    expect(calls[0].init.body).toBe(form);
    expect(new Headers(calls[0].init.headers).get('Content-Type')).toBeNull();
  });

  it('lets one request wait longer than the client default', async () => {
    const { client } = clientWith(
      () => new Promise((resolve) => setTimeout(() => resolve(json({ ok: true })), 80)),
    );

    // The client default in these tests is 50 ms.
    await expect(client.request('/slow', { timeoutMs: 500 })).resolves.toEqual({ ok: true });
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run (from `src/frontend/`): `npx jest src/api/client.test.ts -t "form uploads"`
Expected: FAIL. The first test sees `body` stringified or `Content-Type: application/json`; the second rejects with a timeout `ApiError`.

- [ ] **Step 3: Implement in `client.ts`**

Extend `RequestOptions`:

```ts
export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Multipart upload; sent as-is so fetch sets the boundary. Mutually exclusive with `body`. */
  form?: FormData;
  /** Attach the bearer token, when one is available. */
  auth?: boolean;
  signal?: AbortSignal;
  /** Overrides the client-wide timeout, e.g. for an upload the server needs a while to process. */
  timeoutMs?: number;
};
```

In `request()`, replace the destructuring, the Content-Type line, the timer line and the `body:` line:

```ts
    const { method = 'GET', body, form, auth = false, signal, timeoutMs: requestTimeoutMs } = options;

    const headers = new Headers({ Accept: 'application/json' });
    if (body !== undefined && form === undefined) headers.set('Content-Type', 'application/json');
```

```ts
    const timer = setTimeout(() => controller.abort(), requestTimeoutMs ?? timeoutMs);
```

```ts
        body: form ?? (body === undefined ? undefined : JSON.stringify(body)),
```

- [ ] **Step 4: Run the client tests**

Run: `npx jest src/api/client.test.ts`
Expected: all pass.

- [ ] **Step 5: Write the failing transcriptions API test**

```ts
// src/frontend/src/api/transcriptions.test.ts
import type { ApiClient, RequestOptions } from '@/api/client';
import { createTranscriptionsApi, TRANSCRIBE_TIMEOUT_MS } from '@/api/transcriptions';

function fakeClient(reply: unknown) {
  const calls: { path: string; options?: RequestOptions }[] = [];
  const client: ApiClient = {
    request: async <T,>(path: string, options?: RequestOptions) => {
      calls.push({ path, options });
      return reply as T;
    },
  };
  return { client, calls };
}

describe('transcriptionsApi', () => {
  it('uploads the recording with the language, authenticated, with a long timeout', async () => {
    const { client, calls } = fakeClient({ text: '  Kopfweh  ' });

    const text = await createTranscriptionsApi(client).transcribe('file:///cache/rec.m4a', 'de');

    expect(text).toBe('Kopfweh');
    expect(calls[0].path).toBe('/transcriptions');
    expect(calls[0].options).toMatchObject({ method: 'POST', auth: true, timeoutMs: TRANSCRIBE_TIMEOUT_MS });
    const form = calls[0].options?.form as FormData;
    expect(form.get('language')).toBe('de');
    expect(form.get('audio')).toBeTruthy();
  });

  it('treats a missing text field as nothing said', async () => {
    const { client } = fakeClient({});

    await expect(createTranscriptionsApi(client).transcribe('file:///rec.m4a', 'en')).resolves.toBe('');
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx jest src/api/transcriptions.test.ts`
Expected: FAIL, "Cannot find module '@/api/transcriptions'".

- [ ] **Step 7: Implement `transcriptions.ts`**

```ts
// src/frontend/src/api/transcriptions.ts
import { Platform } from 'react-native';

import type { Lang } from '@/i18n/translations';
import { api, type ApiClient } from './client';

/** CPU transcription of up to two minutes of audio, plus the upload, on a slow network. */
export const TRANSCRIBE_TIMEOUT_MS = 120_000;

export type TranscriptionsApi = {
  /** Uploads a recording and resolves to its transcript; empty when nothing was understood. */
  transcribe: (audioUri: string, lang: Lang) => Promise<string>;
};

/**
 * React Native's FormData takes a `{ uri, name, type }` descriptor for files;
 * a browser needs a real Blob, which the recorder exposes as a blob: URL.
 */
async function appendAudio(form: FormData, uri: string): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    form.append('audio', blob, 'recording.webm');
    return;
  }
  form.append('audio', { uri, name: 'recording.m4a', type: 'audio/mp4' } as unknown as Blob);
}

export function createTranscriptionsApi(client: ApiClient): TranscriptionsApi {
  return {
    async transcribe(audioUri, lang) {
      const form = new FormData();
      await appendAudio(form, audioUri);
      form.append('language', lang);

      const response = await client.request<{ text?: string } | null>('/transcriptions', {
        method: 'POST',
        form,
        auth: true,
        timeoutMs: TRANSCRIBE_TIMEOUT_MS,
      });
      return response?.text?.trim() ?? '';
    },
  };
}

export const transcriptionsApi = createTranscriptionsApi(api);
```

- [ ] **Step 8: Run the tests and the typecheck**

Run: `npx jest src/api && npm run typecheck`
Expected: all pass, no type errors.

- [ ] **Step 9: Commit**

```bash
git add src/frontend/src/api
git commit -m "feat(app): upload support in the API client and a transcriptions API"
```

---

### Task 4: Server dictation engine and engine selection

**Files:**
- Modify: `src/frontend/src/state/dictation/reducer.ts` (add the `serverUnavailable` error kind)
- Rename: `src/frontend/src/state/dictation/useDictation.ts` → `useOnDeviceDictation.ts`
- Create: `src/frontend/src/state/dictation/useServerDictation.ts`
- Create: `src/frontend/src/state/dictation/useDictation.ts` (facade)
- Modify: `src/frontend/jest.setup.js` (mock `expo-audio`)
- Test: `src/frontend/src/state/dictation/useServerDictation.test.tsx`
- Modify: `src/frontend/src/state/dictation/reducer.test.ts` (import path of `toDictationError`)
- Install: `npx expo install expo-audio` (from `src/frontend/`)

**Interfaces:**
- Consumes: `transcriptionsApi.transcribe` (Task 3); `dictationReducer`, `INITIAL_DICTATION`, `DictationError` (existing).
- Produces:
  - `DictationError` gains `'serverUnavailable'`.
  - `useOnDeviceDictation(enabled: boolean)`, `useServerDictation(enabled: boolean, transcribe?: TranscriptionsApi['transcribe'])`. Both return `{ state: DictationState; level: number; start(lang: Lang): Promise<void>; stop(): void; abort(): void }`.
  - `useDictation()` returns the same plus `engine: 'device' | 'server'`.
  - `hasOnDeviceRecognition(): boolean`, `MAX_RECORDING_MS = 120_000`.

- [ ] **Step 1: Install expo-audio and add its jest mock**

Run: `npx expo install expo-audio`. Check that `package.json` gets an SDK-57-compatible `expo-audio`; `expo-audio` needs no config plugin for Expo Go.

Append to `jest.setup.js`:

```js
// expo-audio. The recorder is one shared fake so tests can read `uri`, drive
// `__state` (what useAudioRecorderState returns) and assert on calls.
jest.mock('expo-audio', () => {
  const recorder = {
    uri: null,
    prepareToRecordAsync: jest.fn(),
    record: jest.fn(),
    stop: jest.fn(),
  };
  const audio = {
    __recorder: recorder,
    __state: { isRecording: false, durationMillis: 0, metering: undefined, canRecord: true, url: null, mediaServicesDidReset: false },
    RecordingPresets: { HIGH_QUALITY: { extension: '.m4a' } },
    AudioModule: { requestRecordingPermissionsAsync: jest.fn() },
    setAudioModeAsync: jest.fn(),
    useAudioRecorder: () => recorder,
    useAudioRecorderState: () => audio.__state,
    __reset: () => {
      recorder.uri = 'file:///cache/recording.m4a';
      recorder.prepareToRecordAsync.mockReset().mockResolvedValue(undefined);
      recorder.record.mockReset();
      recorder.stop.mockReset().mockResolvedValue(undefined);
      audio.AudioModule.requestRecordingPermissionsAsync
        .mockReset()
        .mockResolvedValue({ granted: true, canAskAgain: true, status: 'granted', expires: 'never' });
      audio.setAudioModeAsync.mockReset().mockResolvedValue(undefined);
      audio.__state = { isRecording: false, durationMillis: 0, metering: undefined, canRecord: true, url: null, mediaServicesDidReset: false };
    },
  };
  audio.__reset();
  return audio;
});
```

- [ ] **Step 2: Add the error kind**

In `reducer.ts`, add to the `DictationError` union, after `'unsupported'`:

```ts
  /** Server transcription only: the API or Whisper could not be reached. */
  | 'serverUnavailable'
```

- [ ] **Step 3: Rename the on-device hook and give it an `enabled` flag**

```bash
git mv src/frontend/src/state/dictation/useDictation.ts src/frontend/src/state/dictation/useOnDeviceDictation.ts
```

In `useOnDeviceDictation.ts`:
- Rename `export function useDictation()` to `export function useOnDeviceDictation(enabled: boolean)`.
- In the listener `useEffect`, use `const speech = enabled ? loadSpeechModule() : null;` and add `enabled` to its dependency array.
- Export the existing probe for the facade: `export const hasOnDeviceRecognition = () => loadSpeechModule() !== null;`

In `reducer.test.ts`, change the import to `import { toDictationError } from '@/state/dictation/useOnDeviceDictation';`.

- [ ] **Step 4: Write the failing server-engine tests**

```tsx
// src/frontend/src/state/dictation/useServerDictation.test.tsx
import * as Audio from 'expo-audio';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/api/errors';
import { MAX_RECORDING_MS, useServerDictation } from '@/state/dictation/useServerDictation';

type AudioMock = typeof Audio & {
  __recorder: { uri: string | null; prepareToRecordAsync: jest.Mock; record: jest.Mock; stop: jest.Mock };
  __state: { isRecording: boolean; durationMillis: number; metering?: number };
  __reset: () => void;
};
const audio = Audio as AudioMock;

beforeEach(() => audio.__reset());

async function recording(transcribe: jest.Mock) {
  const hook = await renderHook(() => useServerDictation(true, transcribe));
  await act(() => hook.result.current.start('de'));
  return hook;
}

describe('useServerDictation', () => {
  it('records, uploads on stop and finishes with the transcript', async () => {
    const transcribe = jest.fn().mockResolvedValue('Seit gestern Halsweh.');
    const { result } = await recording(transcribe);
    expect(result.current.state.status).toBe('listening');
    expect(audio.__recorder.record).toHaveBeenCalled();

    await act(async () => result.current.stop());

    await waitFor(() => expect(result.current.state.status).toBe('done'));
    expect(result.current.state.finalText).toBe('Seit gestern Halsweh.');
    expect(transcribe).toHaveBeenCalledWith('file:///cache/recording.m4a', 'de');
  });

  it('is "transcribing" (stopping) while the upload runs', async () => {
    const transcribe = jest.fn(() => new Promise<string>(() => {}));
    const { result } = await recording(transcribe);

    await act(async () => result.current.stop());

    expect(result.current.state.status).toBe('stopping');
  });

  it('reports a refused microphone without recording', async () => {
    (audio.AudioModule.requestRecordingPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
    const { result } = await renderHook(() => useServerDictation(true, jest.fn()));

    await act(() => result.current.start('de'));

    expect(result.current.state).toMatchObject({ status: 'error', error: 'permissionDenied' });
    expect(audio.__recorder.record).not.toHaveBeenCalled();
  });

  it('turns an empty transcript (silence) into "nothing understood"', async () => {
    const { result } = await recording(jest.fn().mockResolvedValue('   '));

    await act(async () => result.current.stop());

    await waitFor(() => expect(result.current.state).toMatchObject({ status: 'error', error: 'noSpeech' }));
  });

  it.each([['network'], ['timeout'], ['server']] as const)(
    'reports the server as unavailable on a %s failure',
    async (kind) => {
      const { result } = await recording(jest.fn().mockRejectedValue(new ApiError(kind)));

      await act(async () => result.current.stop());

      await waitFor(() => expect(result.current.state).toMatchObject({ status: 'error', error: 'serverUnavailable' }));
    },
  );

  it('ignores a transcript that arrives after the user cancelled', async () => {
    let finish: (text: string) => void = () => {};
    const transcribe = jest.fn(() => new Promise<string>((resolve) => (finish = resolve)));
    const { result } = await recording(transcribe);
    await act(async () => result.current.stop());

    await act(async () => result.current.abort());
    await act(async () => finish('zu spät'));

    expect(result.current.state.status).not.toBe('done');
    expect(result.current.state.finalText).toBe('');
  });

  it('stops by itself at the maximum length and transcribes', async () => {
    const transcribe = jest.fn().mockResolvedValue('Lange Beschreibung.');
    const { result, rerender } = await recording(transcribe);

    audio.__state = { ...audio.__state, isRecording: true, durationMillis: MAX_RECORDING_MS };
    await rerender({});

    await waitFor(() => expect(result.current.state.status).toBe('done'));
    expect(audio.__recorder.stop).toHaveBeenCalled();
  });

  it('does nothing while disabled', async () => {
    const { result } = await renderHook(() => useServerDictation(false, jest.fn()));

    await act(() => result.current.start('de'));

    expect(audio.__recorder.record).not.toHaveBeenCalled();
    expect(result.current.state.status).toBe('idle');
  });
});
```

- [ ] **Step 5: Run them to verify they fail**

Run: `npx jest src/state/dictation/useServerDictation.test.tsx`
Expected: FAIL, "Cannot find module '@/state/dictation/useServerDictation'".

- [ ] **Step 6: Implement the server engine**

```ts
// src/frontend/src/state/dictation/useServerDictation.ts
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useCallback, useEffect, useReducer, useRef } from 'react';

import { isApiError } from '@/api/errors';
import { transcriptionsApi, type TranscriptionsApi } from '@/api/transcriptions';
import type { Lang } from '@/i18n/translations';
import { dictationReducer, INITIAL_DICTATION, type DictationError } from './reducer';

/** Long enough for a symptom description, short enough to stay well under the upload limit. */
export const MAX_RECORDING_MS = 120_000;

const RECORDING_OPTIONS = { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true };

/** Metering is dBFS (≈ -60 quiet … 0 loud); the waveform wants 0…1. */
const toLevel = (db: number | undefined) => (db === undefined ? 0 : Math.max(0, Math.min(1, (db + 60) / 60)));

function toError(error: unknown): DictationError {
  if (isApiError(error) && (error.kind === 'network' || error.kind === 'timeout' || error.kind === 'server')) {
    return 'serverUnavailable';
  }
  return 'unknown';
}

/**
 * Dictation for Expo Go and the web: records with expo-audio, then the
 * Symtora API transcribes it on the self-hosted Whisper service. There is no
 * live text; the transcript arrives once after stopping.
 */
export function useServerDictation(enabled: boolean, transcribe: TranscriptionsApi['transcribe'] = transcriptionsApi.transcribe) {
  const [state, dispatch] = useReducer(dictationReducer, INITIAL_DICTATION);
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, 120);

  const langRef = useRef<Lang>('de');
  const recordingRef = useRef(false);
  /** Bumped by abort/unmount so a transcript still in flight is dropped. */
  const runRef = useRef(0);

  const start = useCallback(
    async (lang: Lang) => {
      if (!enabled) return;
      const run = ++runRef.current;
      langRef.current = lang;
      dispatch({ type: 'requested' });

      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (run !== runRef.current) return;
      if (!permission.granted) {
        dispatch({ type: 'failed', error: 'permissionDenied' });
        return;
      }

      try {
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        recorder.record();
      } catch {
        dispatch({ type: 'failed', error: 'unknown' });
        return;
      }
      if (run !== runRef.current) return;
      recordingRef.current = true;
      dispatch({ type: 'started' });
    },
    [enabled, recorder],
  );

  const stop = useCallback(async () => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    const run = runRef.current;
    dispatch({ type: 'stopRequested' });

    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error('No recording file');
      const text = await transcribe(uri, langRef.current);
      if (run !== runRef.current) return;
      if (text.trim()) dispatch({ type: 'result', transcript: text, isFinal: true });
      dispatch({ type: 'ended' });
    } catch (error) {
      if (run !== runRef.current) return;
      dispatch({ type: 'failed', error: toError(error) });
    }
  }, [recorder, transcribe]);

  const abort = useCallback(() => {
    runRef.current += 1;
    if (recordingRef.current) void recorder.stop().catch(() => {});
    recordingRef.current = false;
  }, [recorder]);

  // Hard cap, so a forgotten recording can't grow past the upload limit.
  useEffect(() => {
    if (state.status === 'listening' && recorderState.durationMillis >= MAX_RECORDING_MS) void stop();
  }, [state.status, recorderState.durationMillis, stop]);

  // Leaving the screen discards the recording rather than leaving the mic open.
  useEffect(() => () => abort(), [abort]);

  return {
    state,
    level: state.status === 'listening' ? toLevel(recorderState.metering) : 0,
    start,
    stop: () => void stop(),
    abort,
  };
}
```

- [ ] **Step 7: Write the facade**

```ts
// src/frontend/src/state/dictation/useDictation.ts
import { useState } from 'react';

import { hasOnDeviceRecognition, useOnDeviceDictation } from './useOnDeviceDictation';
import { useServerDictation } from './useServerDictation';

export type DictationEngine = 'device' | 'server';

/**
 * Picks how to dictate, once per mount: on-device recognition when the native
 * module is installed (development builds) because audio never leaves the
 * phone and text appears live; otherwise the self-hosted server (Expo Go, web).
 * Both hooks are always called so the hook order never changes.
 */
export function useDictation() {
  const [engine] = useState<DictationEngine>(() => (hasOnDeviceRecognition() ? 'device' : 'server'));
  const device = useOnDeviceDictation(engine === 'device');
  const server = useServerDictation(engine === 'server');
  return { ...(engine === 'device' ? device : server), engine };
}
```

- [ ] **Step 8: Run the tests and the typecheck**

Run: `npx jest src/state/dictation && npm run typecheck`
Expected: all pass. The new file has 10 tests (the `it.each` counts 3).

- [ ] **Step 9: Commit**

```bash
git add src/frontend/package.json src/frontend/package-lock.json src/frontend/jest.setup.js src/frontend/src/state/dictation
git commit -m "feat(app): server dictation engine with on-device fallback selection"
```

---

### Task 5: Record screen, copy and end-to-end tests

**Files:**
- Modify: `src/frontend/src/app/record.tsx`
- Modify: `src/frontend/src/app/(tabs)/new.tsx` (drop the web-only hiding of the voice card)
- Modify: `src/frontend/src/i18n/de.ts`, `en.ts`, `fr.ts`
- Modify: `src/frontend/src/__tests__/dictation.test.tsx`
- Modify: `README.md` (root)

**Interfaces:**
- Consumes: `useDictation()` → `{ state, level, start, stop, abort, engine }` (Task 4).

- [ ] **Step 1: Write the failing end-to-end tests**

In `src/__tests__/dictation.test.tsx`:
- Add near the top:

```tsx
import * as Audio from 'expo-audio';

const audioMock = () =>
  Audio as unknown as { __reset: () => void; __recorder: { record: jest.Mock } };
```

  and call `audioMock().__reset();` at the start of `beforeEach`.
- **Replace** the test `'shows the unavailable screen in Expo Go, where the native module is missing'` with:

```tsx
  it('falls back to server transcription in Expo Go and hands the text over', async () => {
    const modules = (globalThis as { expo: { modules: Record<string, unknown> } }).expo.modules;
    const stub = modules.ExpoSpeechRecognition;
    delete modules.ExpoSpeechRecognition;
    // The fake API: entries list for the home screen, a transcript for the upload.
    (globalThis.fetch as jest.Mock).mockImplementation(async (url: string) => ({
      ok: true,
      status: 200,
      text: async () => (url.endsWith('/transcriptions') ? JSON.stringify({ text: 'Seit heute Bauchweh.' }) : '[]'),
    }));
    try {
      const view = await open('/new');
      await fireEvent.press(await view.findByText(t.newDesc.speakInstead));

      expect(await view.findByText(t.record.serverNote)).toBeTruthy();
      // The stop button is disabled until recording has actually started.
      await waitFor(() => expect(audioMock().__recorder.record).toHaveBeenCalled());
      await fireEvent.press(view.getByLabelText(t.record.stopLabel));

      expect(await view.findByDisplayValue('Seit heute Bauchweh.')).toBeTruthy();
      expect(speech.start).not.toHaveBeenCalled();
    } finally {
      modules.ExpoSpeechRecognition = stub;
    }
  });

  it('explains when the server cannot transcribe', async () => {
    const modules = (globalThis as { expo: { modules: Record<string, unknown> } }).expo.modules;
    const stub = modules.ExpoSpeechRecognition;
    delete modules.ExpoSpeechRecognition;
    (globalThis.fetch as jest.Mock).mockImplementation(async (url: string) =>
      url.endsWith('/transcriptions')
        ? { ok: false, status: 503, text: async () => '' }
        : { ok: true, status: 200, text: async () => '[]' },
    );
    try {
      const view = await open('/record');
      await waitFor(() => expect(audioMock().__recorder.record).toHaveBeenCalled());
      await fireEvent.press(view.getByLabelText(t.record.stopLabel));

      expect(await view.findByText(t.record.errors.serverUnavailable.title)).toBeTruthy();
      expect(view.getByText(t.record.retry)).toBeTruthy();
    } finally {
      modules.ExpoSpeechRecognition = stub;
    }
  });
```

Note: `beforeEach` already does `jest.spyOn(globalThis, 'fetch')`, so `globalThis.fetch` is a `jest.Mock` inside these tests.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest src/__tests__/dictation.test.tsx`
Expected: the two new tests FAIL. `t.record.serverNote` and `t.record.errors.serverUnavailable` don't exist yet (type errors in ts-jest are reported as test failures).

- [ ] **Step 3: Add the strings**

In each `src/i18n/{de,en,fr}.ts`, inside `record:` after `onDeviceNote`:

```ts
// de
    serverNote: 'Die Aufnahme wird auf dem Symtora-Server in Text umgewandelt und nicht gespeichert.',
    transcribing: 'Wird in Text umgewandelt …',
// en
    serverNote: 'The recording is turned into text on the Symtora server and not stored.',
    transcribing: 'Turning your recording into text …',
// fr
    serverNote: 'L’enregistrement est transcrit sur le serveur Symtora et n’est pas conservé.',
    transcribing: 'Transcription en cours …',
```

Inside `record.errors:` after `unsupported`:

```ts
// de
      serverUnavailable: {
        title: 'Umwandlung gerade nicht möglich',
        body: 'Der Symtora-Server ist nicht erreichbar. Prüfe deine Verbindung und versuche es erneut.',
      },
// en
      serverUnavailable: {
        title: 'Can’t transcribe right now',
        body: 'The Symtora server can’t be reached. Check your connection and try again.',
      },
// fr
      serverUnavailable: {
        title: 'Transcription impossible pour le moment',
        body: 'Le serveur Symtora est injoignable. Vérifie ta connexion et réessaie.',
      },
```

Change `newDesc.speakSubtitle`, because it is no longer true for the server engine:

```ts
// de
    speakSubtitle: 'Beschwerden diktieren statt tippen.',
// en
    speakSubtitle: 'Dictate your symptoms instead of typing.',
// fr
    speakSubtitle: 'Dicte tes symptômes au lieu de les taper.',
```

- [ ] **Step 4: Update the record screen** (`src/app/record.tsx`)

- Destructure the engine: `const { state, level, start, stop, abort, engine } = useDictation();`
- Retry also applies to the new error: `const canRetry = state.error === 'noSpeech' || state.error === 'unknown' || state.error === 'serverUnavailable';`
- Placeholder text while there is no transcript yet: replace `{listening ? t.record.listening : t.record.starting}` with

```tsx
              {state.status === 'stopping' && engine === 'server'
                ? t.record.transcribing
                : listening
                  ? t.record.listening
                  : t.record.starting}
```

- The note under the stop label: replace `<AppText style={s.note}>{t.record.onDeviceNote}</AppText>` with

```tsx
          <AppText style={s.note}>{engine === 'device' ? t.record.onDeviceNote : t.record.serverNote}</AppText>
```

In `src/app/(tabs)/new.tsx`, remove the `CAN_DICTATE` constant and its `{CAN_DICTATE ? ( … ) : null}` wrapper (keep the card itself), and drop `Platform` from the react-native import if it becomes unused. The voice card now also shows on web, which records through the browser.

- [ ] **Step 5: Run the full frontend suite and the typecheck**

Run: `npm run typecheck && npx jest`
Expected: everything passes, including the existing on-device tests in `dictation.test.tsx`. The native module stub is present by default there, so they still use the device engine.

- [ ] **Step 6: Update the root README**

In `README.md`, replace the "Voice transcription" status row with:

```markdown
| Voice transcription | **Works everywhere** — development builds recognise on-device (offline); Expo Go and web record and transcribe on the self-hosted Whisper container. The transcript lands in the text box for review |
```

In the `> [!NOTE]` about Expo Go under "Getting started", replace the paragraph with:

```markdown
> [!NOTE]
> Voice input works in Expo Go: the app records and the API transcribes on the `whisper`
> container (`docker compose up` starts it; the first transcription downloads the model).
> A development build (`npx expo run:android` / `run:ios`) uses on-device recognition instead,
> which needs the phone's offline speech model for the app language.
```

Add `| POST /transcriptions | Bearer | multipart audio → { text }; audio is not stored |` to the API table after `DELETE /me/data`, and add `Whisper` to the architecture mermaid: `B -->|"voice input"| E["<b>Whisper</b><br/>self-hosted speech-to-text"]`.

- [ ] **Step 7: Manual check in Expo Go**

1. `docker compose up -d` (from the repo root), then `npx expo start -c` (from `src/frontend/`), and open the app in Expo Go on a phone that can reach `EXPO_PUBLIC_API_URL`.
2. Log in → New entry → "Stattdessen sprechen". Expect the server note under the stop button and a waveform that moves with your voice.
3. Say a sentence in German, tap Stop. Expect "Wird in Text umgewandelt …", then the text in the text box. The first run is slow while the model downloads.
4. Stop the whisper container (`docker compose stop whisper`), record again. Expect "Umwandlung gerade nicht möglich" with "Erneut versuchen".
5. Record and stay silent. Expect "Nichts verstanden".

- [ ] **Step 8: Commit**

```bash
git add src/frontend/src README.md
git commit -m "feat(app): voice input in Expo Go via server transcription"
```

---

## Self-Review Notes

- **Coverage:** backend endpoint and client (Tasks 1–2), container and config (Task 2), client upload (Task 3), engine plus selection and keeping on-device (Task 4), UI, copy, docs and the Expo Go path (Task 5). The privacy wording change is in Task 5, Step 3.
- **Review Focus mapping:**
  - 120 s cap → Task 4 "stops by itself"
  - silence → Task 1 "empty text" and Task 4 "empty transcript"
  - server down → Task 2 "503", Task 4 "unavailable" and Task 5 "explains"
  - cancel in flight → Task 4 "ignores a transcript"
  - oversized/empty upload → Task 2 "413" and "empty file"
- **Types:**
  - `transcribe(audioUri: string, lang: Lang): Promise<string>` is the same in Tasks 3 and 4.
  - `useDictation()` returns `engine`, which Task 5 uses.
  - `'serverUnavailable'` is added in Task 4, Step 2 and read in Task 5.
