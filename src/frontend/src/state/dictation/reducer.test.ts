import {
  dictationReducer,
  INITIAL_DICTATION,
  joinText,
  MAX_DESCRIPTION_CHARS,
  transcriptOf,
  type DictationAction,
  type DictationState,
} from '@/state/dictation/reducer';
import { toDictationError } from '@/state/dictation/useOnDeviceDictation';

const run = (...actions: DictationAction[]): DictationState =>
  actions.reduce(dictationReducer, INITIAL_DICTATION);

const listening = (): DictationAction[] => [{ type: 'requested' }, { type: 'started' }];

describe('joinText', () => {
  it('joins with one space and trims both sides', () => {
    expect(joinText('  Kopfweh ', ' seit gestern ')).toBe('Kopfweh seit gestern');
  });

  it('returns whichever side is non-empty', () => {
    expect(joinText('', 'Husten')).toBe('Husten');
    expect(joinText('Husten', '   ')).toBe('Husten');
  });

  it('caps the result at the description limit', () => {
    expect(joinText('a'.repeat(590), 'b'.repeat(50))).toHaveLength(MAX_DESCRIPTION_CHARS);
  });
});

describe('dictation', () => {
  it('starts listening once the recogniser reports it has started', () => {
    expect(run({ type: 'requested' }).status).toBe('requesting');
    expect(run(...listening()).status).toBe('listening');
  });

  it('replaces the interim text on each partial result', () => {
    const state = run(
      ...listening(),
      { type: 'result', transcript: 'Seit', isFinal: false },
      { type: 'result', transcript: 'Seit heute', isFinal: false },
    );

    expect(state.interim).toBe('Seit heute');
    expect(state.finalText).toBe('');
  });

  it('accumulates final results across utterances', () => {
    const state = run(
      ...listening(),
      { type: 'result', transcript: 'Seit heute Kopfweh.', isFinal: true },
      { type: 'result', transcript: 'Vor allem links', isFinal: false },
    );

    expect(state.finalText).toBe('Seit heute Kopfweh.');
    expect(transcriptOf(state)).toBe('Seit heute Kopfweh. Vor allem links');
  });

  it('keeps a trailing partial when recognition ends without a final result', () => {
    const state = run(
      ...listening(),
      { type: 'result', transcript: 'Halsweh', isFinal: false },
      { type: 'stopRequested' },
      { type: 'ended' },
    );

    expect(state).toMatchObject({ status: 'done', finalText: 'Halsweh', interim: '' });
  });

  it('reports no speech when recognition ends with nothing heard', () => {
    const state = run(...listening(), { type: 'stopRequested' }, { type: 'ended' });

    expect(state).toMatchObject({ status: 'error', error: 'noSpeech' });
  });

  it('ignores a no-speech timeout once something has been said', () => {
    const state = run(
      ...listening(),
      { type: 'result', transcript: 'Bauchweh', isFinal: true },
      { type: 'failed', error: 'noSpeech' },
      { type: 'ended' },
    );

    expect(state).toMatchObject({ status: 'done', finalText: 'Bauchweh' });
  });

  it('stays in the error state when the recogniser ends after failing', () => {
    const state = run(...listening(), { type: 'failed', error: 'onDeviceUnavailable' }, { type: 'ended' });

    expect(state).toMatchObject({ status: 'error', error: 'onDeviceUnavailable' });
  });

  it('starts clean when requested again after an error', () => {
    const state = run({ type: 'failed', error: 'permissionDenied' }, { type: 'requested' });

    expect(state).toEqual({ ...INITIAL_DICTATION, status: 'requesting' });
  });
});

describe('toDictationError', () => {
  it('ignores an abort, which is the user cancelling', () => {
    expect(toDictationError('aborted')).toBeNull();
  });

  it.each([
    ['not-allowed', 'permissionDenied'],
    ['language-not-supported', 'onDeviceUnavailable'],
    ['network', 'onDeviceUnavailable'],
    ['no-speech', 'noSpeech'],
    ['speech-timeout', 'noSpeech'],
    ['audio-capture', 'unknown'],
  ] as const)('maps %s to %s', (code, expected) => {
    expect(toDictationError(code)).toBe(expected);
  });
});
