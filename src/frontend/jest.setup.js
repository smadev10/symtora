// Native modules that have no implementation under Jest. Both are replaced
// with in-memory equivalents so tests exercise real read/write behaviour
// rather than assertions about mock calls.

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-crypto', () => {
  const { createHash } = require('crypto');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    CryptoEncoding: { HEX: 'hex', BASE64: 'base64' },
    digestStringAsync: jest.fn(async (_algorithm, data) =>
      createHash('sha256').update(data).digest('hex'),
    ),
  };
});

jest.mock('expo-secure-store', () => {
  const vault = new Map();
  return {
    getItemAsync: jest.fn(async (key) => (vault.has(key) ? vault.get(key) : null)),
    setItemAsync: jest.fn(async (key, value) => {
      vault.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key) => {
      vault.delete(key);
    }),
    isAvailableAsync: jest.fn(async () => true),
    __vault: vault,
  };
});

// On-device speech recognition. Tests drive it by emitting the native events
// through `__emit`; `__reset` restores the defaults between tests.
// The app probes for the native module before loading the package (it is
// missing in Expo Go), so register it the way a development build would.
globalThis.expo = globalThis.expo ?? {};
globalThis.expo.modules = { ...globalThis.expo.modules, ExpoSpeechRecognition: {} };

jest.mock('expo-speech-recognition', () => {
  const listeners = new Map();
  const module = {
    // A plain function, so jest.restoreAllMocks() in a test can't strip it.
    addListener: (event, listener) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(listener);
      return { remove: () => listeners.get(event).delete(listener) };
    },
    isRecognitionAvailable: jest.fn(),
    supportsOnDeviceRecognition: jest.fn(),
    requestMicrophonePermissionsAsync: jest.fn(),
    getSupportedLocales: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    abort: jest.fn(),
    __emit: (event, payload) => listeners.get(event)?.forEach((listener) => listener(payload)),
    /** A device that has everything: permission, an offline model, a recogniser that starts. */
    __reset: () => {
      module.isRecognitionAvailable.mockReset().mockReturnValue(true);
      module.supportsOnDeviceRecognition.mockReset().mockReturnValue(true);
      module.requestMicrophonePermissionsAsync
        .mockReset()
        .mockResolvedValue({ granted: true, canAskAgain: true, status: 'granted', expires: 'never' });
      module.getSupportedLocales.mockReset().mockResolvedValue({ locales: [], installedLocales: [] });
      module.start.mockReset().mockImplementation(() => module.__emit('start', null));
      module.stop.mockReset().mockImplementation(() => module.__emit('end', null));
      module.abort.mockReset();
    },
  };
  module.__reset();
  return { ExpoSpeechRecognitionModule: module };
});

// expo-audio. The recorder is one shared fake so tests can read `uri`, drive
// `__state` (what useAudioRecorderState returns) and assert on calls.
jest.mock('expo-audio', () => {
  const recorder = {
    uri: null,
    prepareToRecordAsync: jest.fn(),
    record: jest.fn(),
    stop: jest.fn(),
  };
  const audio = {
    __recorder: recorder,
    __state: { isRecording: false, durationMillis: 0, metering: undefined, canRecord: true, url: null, mediaServicesDidReset: false },
    RecordingPresets: { HIGH_QUALITY: { extension: '.m4a' } },
    AudioModule: { requestRecordingPermissionsAsync: jest.fn() },
    setAudioModeAsync: jest.fn(),
    useAudioRecorder: () => recorder,
    useAudioRecorderState: () => audio.__state,
    __reset: () => {
      recorder.uri = 'file:///cache/recording.m4a';
      recorder.prepareToRecordAsync.mockReset().mockResolvedValue(undefined);
      recorder.record.mockReset();
      recorder.stop.mockReset().mockResolvedValue(undefined);
      audio.AudioModule.requestRecordingPermissionsAsync
        .mockReset()
        .mockResolvedValue({ granted: true, canAskAgain: true, status: 'granted', expires: 'never' });
      audio.setAudioModeAsync.mockReset().mockResolvedValue(undefined);
      // Mutated in place: `import * as` in a test copies the namespace, so a reassignment wouldn't reach it.
      Object.assign(audio.__state, { isRecording: false, durationMillis: 0, metering: undefined, canRecord: true, url: null, mediaServicesDidReset: false });
    },
  };
  audio.__reset();
  return audio;
});

// expo-file-system: records which files were deleted, without touching a disk.
jest.mock('expo-file-system', () => {
  const deleted = [];
  class File {
    constructor(uri) {
      this.uri = uri;
    }
    delete() {
      deleted.push(this.uri);
    }
  }
  return { File, __deleted: deleted };
});
