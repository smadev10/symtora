# Symtora backend

A minimal, capstone-scoped backend for Symtora: auth, symptom-entry analysis (run through a
self-hosted local model — no third-party AI API involved), history/patterns, and a
"delete my data" endpoint. See the [backend architecture plan](../../.claude/plans) discussed
during design for the full rationale; the short version:

- **Self-hosted model, not a hosted API** (Claude/OpenAI): symptom text never leaves
  infrastructure you control, matching the app's on-device-style privacy promise.
- **`POST /entries` is async**: it enqueues the analysis job and returns `202` immediately;
  clients poll `GET /entries/:id` until `status` is no longer `Pending`. A long synchronous
  call would be fragile on mobile networks given local-model inference can take a while.
- **C#/.NET** (ASP.NET Core + EF Core + Postgres), REST only — no GraphQL/gRPC, they're
  unnecessary for this small, fixed set of endpoints.

## Running it

### With Docker (how this is meant to run)

```bash
cd ../..               # the compose file lives at the repo root
cp .env.example .env   # then fill in JWT_SECRET (see the comment in .env.example)
docker compose up --build
```

This starts four services: `api` (this project), `db` (Postgres), `model` (Ollama), and a
one-shot `model-init` job that pulls the configured model weights before `api` starts serving
requests. First run downloads the model (multi-GB) — subsequent runs reuse the `ollama_models`
volume. The API is then reachable at `http://localhost:8080`.

### Locally, without Docker (faster inner loop while developing)

You need Postgres and Ollama running locally (or reachable) and pointed at by
`appsettings.Development.json` (defaults to `localhost`):

```bash
cd src/backend
dotnet tool restore                                   # installs dotnet-ef locally, once
dotnet ef database update --project src/Symtora.Api   # applies migrations
dotnet run --project src/Symtora.Api
```

### Looking the API up

With the app running, the browsable API reference (Scalar) is at
**`http://localhost:5014/scalar`**, and the raw OpenAPI document at `/openapi/v1.json`. Log in via
`POST /auth/login`, paste the returned token into the reference's *Authorize* field, and the
`[Authorize]` endpoints are runnable straight from the page.

Both are served whenever `OpenApi:Enabled` is true, which defaults to "only in Development". The
container has them off — set `EXPOSE_API_DOCS=true` in `.env` to publish them there too.

## Project layout

| Path | Purpose |
|---|---|
| `src/Symtora.Api/Models/` | EF Core entities: `User`, `SymptomEntry`, `Assessment` |
| `src/Symtora.Api/Data/` | `SymtoraDbContext` and EF Core migrations |
| `src/Symtora.Api/Services/Auth/` | Password hashing, JWT issuance, register/login logic |
| `src/Symtora.Api/Services/Analysis/` | Prompt building, Ollama client, response parsing, the background job queue + worker |
| `src/Symtora.Api/Controllers/` | `AuthController`, `EntriesController`, `PatternsController`, `MeController` |
| `tests/Symtora.Api.Tests/` | Unit tests — run with `dotnet test` from `src/backend/` |

## API

| Endpoint | Auth | Notes |
|---|---|---|
| `POST /auth/register` | – | `{ email, password }` → `{ token, expiresAt }` |
| `POST /auth/login` | – | same shape |
| `POST /entries` | Bearer | `{ text, bodyRegion? }` → `202` + `{ id, status: "Pending" }` |
| `GET /entries/:id` | Bearer | Poll this until `status` is `"Done"` or `"Failed"` |
| `GET /entries` | Bearer | Full history for the current user, newest first |
| `GET /patterns` | Bearer | Body-region breakdown (count, last urgency, last seen) |
| `DELETE /me/data` | Bearer | Deletes all of the current user's entries/assessments (keeps the account) |
| `GET /health` | – | Liveness check |
| `GET /scalar` | – | Browsable API reference (see below); `GET /openapi/v1.json` for the raw document |

## Not included yet (by design, see plan's open items)

- **Voice transcription** (`stt` service) — deferred until the text-based flow above is
  working end-to-end against the real app.
- **SSE streaming** for `GET /entries/:id` — polling is enough for the MVP; swap in later if
  the loading screen should show live model progress instead of a spinner.
