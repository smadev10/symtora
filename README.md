# Symtora

**KI-Diagnose · Vertiefungsarbeit** — an interactive prototype of a symptom‑triage app.

Describe what's wrong by text or voice; the app sorts your input into an urgency level,
possible causes and concrete next steps. It is built around three promises shown at
onboarding: processing stays **on the device**, it gives **no medical diagnosis**, and
every entry is **deletable at any time**. Swiss context throughout (emergency number 144,
Tox Info Suisse, etc.).

> Prototype: screens and navigation are complete. A real backend now exists (see
> [`src/backend/`](src/backend/README.md)) for auth, analysis, and persistence, but the app itself
> still isn't wired up to it — `App.js` still uses the hardcoded demo data in
> `src/frontend/src/data/`.
> Voice transcription is not implemented yet either way.

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

- **Expo SDK 54** / **React Native 0.81** / **React 19**
- `expo-status-bar`, `expo-linking`, `expo-linear-gradient`
- `expo-font` + `@expo-google-fonts/open-sans` (loaded via the `expo-font` config plugin)
- `react-native-safe-area-context` for insets
- `react-native-svg` — all icons and the logo are hand‑drawn SVG (`src/icons.js`)
- `react-native-web` + `react-dom` for the web target
- No navigation library — a single screen state machine in `App.js`
- Frontend currently still runs on demo content from `src/data/` — see
  [`src/backend/`](src/backend/README.md) for the real backend (not yet wired into the app)

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
| `App.js` | All screens, the `screen` state machine, and the style/token system |
| `src/AppText.js` | `Text` wrapper that maps `fontWeight` to the right Open Sans face |
| `src/AnimatedBits.js` | `Spinner`, `PulseRing`, `WaveBar` animations |
| `src/icons.js` | SVG icons, `LogoMark`, `Avatar` |
| `src/data/translations.js` | `TR` — every UI string, in DE / EN / FR |
| `src/data/cases.js` | Demo assessments (`CASES`) and chart constants (`HEAT`, `DIST`, `TREND`) |
| `index.js` | Entry point (`registerRootComponent`) |
| `assets/` | App icon, splash, adaptive‑icon layers, favicon |
