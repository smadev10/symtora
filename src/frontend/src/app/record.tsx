import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { PulseRing, WaveBar } from '@/components/AnimatedBits';
import AppText from '@/components/AppText';
import Button from '@/components/Button';
import Screen from '@/components/Screen';
import { IconStop, IconWarning } from '@/components/icons';
import { TR } from '@/i18n/translations';
import { handOffTranscript } from '@/state/dictation/handoff';
import { useDictation } from '@/state/dictation/useDictation';
import { useSettings } from '@/state/settings/Provider';
import { lh, ls, sharedStyles, themedStyles } from '@/theme/styles';

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
    transcript: {
      color: '#fff',
      fontSize: 15,
      lineHeight: lh(15, 1.5),
      textAlign: 'center',
      marginTop: 18,
      maxWidth: 320,
    },
    interim: { color: 'rgba(255,255,255,.55)' },
    placeholder: { color: 'rgba(255,255,255,.45)', fontStyle: 'italic' },
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
    note: { color: 'rgba(255,255,255,.45)', fontSize: 11, textAlign: 'center' },
    cancel: { color: 'rgba(255,255,255,.55)', fontSize: 12.5 },
    errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, maxWidth: 300 },
    errorTitle: { color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center' },
    errorBody: { color: 'rgba(255,255,255,.7)', fontSize: 13, lineHeight: lh(13, 1.5), textAlign: 'center' },
    errorActions: { alignSelf: 'stretch', gap: 10, marginTop: 14 },
  }),
);

const twoDigits = (n: number) => String(n).padStart(2, '0');

export default function RecordScreen() {
  const router = useRouter();
  const { settings } = useSettings();

  const t = TR[settings.lang];
  const s = styles(settings.theme);
  const shared = sharedStyles(settings.theme);

  const { state, level, start, stop, abort } = useDictation();
  const [seconds, setSeconds] = useState(0);
  const listening = state.status === 'listening';

  useEffect(() => {
    void start(settings.lang);
    // Only on mount: a language switch mid-recording would restart and lose the audio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!listening) return undefined;
    const tick = setInterval(() => setSeconds((v) => v + 1), 1000);
    return () => clearInterval(tick);
  }, [listening]);

  // Recognition has fully ended: hand the text to the new-entry screen for review.
  useEffect(() => {
    if (state.status !== 'done') return;
    handOffTranscript(state.finalText);
    router.dismissTo('/new');
  }, [state.status, state.finalText, router]);

  const retry = () => {
    setSeconds(0);
    void start(settings.lang);
  };

  const cancel = () => {
    abort();
    router.back();
  };

  if (state.status === 'error' && state.error) {
    const copy = t.record.errors[state.error];
    const canRetry = state.error === 'noSpeech' || state.error === 'unknown';

    return (
      <Screen scroll={false} darkHeader style={{ backgroundColor: '#0f2230' }}>
        <View style={s.screen}>
          <View style={s.errorWrap}>
            <IconWarning color="#f2a33c" />
            <AppText style={s.errorTitle}>{copy.title}</AppText>
            <AppText style={s.errorBody}>{copy.body}</AppText>
            <View style={s.errorActions}>
              {state.error === 'permissionDenied' ? (
                <Button label={t.record.openSettings} onPress={() => void Linking.openSettings()} />
              ) : canRetry ? (
                <Button label={t.record.retry} onPress={retry} />
              ) : null}
              <Button
                label={t.record.typeInstead}
                variant="secondary"
                onPress={() => router.dismissTo('/new')}
              />
            </View>
          </View>
          <Pressable onPress={cancel} accessibilityRole="button">
            <AppText style={s.cancel}>{t.record.cancel}</AppText>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const heard = state.finalText;
  const live = state.interim;

  return (
    <Screen scroll={false} darkHeader style={{ backgroundColor: '#0f2230' }}>
      <View style={s.screen}>
        <View style={[shared.rowBetween, { width: '100%' }]}>
          <AppText style={shared.kicker}>{t.record.kicker}</AppText>
        </View>

        <AppText style={s.timer}>
          {twoDigits(Math.floor(seconds / 60))}:{twoDigits(seconds % 60)}
        </AppText>

        <View style={[s.waveRow, { transform: [{ scaleY: listening ? 0.45 + 0.55 * level : 0.3 }] }]}>
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

        {heard || live ? (
          <AppText style={s.transcript} testID="record-transcript">
            {heard}
            {heard && live ? ' ' : ''}
            {live ? <AppText style={[s.transcript, s.interim]}>{live}</AppText> : null}
          </AppText>
        ) : (
          <>
            <AppText style={s.hint}>{t.record.hint}</AppText>
            <AppText style={[s.transcript, s.placeholder]}>
              {listening ? t.record.listening : t.record.starting}
            </AppText>
          </>
        )}

        <View style={s.bottom}>
          <View style={s.pulseWrap}>
            {/* Layered behind the button, not stacked above it. */}
            {listening ? (
              <View style={s.pulseLayer} pointerEvents="none">
                <PulseRing size={PULSE_SIZE} />
              </View>
            ) : null}
            <Pressable
              onPress={stop}
              disabled={!listening}
              style={({ pressed }) => [
                s.button,
                !listening && { opacity: 0.5 },
                pressed && { transform: [{ scale: 0.94 }] },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t.record.stopLabel}
              accessibilityState={{ disabled: !listening }}
            >
              <IconStop size={28} />
            </Pressable>
          </View>
          <AppText style={s.stopLabel}>{t.record.stopLabel}</AppText>
          <AppText style={s.note}>{t.record.onDeviceNote}</AppText>
          <Pressable onPress={cancel} accessibilityRole="button">
            <AppText style={s.cancel}>{t.record.cancel}</AppText>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
