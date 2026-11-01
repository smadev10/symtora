/**
 * Environment variables the Expo CLI inlines into the bundle at build time.
 *
 * Declared here rather than relying on the generated `expo-env.d.ts`, which
 * this repo gitignores — without this, `npm run typecheck` fails on a fresh
 * clone until someone has run `expo start` once.
 *
 * Only `EXPO_PUBLIC_`-prefixed names are inlined, and only via dot notation:
 * `process.env['EXPO_PUBLIC_API_URL']` is silently left alone. Nothing secret
 * belongs here — these values are readable in the shipped bundle.
 */
declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_API_URL?: string;
    /** This computer's Wi-Fi address, set by the start scripts; drives the login screen's phone QR. */
    EXPO_PUBLIC_LAN_IP?: string;
  }
}

declare var process: {
  env: NodeJS.ProcessEnv;
};
