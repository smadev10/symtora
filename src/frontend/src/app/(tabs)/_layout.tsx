import { Redirect, Tabs } from 'expo-router';

import BottomNav from '@/components/BottomNav';
import { useSession } from '@/state/session/Provider';
import { useSettings } from '@/state/settings/Provider';

/**
 * The screens that show the bottom nav. `emergency` and `assessment` are in
 * the group with `href: null` — they keep the bar visible without being tabs,
 * which is exactly what the old `showBottomNav` exclusion list encoded.
 */
export default function TabsLayout() {
  const { session } = useSession();
  const { settings } = useSettings();

  if (session.status !== 'authenticated') return <Redirect href="/login" />;
  if (!settings.consentAccepted) return <Redirect href="/onboarding" />;

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={() => <BottomNav />}>
      <Tabs.Screen name="start" />
      <Tabs.Screen name="patterns" />
      <Tabs.Screen name="new" />
      <Tabs.Screen name="data" />
      <Tabs.Screen name="emergency" options={{ href: null }} />
      <Tabs.Screen name="assessment/[id]" options={{ href: null }} />
    </Tabs>
  );
}
