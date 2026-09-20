import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ERROR_KEYS } from '@/api/errors';
import { Spinner } from '@/components/AnimatedBits';
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

/**
 * Picks the right placeholder for an async screen.
 *
 * `hasContent` rather than an item count so a refresh over existing data keeps
 * the data on screen instead of flashing a spinner.
 */
export function AsyncBoundary({
  status,
  errorKey,
  hasContent,
  onRetry,
  children,
}: {
  status: EntriesStatus;
  errorKey?: string | null;
  hasContent: boolean;
  onRetry?: () => void;
  children: ReactNode;
}) {
  if (hasContent) return <>{children}</>;

  if (status === 'error') {
    // Offline is inferred from a network failure — there is no connectivity
    // library, so this detects "the request never reached the server".
    return errorKey === ERROR_KEYS.network ? (
      <OfflineState onRetry={onRetry} />
    ) : (
      <ErrorState errorKey={errorKey ?? ERROR_KEYS.unknown} onRetry={onRetry} />
    );
  }

  if (status === 'idle' || status === 'loading') return <LoadingState />;

  return <EmptyState />;
}
