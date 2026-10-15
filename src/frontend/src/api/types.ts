/**
 * Wire types, mirroring the records in Symtora.Api/Dtos. Deliberately kept as
 * the shapes the API actually returns — narrowing to the app's own unions
 * happens where the data is mapped, not here.
 */

export type LoginRequest = {
  email: string;
  password: string;
};

/** The API accepts email and password only; there is no name field. */
export type RegisterRequest = {
  name: string;
  email: string;
  password: string;
};

export type AuthResponse = {
  token: string;
  expiresAt: string;
  /** Display name given at registration; empty for accounts created before names were stored. */
  name: string;
};

/** Mirrors the EntryStatus enum, serialised by name. */
export type EntryStatusDto = 'Pending' | 'Done' | 'Failed';

export type AssessmentCauseDto = {
  label: string;
  tier: string;
  /** One sentence on why it fits. Null for assessments made before reasons existed. */
  reason?: string | null;
};

export type AssessmentResponse = {
  causes: AssessmentCauseDto[];
  /** "low" | "mid" | "high" by convention; validated when mapped. */
  urgency: string;
  nextSteps: string[];
  generatedAt: string;
};

export type EntryResponse = {
  id: string;
  rawText: string;
  bodyRegion: string | null;
  status: EntryStatusDto;
  createdAt: string;
  assessment: AssessmentResponse | null;
};

export type CreateEntryRequest = {
  text: string;
  bodyRegion?: string | null;
  /** Language the assessment is written in; the API defaults to "de". */
  language?: 'de' | 'en' | 'fr';
};

export type CreateEntryResponse = {
  id: string;
  status: EntryStatusDto;
};

export type PatternResponse = {
  bodyRegion: string;
  entryCount: number;
  lastUrgency: string | null;
  lastEntryAt: string;
};

/** GET /me/export: everything the server stores about the signed-in user. */
export type MyDataExport = {
  exportedAt: string;
  profile: { email: string; name: string; createdAt: string };
  entries: EntryResponse[];
};
