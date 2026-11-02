import { Redirect, Tabs } from 'expo-router';

import BottomNav from '@/components/BottomNav';
import { useSession } from '@/state/session/Provider';
import { useSettings } from '@/state/settings/Provider';

/**
 * The screens that show the bottom nav. `assessment` is in the group so it
 * keeps the bar visible; BottomNav draws its own fixed buttons, so it never
 * gets one. Not `href: null`: since expo-router 58 a
 * hidden tab redirects to the first visible one as soon as it is focused.
 */
export default function TabsLayout() {
  const { session } = useSession();
  const { settings } = useSettings();

  if (session.status !== 'authenticated') return <Redirect href="/login" />;
  if (!settings.consentAccepted) return <Redirect href="/onboarding" />;

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={() => <BottomNav />}>
      <Tabs.Screen name="start" />
      <Tabs.Screen name="new" />
      <Tabs.Screen name="data" />
      <Tabs.Screen name="emergency" />
      <Tabs.Screen name="assessment/[id]" />
    </Tabs>
  );
}
