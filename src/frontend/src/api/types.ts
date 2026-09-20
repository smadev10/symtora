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
  email: string;
  password: string;
};

export type AuthResponse = {
  token: string;
  expiresAt: string;
};

/** Mirrors the EntryStatus enum, serialised by name. */
export type EntryStatusDto = 'Pending' | 'Done' | 'Failed';

export type AssessmentCauseDto = {
  label: string;
  tier: string;
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
