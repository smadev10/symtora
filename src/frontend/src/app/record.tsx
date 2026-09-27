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
const PULSE_SIZE = 96;
const BUTTON_SIZE = 76;

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
    bottom: { alignItems: 'center', gap: 12, marginTop: 'auto', paddingBottom: 8 },
    // The rings grow to 1.6x while fading, so leave room for them around the button.
    pulseWrap: {
      width: PULSE_SIZE,
      height: PULSE_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 18,
    },
    pulseLayer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
    button: {
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      borderRadius: BUTTON_SIZE / 2,
      backgroundColor: '#e2001a',
      borderWidth: 4,
      borderColor: 'rgba(255,255,255,0.9)',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.35,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
    },
    stopLabel: { color: '#fff', fontSize: 15, fontWeight: '700' },
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
            {/* Layered behind the button, not stacked above it. */}
            <View style={s.pulseLayer} pointerEvents="none">
              <PulseRing size={PULSE_SIZE} />
            </View>
            <Pressable
              onPress={stop}
              style={({ pressed }) => [s.button, pressed && { transform: [{ scale: 0.94 }] }]}
              accessibilityRole="button"
              accessibilityLabel={t.record.stopLabel}
            >
              <IconStop size={28} />
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
