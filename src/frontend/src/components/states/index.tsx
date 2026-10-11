import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ERROR_KEYS, isRetryableKey } from '@/api/errors';
import { LoadingBar, Spinner } from '@/components/AnimatedBits';
import AppText from '@/components/AppText';
import { IconInfo, IconWarning } from '@/components/icons';
import { translate } from '@/i18n/translate';
import { TR } from '@/i18n/translations';
import { useSettings } from '@/state/settings/Provider';
import type { EntriesStatus } from '@/state/entries/reducer';
import { themedStyles } from '@/theme/styles';
import { tokens } from '@/theme/tokens';

const styles = themedStyles((tk) =>
  StyleSheet.create({
    wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 36, gap: 8 },
    title: { color: tk.textStrong, fontWeight: '700', fontSize: 14 },
    body: { color: tk.textMuted, fontSize: 12.5, textAlign: 'center', maxWidth: 280 },
    retry: {
      marginTop: 8,
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: tk.divider,
    },
    retryText: { color: tk.textStrong, fontWeight: '700', fontSize: 13 },
    barWrap: { alignSelf: 'stretch', paddingHorizontal: 24, marginBottom: 6 },
    note: { color: tk.textFaint, fontSize: 11.5, textAlign: 'center', maxWidth: 280, marginTop: 4 },
  }),
);

function useChrome() {
  const { settings } = useSettings();
  return { t: TR[settings.lang], lang: settings.lang, s: styles(settings.theme), tk: tokens(settings.theme) };
}

export function LoadingState() {
  const { t, s, tk } = useChrome();

  return (
    <View style={s.wrap}>
      <Spinner size={32} color={tk.accent} trackColor={tk.divider} />
      <AppText style={s.title}>{t.states.loading}</AppText>
    </View>
  );
}

export function EmptyState({ title, body }: { title?: string; body?: string }) {
  const { t, s, tk } = useChrome();

  return (
    <View style={s.wrap}>
      <IconInfo color={tk.textFaint} />
      <AppText style={s.title}>{title ?? t.states.emptyTitle}</AppText>
      <AppText style={s.body}>{body ?? t.states.emptyBody}</AppText>
    </View>
  );
}

export function ErrorState({ errorKey, onRetry }: { errorKey: string; onRetry?: () => void }) {
  const { t, lang, s } = useChrome();

  return (
    <View style={s.wrap}>
      <IconWarning color="#b9770e" />
      <AppText style={s.body}>{translate(lang, errorKey)}</AppText>
      {onRetry ? (
        <Pressable onPress={onRetry} style={s.retry} accessibilityRole="button">
          <AppText style={s.retryText}>{t.states.retry}</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function OfflineState({ onRetry }: { onRetry?: () => void }) {
  const { t, s, tk } = useChrome();

  return (
    <View style={s.wrap}>
      <IconInfo color={tk.textFaint} />
      <AppText style={s.title}>{t.states.offlineTitle}</AppText>
      <AppText style={s.body}>{t.states.offlineBody}</AppText>
      {onRetry ? (
        <Pressable onPress={onRetry} style={s.retry} accessibilityRole="button">
          <AppText style={s.retryText}>{t.states.retry}</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Loading bar for a list, with a hint once the first attempt has failed. */
export function ListLoadingState({ retrying = false }: { retrying?: boolean }) {
  const { t, s, tk } = useChrome();

  return (
    <View style={s.wrap}>
      <View style={s.barWrap}>
        <LoadingBar color={tk.accent} trackColor={tk.divider} />
      </View>
      <AppText style={s.title}>{t.states.listLoading}</AppText>
      {retrying ? <AppText style={s.body}>{t.states.listRetrying}</AppText> : null}
    </View>
  );
}

/** A list that could not be loaded and is being retried in the background. */
export function ListFailedState({ errorKey }: { errorKey: string }) {
  const { t, lang, s } = useChrome();

  return (
    <View style={s.wrap}>
      <IconWarning color="#b9770e" />
      <AppText style={[s.title, { textAlign: 'center', maxWidth: 280 }]}>{t.states.listFailedTitle}</AppText>
      <AppText style={s.body}>{translate(lang, errorKey)}</AppText>
      <AppText style={s.note}>{t.states.autoRetryNote}</AppText>
    </View>
  );
}

/** The token was rejected: no amount of retrying helps, the user has to sign in. */
export function SessionExpiredState({ onSignIn }: { onSignIn?: () => void }) {
  const { t, s } = useChrome();

  return (
    <View style={s.wrap}>
      <IconInfo color="#b9770e" />
      <AppText style={s.title}>{t.states.sessionExpiredTitle}</AppText>
      <AppText style={s.body}>{t.states.sessionExpiredBody}</AppText>
      {onSignIn ? (
        <Pressable onPress={onSignIn} style={s.retry} accessibilityRole="button">
          <AppText style={s.retryText}>{t.states.signInAgain}</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Picks the right placeholder for an async list.
 *
 * `hasContent` rather than an item count so a refresh over existing data keeps
 * the data on screen instead of flashing a loading bar. Failures that can clear
 * up by themselves are retried by the provider, so they get no button.
 */
export function AsyncBoundary({
  status,
  errorKey,
  hasContent,
  attempt = 0,
  onRetry,
  onSignIn,
  children,
}: {
  status: EntriesStatus;
  errorKey?: string | null;
  hasContent: boolean;
  /** Which automatic attempt is running; above 0 the loading state says it is retrying. */
  attempt?: number;
  /** Offered only for failures that are not retried automatically. */
  onRetry?: () => void;
  onSignIn?: () => void;
  children: ReactNode;
}) {
  if (hasContent) return <>{children}</>;

  if (status === 'error') {
    const key = errorKey ?? ERROR_KEYS.unknown;
    if (key === ERROR_KEYS.unauthorized) return <SessionExpiredState onSignIn={onSignIn} />;
    if (isRetryableKey(key)) return <ListFailedState errorKey={key} />;
    return <ErrorState errorKey={key} onRetry={onRetry} />;
  }

  if (status === 'idle' || status === 'loading') return <ListLoadingState retrying={attempt > 0} />;

  return <EmptyState />;
}
