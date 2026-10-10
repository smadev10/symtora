/** Upper bound for a symptom description, typed or dictated. */
export const MAX_DESCRIPTION_CHARS = 600;

export type DictationError =
  /** Microphone access was refused. */
  | 'permissionDenied'
  /** No offline model for the language; we never fall back to cloud recognition. */
  | 'onDeviceUnavailable'
  /** Recognition ran but heard nothing usable. */
  | 'noSpeech'
  /** Web, Expo Go, or a device without a recogniser. */
  | 'unsupported'
  /** Server transcription only: the API or Whisper could not be reached. */
  | 'serverUnavailable'
  | 'unknown';

export type DictationStatus = 'idle' | 'requesting' | 'listening' | 'stopping' | 'done' | 'error';

export type DictationState = {
  status: DictationStatus;
  /** Utterances the recogniser has committed to. */
  finalText: string;
  /** The utterance still being recognised; replaced on every partial result. */
  interim: string;
  error: DictationError | null;
};

export type DictationAction =
  | { type: 'requested' }
  | { type: 'started' }
  | { type: 'result'; transcript: string; isFinal: boolean }
  | { type: 'stopRequested' }
  | { type: 'ended' }
  | { type: 'failed'; error: DictationError };

export const INITIAL_DICTATION: DictationState = {
  status: 'idle',
  finalText: '',
  interim: '',
  error: null,
};

/** Joins two pieces of text with a single space and caps the result. */
export function joinText(base: string, addition: string, max = MAX_DESCRIPTION_CHARS): string {
  const a = base.trim();
  const b = addition.trim();
  const joined = a && b ? `${a} ${b}` : a || b;
  return joined.slice(0, max);
}

/** Everything heard so far, including the utterance still in progress. */
export const transcriptOf = (state: DictationState) => joinText(state.finalText, state.interim);

const isActive = (status: DictationStatus) =>
  status === 'requesting' || status === 'listening' || status === 'stopping';

export function dictationReducer(state: DictationState, action: DictationAction): DictationState {
  switch (action.type) {
    case 'requested':
      return { ...INITIAL_DICTATION, status: 'requesting' };

    case 'started':
      return state.status === 'requesting' ? { ...state, status: 'listening' } : state;

    case 'result':
      if (!isActive(state.status)) return state;
      return action.isFinal
        ? { ...state, finalText: joinText(state.finalText, action.transcript), interim: '' }
        : { ...state, interim: action.transcript };

    case 'stopRequested':
      return state.status === 'listening' ? { ...state, status: 'stopping' } : state;

    case 'ended': {
      if (!isActive(state.status)) return state;
      // A partial that never got a final result still counts: the user saw it on screen.
      const text = transcriptOf(state);
      return text
        ? { ...state, status: 'done', finalText: text, interim: '' }
        : { ...state, status: 'error', error: 'noSpeech', interim: '' };
    }

    case 'failed':
      // "No speech" after the user already said something is just the recogniser timing out.
      if (action.error === 'noSpeech' && transcriptOf(state)) return state;
      return { ...state, status: 'error', error: action.error };

    default:
      return state;
  }
}
