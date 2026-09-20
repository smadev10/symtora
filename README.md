# Symtora

**KI-Diagnose · Vertiefungsarbeit** — an interactive prototype of a symptom‑triage app.

Describe what's wrong by text or voice; the app sorts your input into an urgency level,
possible causes and concrete next steps. It is built around three promises shown at
onboarding: processing stays **on the device**, it gives **no medical diagnosis**, and
every entry is **deletable at any time**. Swiss context throughout (emergency number 144,
Tox Info Suisse, etc.).

> Prototype: screens and navigation are complete. **Sign‑in and registration run against the
> real API** (see [`src/backend/`](src/backend/README.md)); the session and your settings
> survive a restart. Entries and patterns still read the demo content in
> `src/frontend/src/data/`, behind the repository interface the API implementation will
> replace — the backend's assessment shape doesn't yet carry the findings, transcript
> segments and probabilities the result screen renders.
> Voice transcription is not implemented.

## Features

- Onboarding with consent gate
- Text entry (quick chips, char counter) and a voice‑recording screen
- Assessment result: urgency banner, detected findings, possible causes, transcript
  highlights, next steps, medical disclaimer
- Home dashboard: 14‑day intensity chart, stat cards, body‑region breakdown
- Patterns screen: frequency heatmap + recurring triggers
- Emergency screen with tap‑to‑call hotlines and warning signs
- Settings: storage, retention, on‑device‑only toggle, export, wipe‑all
- Three languages (DE / EN / FR) and light / dark themes, switchable at runtime

## Getting started

The app lives in `src/frontend`, the API in `src/backend` — every npm command below runs from
the frontend folder.

```bash
cd src/frontend
npm install
npm start          # expo start — then press a / i / w, or scan the QR in Expo Go
```

Platform shortcuts:

```bash
npm run android
npm run ios
npm run web
```

For the API on its own, see [`src/backend/README.md`](src/backend/README.md). To run everything
(app, API, database, model) at once, copy `.env.example` to `.env`, fill in `JWT_SECRET`, and
`docker compose up --build`.

## Stack

- **Expo SDK 57** / **React Native 0.86** / **React 19**, TypeScript throughout
- **expo-router** — file‑based routes under `src/app/`, with back, web URLs and
  `symtora://` deep links
- `@react-native-async-storage/async-storage` for settings, `expo-secure-store` for the
  session token (Keychain/Keystore on native; AsyncStorage on web, where SecureStore has
  no implementation)
- `expo-font` + `@expo-google-fonts/open-sans` (loaded via the `expo-font` config plugin)
- `react-native-safe-area-context`, `react-native-screens`
- `react-native-svg` — all icons and the logo are hand‑drawn SVG (`src/components/icons.tsx`)
- `react-native-web` + `react-dom` for the web target
- `jest-expo` + `@testing-library/react-native` for tests

### Scripts

```bash
npm test         # jest
npm run typecheck  # tsc --noEmit
```

### Configuration

`EXPO_PUBLIC_API_URL` points the app at the API — copy `src/frontend/.env.example` to
`.env`. It is inlined into the bundle at build time, so nothing secret belongs in it.

## Project layout

Everything at the root is project‑level; all code sits under `src/`.

| Path | Purpose |
|---|---|
| `docker-compose.yml` | The whole stack: app API, Postgres, and the self‑hosted model |
| `src/backend/` | The .NET API — see its own [README](src/backend/README.md) |
| `src/frontend/` | The Expo app (paths below are relative to it) |

Inside `src/frontend/`:

| Path | Purpose |
|---|---|
| `src/app/` | expo-router routes — one file per screen (entry point is `expo-router/entry`) |
| `src/app/_layout.tsx` | Providers, font loading, and the gate that waits for storage before routing |
| `src/app/(tabs)/` | The screens that show the bottom nav |
| `src/api/` | `request()` client, the `ApiError` union, DTOs mirroring the backend, auth calls |
| `src/state/` | `session`, `settings` and `entries` — a pure reducer plus a provider each |
| `src/storage/` | `KeyValueStore` over AsyncStorage and SecureStore |
| `src/repositories/` | `EntriesRepository` — the seam the API slots into; demo implementation today |
| `src/theme/` | Colour tokens, shared styles, per‑theme style caching |
| `src/i18n/` | `de` / `en` / `fr`; German defines the type every language must satisfy |
| `src/components/` | `AppText`, icons, animations, buttons, shared loading/empty/error/offline states |
| `src/data/cases.ts` | Demo assessments (`CASES`) and chart constants (`HEAT`, `DIST`, `TREND`) |
| `assets/` | App icon, splash, adaptive‑icon layers, favicon |

Routes that show the bottom nav live in `(tabs)`; `emergency` and `assessment/[id]` sit in
that group with `href: null`, so the bar stays visible without them being tabs. There is no
`loading` route — analysing is a state of the screen that triggers it, not a destination you
can navigate back into.
