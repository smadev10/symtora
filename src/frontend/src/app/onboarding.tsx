import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/components/AppText';
import Button from '@/components/Button';
import Screen from '@/components/Screen';
import ScreenHeader from '@/components/ScreenHeader';
import { IconCheck } from '@/components/icons';
import { TR } from '@/i18n/translations';
import { useSession } from '@/state/session/Provider';
import { useSettings } from '@/state/settings/Provider';
import { authStyles } from '@/theme/authStyles';
import { cardShadow, lh, ls, sharedStyles, themedStyles } from '@/theme/styles';

const styles = themedStyles((tk) =>
  StyleSheet.create({
    headline: {
      color: tk.textStrong,
      fontSize: 30,
      fontWeight: '800',
      letterSpacing: ls(30, -0.01),
      marginTop: 22,
      marginBottom: 6,
      lineHeight: lh(30, 1.15),
    },
    subtitle: { color: tk.textMuted, fontSize: 14, lineHeight: lh(14, 1.5), marginBottom: 22 },
    list: { gap: 12, marginBottom: 22 },
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 14,
      backgroundColor: tk.card,
      borderRadius: 18,
      padding: 16,
      ...cardShadow,
    },
    num: {
      width: 26,
      height: 26,
      borderRadius: 8,
      backgroundColor: tk.badgeBg,
      color: tk.textNormal,
      fontWeight: '700',
      fontSize: 13,
      textAlign: 'center',
      textAlignVertical: 'center',
      overflow: 'hidden',
    },
    cardTitle: { color: tk.textStrong, fontWeight: '700', fontSize: 14.5, marginBottom: 3 },
    cardBody: { color: tk.textMuted, fontSize: 12.5, lineHeight: lh(12.5, 1.45) },
  }),
);

export default function OnboardingScreen() {
  const router = useRouter();
  const { settings, acceptConsent } = useSettings();
  const { session } = useSession();

  const t = TR[settings.lang];
  const s = styles(settings.theme);
  const a = authStyles(settings.theme);
  const shared = sharedStyles(settings.theme);

  const [consent, setConsent] = useState(false);

  if (session.status !== 'authenticated') return <Redirect href="/login" />;
  if (settings.consentAccepted) return <Redirect href="/start" />;

  const steps = [
    { n: 1, title: t.on.step1Title, body: t.on.step1Body },
    { n: 2, title: t.on.step2Title, body: t.on.step2Body },
    { n: 3, title: t.on.step3Title, body: t.on.step3Body },
  ];

  const start = () => {
    acceptConsent();
    router.replace('/start');
  };

  return (
    <Screen padded>
      <ScreenHeader brand />

      <AppText style={s.headline}>{t.on.headline}</AppText>
      <AppText style={s.subtitle}>{t.on.subtitle}</AppText>

      <View style={s.list}>
        {steps.map((step) => (
          <View key={step.n} style={s.card}>
            <AppText style={s.num}>{step.n}</AppText>
            <View style={{ flex: 1 }}>
              <AppText style={s.cardTitle}>{step.title}</AppText>
              <AppText style={s.cardBody}>{step.body}</AppText>
            </View>
          </View>
        ))}
      </View>

      <Pressable onPress={() => setConsent((v) => !v)} style={a.consentRow}>
        <View style={[a.checkbox, consent && a.checkboxChecked]}>
          {consent ? <IconCheck color={settings.theme === 'dark' ? '#142939' : '#fff'} /> : null}
        </View>
        <AppText style={[shared.textMuted, { flex: 1 }]}>{t.on.consent}</AppText>
      </Pressable>

      <Button label={t.on.cta} onPress={start} disabled={!consent} style={{ marginTop: 6 }} />

      <AppText style={a.footnote}>{t.on.emergencyNote}</AppText>
    </Screen>
  );
}
