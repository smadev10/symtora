import {
  OpenSans_400Regular,
  OpenSans_500Medium,
  OpenSans_600SemiBold,
  OpenSans_700Bold,
  OpenSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/open-sans';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
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

  useEffect(() => {
    setTokenGetter(() => (session.status === 'authenticated' ? session.token : null));
  }, [session]);

  return null;
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
          <EntriesProvider>
            <RootNavigator fontsLoaded={fontsLoaded} />
          </EntriesProvider>
        </SessionProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
