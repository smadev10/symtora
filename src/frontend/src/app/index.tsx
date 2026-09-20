import { Redirect } from 'expo-router';

import { useSession } from '@/state/session/Provider';
import { useSettings } from '@/state/settings/Provider';

/**
 * The entry redirect. The root layout has already waited for storage, so by
 * the time this renders both answers are known.
 */
export default function Index() {
  const { session } = useSession();
  const { settings } = useSettings();

  if (session.status !== 'authenticated') return <Redirect href="/login" />;
  if (!settings.consentAccepted) return <Redirect href="/onboarding" />;

  return <Redirect href="/start" />;
}
