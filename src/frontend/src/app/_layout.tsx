import {
  OpenSans_400Regular,
  OpenSans_500Medium,
  OpenSans_600SemiBold,
  OpenSans_700Bold,
  OpenSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/open-sans';
import { Stack } from 'expo-router';
import { useLayoutEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { setTokenGetter } from '@/api/client';
import { LoadingState } from '@/components/states';
import { EntriesProvider } from '@/state/entries/Provider';
import { SessionProvider, useSession } from '@/state/session/Provider';
import { SettingsProvider, useSettings } from '@/state/settings/Provider';
import { tokens } from '@/theme/tokens';

/**
 * Hands the API client a way to read the current token without `api/` having
 * to import `state/`.
 */
function TokenBridge() {
  const { session } = useSession();

  // A layout effect runs before any passive effect in the same commit, so the
  // client already has the new token when EntriesProvider loads on login.
  useLayoutEffect(() => {
    setTokenGetter(() => (session.status === 'authenticated' ? session.token : null));
  }, [session]);

  return null;
}

/** Entries belong to whoever is signed in; nothing loads before that. */
function SessionEntries({ children }: { children: ReactNode }) {
  const { session } = useSession();
  return (
    <EntriesProvider sessionKey={session.status === 'authenticated' ? session.token : null}>
      {children}
    </EntriesProvider>
  );
}

function RootNavigator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { settings, hydrated } = useSettings();
  const { session } = useSession();
  const tk = tokens(settings.theme);

  // Holding here keeps any screen from redirecting on a guess before the
  // persisted session and settings have actually been read.
  if (!fontsLoaded || !hydrated || session.status === 'restoring') {
    return (
      <View style={{ flex: 1, backgroundColor: tk.screenBg, justifyContent: 'center' }}>
        <LoadingState />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: tk.screenBg },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="record" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    OpenSans_400Regular,
    OpenSans_500Medium,
    OpenSans_600SemiBold,
    OpenSans_700Bold,
    OpenSans_800ExtraBold,
  });

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <SessionProvider>
          <TokenBridge />
          <SessionEntries>
            <RootNavigator fontsLoaded={fontsLoaded} />
          </SessionEntries>
        </SessionProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
