import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/AppText';
import Button from '@/components/Button';
import Screen from '@/components/Screen';
import ScreenHeader from '@/components/ScreenHeader';
import { EmptyState, LoadingState } from '@/components/states';
import { IconCheck, IconWarning } from '@/components/icons';
import type { DemoCase, Probability } from '@/data/cases';
import { TR } from '@/i18n/translations';
import { demoEntriesRepository } from '@/repositories/entriesRepository';
import { useSettings } from '@/state/settings/Provider';
import { lh, sharedStyles, themedStyles } from '@/theme/styles';
import { tintFor, tokens, type ThemeTokens } from '@/theme/tokens';

const FINDING_BAR_COLORS = {
  light: ['#142939', '#285172', '#7fb2d9'],
  dark: ['#b9dcf7', '#7fb2d9', '#4d7ea3'],
} as const;

const CAUSE_BORDER_COLORS = {
  light: ['#142939', '#e08a2e', '#5aa7d8'],
  dark: ['#b9dcf7', '#e0b060', '#6fcf97'],
} as const;

function probPill(prob: Probability, tk: ThemeTokens) {
  if (prob === 'high') return { bg: '#c9ecd4', fg: '#227a44' };
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
      color: '#227a44',
      backgroundColor: '#c9ecd4',
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
    findingLabel: { color: tk.textStrong, fontSize: 12.5, fontWeight: '600' },
    findingPct: { color: tk.textStrong, fontSize: 12.5, fontWeight: '700' },
    foot: { color: tk.textFaint, fontSize: 10.5, marginTop: 8 },
    causeBox: { borderLeftWidth: 3, backgroundColor: tk.inset, borderRadius: 12, padding: 14 },
    causeTitle: { color: tk.textStrong, fontSize: 13.5, fontWeight: '700' },
    causeDesc: { color: tk.textMuted, fontSize: 12, marginTop: 3, lineHeight: lh(12, 1.4) },
    causePill: {
      fontSize: 11,
      fontWeight: '700',
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 20,
      overflow: 'hidden',
    },
    transcript: { color: tk.textNormal, fontSize: 13, lineHeight: lh(13, 1.9), marginTop: 10 },
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
    twoButtonRow: { flexDirection: 'row', gap: 10 },
  }),
);

export default function AssessmentScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { settings } = useSettings();

  const t = TR[settings.lang];
  const s = styles(settings.theme);
  const shared = sharedStyles(settings.theme);
  const tk = tokens(settings.theme);

  const [entry, setEntry] = useState<DemoCase | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void demoEntriesRepository.get(settings.lang, id ?? '').then((found) => {
      if (cancelled) return;
      setEntry(found);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [id, settings.lang]);

  const back = () => router.navigate('/start');

  if (loading) {
    return (
      <Screen padded>
        <ScreenHeader onBack={back} />
        <LoadingState />
      </Screen>
    );
  }

  // Reachable from a deep link such as symtora://assessment/anything.
  if (!entry) {
    return (
      <Screen padded>
        <ScreenHeader onBack={back} />
        <EmptyState />
      </Screen>
    );
  }

  const findingColors = FINDING_BAR_COLORS[settings.theme];
  const causeColors = CAUSE_BORDER_COLORS[settings.theme];

  return (
    <Screen padded>
      <ScreenHeader onBack={back} />

      <AppText style={shared.pageTitle}>{t.assess.title}</AppText>

      <View style={s.navyCard}>
        <AppText style={s.navyKicker}>{t.assess.urgencyKicker}</AppText>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
          <AppText style={s.urgencyValue}>{entry.urgencyLabel}</AppText>
          <AppText style={s.urgencyPill}>{entry.urgencyTag}</AppText>
        </View>
        <AppText style={s.urgencyDesc}>{entry.urgencyDesc}</AppText>
      </View>

      <AppText style={shared.sectionTitleTop}>{t.assess.findingsTitle}</AppText>
      <View style={shared.card}>
        {entry.findings.map((finding, i) => (
          <View
            key={finding.label}
            style={{ marginBottom: i < entry.findings.length - 1 ? 14 : 0 }}
          >
            <View style={shared.rowBetween}>
              <AppText style={s.findingLabel}>{finding.label}</AppText>
              <AppText style={s.findingPct}>{finding.pct}%</AppText>
            </View>
            <View style={[shared.distTrack, { marginTop: 4 }]}>
              <View
                style={{
                  height: '100%',
                  width: `${finding.pct}%`,
                  backgroundColor: findingColors[i % 3],
                  borderRadius: 4,
                }}
              />
            </View>
          </View>
        ))}
        <AppText style={s.foot}>{t.assess.findingsFoot}</AppText>
      </View>

      <AppText style={shared.sectionTitleTop}>{t.assess.causesTitle}</AppText>
      <View style={shared.card}>
        {entry.causes.map((cause, i) => {
          const pill = probPill(cause.prob, tk);
          return (
            <View
              key={cause.label}
              style={[
                s.causeBox,
                {
                  borderLeftColor: causeColors[i % 3],
                  marginBottom: i < entry.causes.length - 1 ? 8 : 0,
                },
              ]}
            >
              <View style={shared.rowBetween}>
                <AppText style={s.causeTitle}>{cause.label}</AppText>
                <AppText style={[s.causePill, { color: pill.fg, backgroundColor: pill.bg }]}>
                  {t.probLabels[cause.prob]}
                </AppText>
              </View>
              <AppText style={s.causeDesc}>{cause.desc}</AppText>
            </View>
          );
        })}
      </View>

      <View style={shared.card}>
        <View style={shared.rowBetween}>
          <AppText style={shared.sectionTitleInCard}>{t.assess.transcriptTitle}</AppText>
          <AppText style={shared.textMutedSmall}>{t.assess.transcriptMeta}</AppText>
        </View>
        <AppText style={s.transcript}>
          {entry.segments.map((segment, i) => {
            const tint = segment.c ? tintFor(tk, segment.c) : null;
            return (
              <AppText
                key={i}
                style={
                  tint ? { backgroundColor: tint.bg, color: tint.fg, fontWeight: '600' } : undefined
                }
              >
                {segment.t}
              </AppText>
            );
          })}
        </AppText>
        <AppText style={s.foot}>{t.assess.transcriptFoot}</AppText>
      </View>

      <AppText style={shared.sectionTitleTop}>{t.assess.stepsTitle}</AppText>
      <View style={shared.card}>
        {entry.steps.map((step) => (
          <View key={step} style={s.stepRow}>
            <IconCheck color={tk.accent} />
            <AppText style={[shared.textNormal, { flex: 1, fontSize: 13 }]}>{step}</AppText>
          </View>
        ))}
      </View>

      <View style={s.disclaimer}>
        <IconWarning color="#b9770e" />
        <AppText style={s.disclaimerText}>{t.assess.disclaimer}</AppText>
      </View>

      <View style={s.twoButtonRow}>
        <Button label={t.assess.correct} variant="secondary" layout="inline" onPress={back} />
        <Button label={t.assess.save} layout="inline" onPress={back} />
      </View>
    </Screen>
  );
}
