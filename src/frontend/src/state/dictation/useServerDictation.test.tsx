import * as Audio from 'expo-audio';
import * as FileSystem from 'expo-file-system';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/api/errors';
import { MAX_RECORDING_MS, useServerDictation } from '@/state/dictation/useServerDictation';

type AudioMock = typeof Audio & {
  __recorder: { uri: string | null; prepareToRecordAsync: jest.Mock; record: jest.Mock; stop: jest.Mock };
  __state: { isRecording: boolean; durationMillis: number; metering?: number };
  __reset: () => void;
};
const audio = Audio as AudioMock;

const deletedFiles = (FileSystem as unknown as { __deleted: string[] }).__deleted;

beforeEach(() => {
  audio.__reset();
  deletedFiles.length = 0;
});

async function recording(transcribe: jest.Mock) {
  const hook = await renderHook(() => useServerDictation(true, transcribe));
  await act(() => hook.result.current.start('de'));
  return hook;
}

describe('useServerDictation', () => {
  it('records, uploads on stop and finishes with the transcript', async () => {
    const transcribe = jest.fn().mockResolvedValue('Seit gestern Halsweh.');
    const { result } = await recording(transcribe);
    expect(result.current.state.status).toBe('listening');
    expect(audio.__recorder.record).toHaveBeenCalled();

    await act(async () => result.current.stop());

    await waitFor(() => expect(result.current.state.status).toBe('done'));
    expect(result.current.state.finalText).toBe('Seit gestern Halsweh.');
    expect(transcribe).toHaveBeenCalledWith('file:///cache/recording.m4a', 'de');
  });

  it('is "transcribing" (stopping) while the upload runs', async () => {
    const transcribe = jest.fn(() => new Promise<string>(() => {}));
    const { result } = await recording(transcribe);

    await act(async () => result.current.stop());

    expect(result.current.state.status).toBe('stopping');
  });

  it('reports a refused microphone without recording', async () => {
    (audio.AudioModule.requestRecordingPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
    const { result } = await renderHook(() => useServerDictation(true, jest.fn()));

    await act(() => result.current.start('de'));

    expect(result.current.state).toMatchObject({ status: 'error', error: 'permissionDenied' });
    expect(audio.__recorder.record).not.toHaveBeenCalled();
  });

  it('turns an empty transcript (silence) into "nothing understood"', async () => {
    const { result } = await recording(jest.fn().mockResolvedValue('   '));

    await act(async () => result.current.stop());

    await waitFor(() => expect(result.current.state).toMatchObject({ status: 'error', error: 'noSpeech' }));
  });

  it.each([['network'], ['timeout'], ['server']] as const)(
    'reports the server as unavailable on a %s failure',
    async (kind) => {
      const { result } = await recording(jest.fn().mockRejectedValue(new ApiError(kind)));

      await act(async () => result.current.stop());

      await waitFor(() => expect(result.current.state).toMatchObject({ status: 'error', error: 'serverUnavailable' }));
    },
  );

  it('ignores a transcript that arrives after the user cancelled', async () => {
    let finish: (text: string) => void = () => {};
    const transcribe = jest.fn(() => new Promise<string>((resolve) => (finish = resolve)));
    const { result } = await recording(transcribe);
    await act(async () => result.current.stop());

    await act(async () => result.current.abort());
    await act(async () => finish('zu spät'));

    expect(result.current.state.status).not.toBe('done');
    expect(result.current.state.finalText).toBe('');
  });

  it('stops by itself at the maximum length and transcribes', async () => {
    const transcribe = jest.fn().mockResolvedValue('Lange Beschreibung.');
    const { result, rerender } = await recording(transcribe);

    Object.assign(audio.__state, { isRecording: true, durationMillis: MAX_RECORDING_MS });
    await rerender({});

    await waitFor(() => expect(result.current.state.status).toBe('done'));
    expect(audio.__recorder.stop).toHaveBeenCalled();
  });

  it('does nothing while disabled', async () => {
    const { result } = await renderHook(() => useServerDictation(false, jest.fn()));

    await act(() => result.current.start('de'));

    expect(audio.__recorder.record).not.toHaveBeenCalled();
    expect(result.current.state.status).toBe('idle');
  });
});

describe('useServerDictation cleanup', () => {
  it('never starts the microphone when cancelled while it is still preparing', async () => {
    let prepared: () => void = () => {};
    audio.__recorder.prepareToRecordAsync.mockImplementation(
      () => new Promise<void>((resolve) => (prepared = resolve)),
    );
    const { result } = await renderHook(() => useServerDictation(true, jest.fn()));

    let starting: Promise<void> = Promise.resolve();
    await act(async () => {
      starting = result.current.start('de');
    });
    await act(async () => result.current.abort());
    await act(async () => {
      prepared();
      await starting;
    });

    expect(audio.__recorder.record).not.toHaveBeenCalled();
    expect(result.current.state.status).not.toBe('listening');
  });

  it('deletes the recording from the phone once it has been transcribed', async () => {
    const { result } = await recording(jest.fn().mockResolvedValue('Kopfweh.'));

    await act(async () => result.current.stop());

    await waitFor(() => expect(result.current.state.status).toBe('done'));
    expect(deletedFiles).toEqual(['file:///cache/recording.m4a']);
  });

  it('deletes the recording when transcription fails too', async () => {
    const { result } = await recording(jest.fn().mockRejectedValue(new ApiError('network')));

    await act(async () => result.current.stop());

    await waitFor(() => expect(result.current.state.status).toBe('error'));
    expect(deletedFiles).toEqual(['file:///cache/recording.m4a']);
  });

  it('deletes the recording when the user cancels while recording', async () => {
    const { result } = await recording(jest.fn());

    await act(async () => result.current.abort());

    await waitFor(() => expect(deletedFiles).toEqual(['file:///cache/recording.m4a']));
  });
});
