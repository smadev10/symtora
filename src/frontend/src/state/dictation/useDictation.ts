import { useState } from 'react';

import { hasOnDeviceRecognition, useOnDeviceDictation } from './useOnDeviceDictation';
import { useServerDictation } from './useServerDictation';

export type DictationEngine = 'device' | 'server';

/**
 * Picks how to dictate, once per mount: on-device recognition when the native
 * module is installed (development builds) because audio never leaves the
 * phone and text appears live; otherwise the self-hosted server (Expo Go, web).
 * Both hooks are always called so the hook order never changes.
 */
export function useDictation() {
  const [engine] = useState<DictationEngine>(() => (hasOnDeviceRecognition() ? 'device' : 'server'));
  const device = useOnDeviceDictation(engine === 'device');
  const server = useServerDictation(engine === 'server');
  return { ...(engine === 'device' ? device : server), engine };
}
