import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import Analysing from '@/components/Analysing';
import { PulseRing, WaveBar } from '@/components/AnimatedBits';
import AppText from '@/components/AppText';
import Screen from '@/components/Screen';
import { IconStop } from '@/components/icons';
import { CASE_ORDER } from '@/data/cases';
import { TR } from '@/i18n/translations';
import { useSettings } from '@/state/settings/Provider';
import { ls, sharedStyles, themedStyles } from '@/theme/styles';

const ANALYSE_MS = 1500;

/** Deterministic bar shapes, matching the prototype's fake waveform. */
const WAVE_BARS = Array.from({ length: 20 }, (_, i) => ({
  height: 14 + ((i * 37) % 26),
  color: i % 3 === 0 ? '#fff' : '#b9dcf7',
  delay: i * 40,
  duration: (0.6 + (i % 5) * 0.08) * 1000,
}));

const styles = themedStyles(() =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#0f2230', alignItems: 'center', padding: 20, paddingTop: 40 },
    timer: {
      color: '#fff',
      fontSize: 46,
      fontWeight: '700',
      marginTop: 22,
      marginBottom: 30,
      letterSpacing: ls(46, -0.02),
    },
    waveRow: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 70 },
    hint: {
      color: 'rgba(255,255,255,.7)',
      fontSize: 12.5,
      textAlign: 'center',
      lineHeight: 18.75,
      marginTop: 26,
      maxWidth: 260,
    },
    bottom: { alignItems: 'center', gap: 10, marginTop: 'auto' },
    pulseWrap: { width: 92, height: 92, alignItems: 'center', justifyContent: 'center' },
    button: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: '#e2001a',
      alignItems: 'center',
      justifyContent: 'center',
    },
    stopLabel: { color: '#fff', fontSize: 14, fontWeight: '700' },
    cancel: { color: 'rgba(255,255,255,.55)', fontSize: 12.5 },
  }),
);

const twoDigits = (n: number) => String(n).padStart(2, '0');

export default function RecordScreen() {
  const router = useRouter();
  const { settings } = useSettings();

  const t = TR[settings.lang];
  const s = styles(settings.theme);
  const shared = sharedStyles(settings.theme);

  const [seconds, setSeconds] = useState(0);
  const [analysing, setAnalysing] = useState(false);
  const analyseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (analysing) return undefined;
    const tick = setInterval(() => setSeconds((v) => v + 1), 1000);
    return () => clearInterval(tick);
  }, [analysing]);

  useEffect(
    () => () => {
      if (analyseTimer.current) clearTimeout(analyseTimer.current);
    },
    [],
  );

  const stop = () => {
    setAnalysing(true);
    analyseTimer.current = setTimeout(() => {
      // Transcription is still unimplemented, so the demo lands on the
      // default case exactly as the prototype did.
      router.replace(`/assessment/${CASE_ORDER[0]}`);
    }, ANALYSE_MS);
  };

  if (analysing) {
    return (
      <Screen scroll={false}>
        <Analysing />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} darkHeader style={{ backgroundColor: '#0f2230' }}>
      <View style={s.screen}>
        <View style={[shared.rowBetween, { width: '100%' }]}>
          <AppText style={shared.kicker}>{t.record.kicker}</AppText>
          <AppText style={shared.badgeDark}>{t.badgeLocal}</AppText>
        </View>

        <AppText style={s.timer}>
          {twoDigits(Math.floor(seconds / 60))}:{twoDigits(seconds % 60)}
        </AppText>

        <View style={s.waveRow}>
          {WAVE_BARS.map((bar, i) => (
            <WaveBar
              key={i}
              height={bar.height}
              color={bar.color}
              delay={bar.delay}
              duration={bar.duration}
            />
          ))}
        </View>

        <AppText style={s.hint}>{t.record.hint}</AppText>

        <View style={s.bottom}>
          <View style={s.pulseWrap}>
            <PulseRing size={92} />
            <Pressable onPress={stop} style={s.button} accessibilityRole="button">
              <IconStop />
            </Pressable>
          </View>
          <AppText style={s.stopLabel}>{t.record.stopLabel}</AppText>
          <Pressable onPress={() => router.back()} accessibilityRole="button">
            <AppText style={s.cancel}>{t.record.cancel}</AppText>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
