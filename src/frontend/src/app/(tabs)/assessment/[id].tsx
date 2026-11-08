import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import Analysing from '@/components/Analysing';
import AppText from '@/components/AppText';
import Button from '@/components/Button';
import Screen from '@/components/Screen';
import ScreenHeader from '@/components/ScreenHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { IconCheck, IconWarning } from '@/components/icons';
import { ERROR_KEYS, isApiError } from '@/api/errors';
import type { Probability } from '@/data/cases';
import { TR } from '@/i18n/translations';
import { apiEntriesRepository } from '@/repositories/entriesRepository';
import type { AssessmentView } from '@/repositories/entryMapping';
import { useEntries } from '@/state/entries/Provider';
import { useSettings } from '@/state/settings/Provider';
import { lh, sharedStyles, themedStyles } from '@/theme/styles';
import { tokens, type ThemeTokens } from '@/theme/tokens';

/** Analysis runs on a self-hosted model; the API asks clients to poll. */
const POLL_INTERVAL_MS = 2_000;
/** After this the entry is shown as failed rather than spinning forever. */
const POLL_LIMIT_MS = 180_000;

/**
 * Cause border follows the cause's probability so it always agrees with its pill.
 * Green is deliberately absent: on a medical screen it reads as "all clear".
 */
function causeBorder(prob: Probability, theme: 'light' | 'dark', tk: ThemeTokens) {
  if (prob === 'high') return theme === 'dark' ? '#b9dcf7' : '#142939';
  if (prob === 'mid') return theme === 'dark' ? '#e0b060' : '#e08a2e';
  return tk.textMuted;
}

/**
 * Urgency tag on the navy card. It must never look reassuring when the advice is to
 * seek help, so it follows the urgency rather than a fixed green.
 */
const URGENCY_PILL = {
  low: { color: '#227a44', backgroundColor: '#c9ecd4' },
  mid: { color: '#8a5a08', backgroundColor: '#fbe3b8' },
  high: { color: '#c62828', backgroundColor: '#fdeaea' },
} as const;

function probPill(prob: Probability, tk: ThemeTokens) {
  if (prob === 'high') return { bg: '#dbe9f5', fg: '#142939' };
  if (prob === 'mid') return { bg: '#fbe3b8', fg: '#8a5a08' };
  return { bg: tk.inset, fg: tk.textMuted };
}

const styles = themedStyles((tk) =>
  StyleSheet.create({
    navyCard: { backgroundColor: '#142939', borderRadius: 19, padding: 16, marginBottom: 6 },
    navyKicker: {
      color: 'rgba(255,255,255,.55)',
      fontSize: 10.5,
      fontWeight: '700',
      letterSpacing: 1.05,
      marginBottom: 6,
    },
    urgencyValue: { color: '#fff', fontWeight: '800', fontSize: 26 },
    urgencyPill: {
      fontSize: 11,
      fontWeight: '700',
      paddingVertical: 4,
      paddingHorizontal: 9,
      borderRadius: 20,
      overflow: 'hidden',
    },
    urgencyDesc: {
      color: 'rgba(255,255,255,.7)',
      fontSize: 12.5,
      marginTop: 8,
      lineHeight: lh(12.5, 1.5),
    },
    causeBox: { borderLeftWidth: 3, backgroundColor: tk.inset, borderRadius: 12, padding: 14 },
    causeTitle: { color: tk.textStrong, fontSize: 13.5, fontWeight: '700', flexShrink: 1 },
    causeDesc: { color: tk.textMuted, fontSize: 12, marginTop: 3, lineHeight: lh(12, 1.4) },
    causePill: {
      fontSize: 11,
      fontWeight: '700',
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 20,
      overflow: 'hidden',
    },
    rawText: { color: tk.textNormal, fontSize: 13, lineHeight: lh(13, 1.6), marginTop: 10 },
    stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
    disclaimer: {
      flexDirection: 'row',
      backgroundColor: '#fdf4d8',
      borderWidth: 1,
      borderColor: '#eddc9c',
      borderRadius: 14,
      padding: 14,
      gap: 10,
      alignItems: 'flex-start',
      marginTop: 8,
      marginBottom: 18,
    },
    disclaimerText: { flex: 1, color: '#7a5d0a', fontSize: 12, lineHeight: lh(12, 1.5) },
  }),
);

type LoadState =
  | { kind: 'loading' }
  | { kind: 'pending' }
  | { kind: 'missing' }
  | { kind: 'error'; errorKey: string }
  | { kind: 'ready'; view: AssessmentView };

export default function AssessmentScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { settings } = useSettings();
  const { reload } = useEntries();

  const t = TR[settings.lang];
  const s = styles(settings.theme);
  const shared = sharedStyles(settings.theme);
  const tk = tokens(settings.theme);

  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  /** Bumped by the retry button to restart loading. */
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let sawPending = false;
    const startedAt = Date.now();
    setState({ kind: 'loading' });

    const poll = async () => {
      try {
        const view = await apiEntriesRepository.get(settings.lang, id ?? '');
        if (cancelled) return;

        if (!view) {
          setState({ kind: 'missing' });
          return;
        }

        if (view.status === 'Pending') {
          if (Date.now() - startedAt < POLL_LIMIT_MS) {
            sawPending = true;
            setState({ kind: 'pending' });
            timer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
            return;
          }
          setState({ kind: 'ready', view: { ...view, status: 'Failed' } });
          return;
        }

        setState({ kind: 'ready', view });
        // The home list still shows this entry as pending.
        if (sawPending) void reload();
      } catch (error) {
        if (cancelled) return;
        setState({
          kind: 'error',
          errorKey: isApiError(error) ? error.messageKey : ERROR_KEYS.unknown,
        });
      }
    };

    void poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id, settings.lang, attempt, reload]);

  const back = () => router.navigate('/start');

  if (state.kind === 'pending') {
    return (
      <Screen scroll={false}>
        <Analysing />
      </Screen>
    );
  }

  if (state.kind !== 'ready') {
    return (
      <Screen padded>
        <ScreenHeader onBack={back} />
        {state.kind === 'loading' ? <LoadingState /> : null}
        {/* Reachable from a deep link such as symtora://assessment/anything. */}
        {state.kind === 'missing' ? <EmptyState /> : null}
        {state.kind === 'error' ? (
          <ErrorState errorKey={state.errorKey} onRetry={() => setAttempt((n) => n + 1)} />
        ) : null}
      </Screen>
    );
  }

  const { view } = state;

  if (view.status === 'Failed' || !view.urgency) {
    return (
      <Screen padded>
        <ScreenHeader onBack={back} />
        <EmptyState title={t.assess.failedTitle} body={t.assess.failedBody} />
        <Button label={t.assess.failedCta} onPress={() => router.replace('/new')} />
      </Screen>
    );
  }

  const urgency = t.urgency[view.urgency];

  return (
    <Screen padded>
      <ScreenHeader onBack={back} />

      <AppText style={shared.pageTitle}>{t.assess.title}</AppText>

      <View style={s.navyCard}>
        <AppText style={s.navyKicker}>{t.assess.urgencyKicker}</AppText>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
          <AppText style={s.urgencyValue}>{urgency.label}</AppText>
          <AppText style={[s.urgencyPill, URGENCY_PILL[view.urgency]]}>{urgency.tag}</AppText>
        </View>
        <AppText style={s.urgencyDesc}>{urgency.desc}</AppText>
      </View>

      {view.causes.length > 0 ? (
        <>
          <AppText style={shared.sectionTitleTop}>{t.assess.causesTitle}</AppText>
          <View style={shared.card}>
            {view.causes.map((cause, i) => {
              const pill = probPill(cause.prob, tk);
              return (
                <View
                  key={`${i}-${cause.label}`}
                  style={[
                    s.causeBox,
                    {
                      borderLeftColor: causeBorder(cause.prob, settings.theme, tk),
                      marginBottom: i < view.causes.length - 1 ? 8 : 0,
                    },
                  ]}
                >
                  <View style={shared.rowBetween}>
                    <AppText style={s.causeTitle}>{cause.label}</AppText>
                    <AppText style={[s.causePill, { color: pill.fg, backgroundColor: pill.bg }]}>
                      {t.probLabels[cause.prob]}
                    </AppText>
                  </View>
                  {cause.desc ? <AppText style={s.causeDesc}>{cause.desc}</AppText> : null}
                </View>
              );
            })}
          </View>
        </>
      ) : null}

      <View style={shared.card}>
        <View style={shared.rowBetween}>
          <AppText style={shared.sectionTitleInCard}>{t.assess.textTitle}</AppText>
          <AppText style={shared.textMutedSmall}>{view.createdLabel}</AppText>
        </View>
        <AppText style={s.rawText}>{view.rawText}</AppText>
      </View>

      {view.steps.length > 0 ? (
        <>
          <AppText style={shared.sectionTitleTop}>{t.assess.stepsTitle}</AppText>
          <View style={shared.card}>
            {view.steps.map((step, i) => (
              <View key={`${i}-${step}`} style={s.stepRow}>
                <IconCheck color={tk.accent} />
                <AppText style={[shared.textNormal, { flex: 1, fontSize: 13 }]}>{step}</AppText>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <View style={s.disclaimer}>
        <IconWarning color="#b9770e" />
        <AppText style={s.disclaimerText}>{t.assess.disclaimer}</AppText>
      </View>

      <Button label={t.assess.save} onPress={back} />
    </Screen>
  );
}
