# Frontend app structure refactor — design

Date: 2026-09-20
Branch: `refactor/app-structure`
Status: approved, ready for implementation planning

## Problem

`src/frontend/App.js` is 1022 lines. It holds every screen, a ~130-key style
object rebuilt on each render, roughly forty navigation and mutation handlers,
and all derived view-model data. Navigation is a single `screen` string; app
state is one flat `useState` object; nothing survives a reload. Every other
piece of frontend work builds on this file, so it has to come apart first.

Specific symptoms:

- Twelve screens live in one module, gated by `{screen === 'x' && (…)}`.
- `showBottomNav` (App.js:460) is a hardcoded exclusion array — navigation
  structure expressed as a boolean.
- `styles.ctaButton` (App.js:203) reads `consent || screen !== 'onboarding'`:
  the style table knows which screen is showing.
- Session, settings and per-screen form state share one object, so a language
  change and a password field live at the same level.
- Translations are incomplete in practice: `triggerData`, `callNumbers`, the
  retention labels and `histDates` (App.js:362–441) are built from inline
  `lang === 'de' ? … : …` ternaries rather than from `TR`.
- There is no API layer, no persistence, and no test infrastructure.

## Scope

In scope:

- Split `App.js` into per-screen route files plus shared tokens and styles.
- Replace the `screen` string with expo-router: history, back, deep links.
- Split app state into session, settings and entries; per-screen state stays local.
- Persist session and settings (language, theme, retention, local-only).
- Build a typed API client: base URL from env, bearer token, error mapping.
- Shared loading / empty / error / offline components available to every screen.
- Keep DE/EN/FR and light/dark working throughout.
- Wire **auth** to the real backend (`/auth/login`, `/auth/register`).
- Migrate the frontend to TypeScript.

Out of scope, deliberately:

- Wiring entries and patterns to the API. The backend's `AssessmentResponse`
  returns `{ causes, urgency, nextSteps, generatedAt }`, but the assessment
  screen renders findings-with-percentages, colour-coded transcript segments and
  probability pills. Reconciling those shapes means either extending the backend
  DTO or cutting UI detail, and that decision deserves its own cycle. Entries and
  patterns keep reading demo data from `src/data/cases.ts`, behind a repository
  interface that the API implementation will later replace.
- Voice transcription. Still unimplemented, unchanged here.
- Any backend change.

### What "auth wired" does and does not cover

The backend's auth surface is narrower than the screens suggest, so the boundary
has to be explicit:

- `POST /auth/login` takes `{ email, password }`. The login screen maps 1:1.
- `POST /auth/register` takes `{ email, password }` only, with a `MinLength(8)`
  password rule. The signup screen also collects **name**, a confirm field and a
  consent checkbox. Confirm and consent are validated client-side, as today.
  **Name has nowhere to go** — it is kept in local settings so the profile
  screen and the `data` tab avatar keep working, and is not sent to the API.
- The **profile screen is not wired.** There is no `PUT /me`; the only `/me`
  route is `DELETE /me/data`. Profile save continues to update local state and
  show its saved note, exactly as it does now.
- **Wipe-all is not wired** to `DELETE /me/data` this round, to keep the scope
  boundary at auth. It stays a local action. It is the obvious first candidate
  for the follow-up cycle.
- The **Google and Apple buttons have no backend support.** They keep their
  current placeholder behaviour and are left visually unchanged.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Navigation | expo-router | Back, web URLs and deep links are properties of the router rather than code to maintain. Documented default for Expo 57. |
| Language | TypeScript, all files | "Typed responses" needs a compile-time contract. Marginal cost is lowest now, while `App.js` is being torn apart anyway. |
| Token storage | expo-secure-store on native, AsyncStorage on web | SecureStore has no web support; the app ships a web target. |
| Settings storage | AsyncStorage everywhere | Preferences are not credentials. |
| App state | Context + `useReducer`, three providers | No dependency; pure reducers are the cheapest thing to test; readable end to end. |
| Server-state library | None | Entries stay on demo data this round, so there is nothing to cache. |

Rejected: react-navigation directly (same runtime, more config, weaker web
URLs); a hand-rolled history reducer (would mean hand-writing `BackHandler`,
web URL sync and `expo-linking` parsing); Redux Toolkit (boilerplate exceeds
benefit at three domains); JSDoc + `checkJs` (leaves a mixed-convention
codebase).

## Route tree

expo-router resolves to `src/app` when a `src` directory exists, so all code
stays under `src/`. Screens that show the bottom nav go in the `(tabs)` group.
`emergency` and `assessment` show the nav today but are not tabs, so they sit in
the group with `href: null`: tab bar visible, no tab button.

```
src/app/
  _layout.tsx            root Stack · providers · font loading · bootstrap gate
  index.tsx              redirect: session → /start · consent → /onboarding · else /login
  login.tsx
  signup.tsx
  onboarding.tsx
  profile.tsx
  record.tsx             presentation: fullScreenModal
  (tabs)/
    _layout.tsx          bottom nav
    start.tsx            tab
    patterns.tsx         tab
    new.tsx              tab (the + button)
    data.tsx             tab
    emergency.tsx        href: null
    assessment/[id].tsx  href: null
```

The mic item in the nav is an action (`router.push('/record')`), not a tab.

`loading` is removed as a route. It is a transient state of the analyse action,
so it renders inside `new.tsx` while the request is in flight. A route you can
navigate *back* into is the wrong shape for a spinner.

`assessment/[id]` takes a demo case key (`headache` | `stomach` | `throat` |
`knee`) for now. The route shape does not change when `id` becomes a real entry
GUID.

## Module layout

```
src/
  api/
    client.ts           request<T>: base URL, bearer, timeout, JSON, error mapping
    errors.ts           ApiError union
    auth.ts             login(), register()
    types.ts            DTOs mirroring the backend records
  state/
    session/   reducer.ts  Provider.tsx  index.ts
    settings/  reducer.ts  Provider.tsx  index.ts
    entries/   reducer.ts  Provider.tsx  index.ts
  storage/
    index.ts            secureStore | prefsStore, Platform branching
    keys.ts
  theme/
    tokens.ts           tokens(theme), typed
    shared.ts           cardShadow, ls(), lh(), shared style pieces
    useThemedStyles.ts  memoised makeStyles resolution
  i18n/
    translations.ts     TR, as const
    useT.ts
  data/
    cases.ts            demo content, typed
  repositories/
    entriesRepository.ts  interface + demo implementation
  components/
    AppText.tsx  AnimatedBits.tsx  icons.tsx  ScreenScaffold.tsx
    states/  Loading.tsx  Empty.tsx  ErrorView.tsx  Offline.tsx
```

`ScreenScaffold` absorbs the back-button-plus-local-badge header repeated across
six screens.

## Styling

Each screen file declares a module-level `makeStyles(tk)` returning
`StyleSheet.create(…)`, resolved via `useThemedStyles(makeStyles)`, which
memoises per theme. Shared pieces — `card`, `cardShadow`, `screenPad`,
`rowBetween`, `badge`, `ctaButton` — move to `theme/shared.ts`.

`ctaButton`'s embedded `consent || screen !== 'onboarding'` condition becomes a
`disabled` prop on a shared button component.

## API client

Base URL comes from `process.env.EXPO_PUBLIC_API_URL`. Dot notation only —
Expo inlines these at build time and bracket access silently fails. A
`src/frontend/.env.example` documents the key.

`request<T>(path, { method, body, auth })`:

- sets JSON content-type and `Accept`
- injects `Authorization: Bearer <token>` from a token getter that the session
  layer registers at startup — a getter, not an import, so `api/` never depends
  on `state/`
- applies an `AbortController` timeout
- maps the outcome onto a closed error union:

| Outcome | Error |
|---|---|
| fetch rejects | `NetworkError` |
| abort | `TimeoutError` |
| 400 | `ValidationError` (with field detail) |
| 401 | `UnauthorizedError` |
| 404 | `NotFoundError` |
| 5xx | `ServerError` |

Every error carries a **translation key**, not an English message, so error
handling honours DE/EN/FR like the rest of the app. The corresponding keys are
added to `TR`.

A 401 has one global consequence: the session reducer clears the token and the
root layout redirects to `/login`.

`types.ts` mirrors the backend records exactly: `AuthResponse`,
`CreateEntryRequest`, `CreateEntryResponse`, `EntryResponse`,
`AssessmentResponse`, `PatternResponse`.

## Shared UI states

Four components under `components/states/`, each taking theme tokens and an
optional `onRetry`.

Offline is derived from `NetworkError` rather than from a connectivity library.
This is a deliberate simplification: it detects "the request did not reach the
server", not "the radio is off", and it will not proactively announce that
connectivity returned. It avoids a dependency for a prototype that makes few
requests.

## i18n and theming

`TR` becomes `as const`, with `Translations` derived from the German branch, so
a missing French key is a compile error instead of a blank render.

The inline language ternaries at App.js:362–441 — `triggerData`, `callNumbers`,
retention labels and `histDates` — move into `TR`.

Language and theme move into `SettingsProvider` and persist across restarts. The
per-screen `statusBarStyle` computation becomes a route option.

## Session bootstrap

On launch the root layout reads the persisted token, compares `expiresAt` to
now, and either restores the session or routes to `/login`. Fonts load in the
same gate. Until both resolve, the root layout renders the shared loading state
rather than `null`.

## Testing

No frontend test infrastructure exists today. Add `jest-expo` and
`@testing-library/react-native` with an `npm test` script.

Test-first coverage concentrates where it is cheap and meaningful:

- the three reducers — pure functions, no renderer, no mocks
- `storage/` against mocked SecureStore and AsyncStorage, both platforms
- the API client's status-to-error mapping against mocked fetch
- translation completeness: all three languages expose one identical key set
- `entriesRepository` demo implementation

Screens get render smoke tests, not exhaustive assertions.

## Order of work

Each step leaves the app runnable.

1. tsconfig, jest-expo, `npm test` green on one trivial test
2. mechanical `.js` → `.ts` of the five leaf modules, no behaviour change
3. extract `theme/` from App.js
4. `storage/` and the three reducers, test-first
5. `api/` and auth wiring, test-first
6. install expo-router, root layout, empty route shells
7. port screens one at a time out of App.js
8. delete App.js and index.js, update README

## Risks

- `"main": "expo-router/entry"` replaces `index.js`; `registerRootComponent`
  goes away.
- app.json needs a `scheme` for deep links and `web.bundler: "metro"`.
- `react-native-screens` is a new native dependency. Fine in Expo Go; a dev
  build would need rebuilding.
- The README stack section is already wrong — it claims Expo SDK 54 and RN 0.81
  where package.json has Expo 57 and RN 0.86. Corrected at step 8.
- Web keeps the token in plaintext regardless of storage choice. A browser
  cannot hide a value from its own user. Documented, not solved.

## Success criteria

- No *code* file over ~300 lines; `App.js` and `index.js` are gone. The content
  literals `i18n/translations.ts` and `data/cases.ts` are exempt — they are data,
  and `translations.ts` grows when the inline ternaries move into it.
- Back works on Android hardware back, on web browser back, and via
  `router.back()`. Deep links resolve to routes.
- Language, theme, retention, local-only and session survive a full app restart.
- Login and signup reach the real API; a wrong password renders a mapped,
  translated error.
- All three languages and both themes work on every screen, as they do today.
- `npm test` passes; `npx tsc --noEmit` is clean.
