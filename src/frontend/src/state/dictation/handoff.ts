/**
 * Passes a finished transcript from the record screen to the new-entry screen.
 *
 * Deliberately not a route param: the record screen is opened from several
 * places, and a param would put health text into navigation state (and the
 * address bar on web). It lives in memory only and is read exactly once.
 */
let pending: string | null = null;

export function handOffTranscript(text: string): void {
  pending = text;
}

/** Returns the waiting transcript, if any, and clears it. */
export function takeTranscript(): string | null {
  const text = pending;
  pending = null;
  return text;
}
