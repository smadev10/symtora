import { Linking, Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/components/AppText';
import Screen from '@/components/Screen';
import { IconPhone } from '@/components/icons';
import { EMERGENCY_NUMBERS } from '@/data/cases';
import { TR } from '@/i18n/translations';
import { useSettings } from '@/state/settings/Provider';
import { cardShadow, lh, ls, sharedStyles, themedStyles } from '@/theme/styles';

const styles = themedStyles((tk) =>
  StyleSheet.create({
    header: {
      backgroundColor: '#5c0f18',
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
      padding: 18,
      paddingTop: 20,
      paddingBottom: 26,
    },
    kicker: { color: 'rgba(255,255,255,.6)', fontSize: 11, fontWeight: '700', letterSpacing: ls(11, 0.12) },
    headline: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 14 },
    sub: { color: 'rgba(255,255,255,.75)', fontSize: 12.5, marginTop: 8, lineHeight: lh(12.5, 1.5) },
    callCol: { gap: 10, marginTop: 16, marginBottom: 4 },
    callCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: tk.card,
      borderRadius: 18,
      padding: 14,
      ...cardShadow,
    },
    callNumber: { color: tk.textStrong, fontSize: 26, fontWeight: '700', letterSpacing: ls(26, -0.02) },
    callTitle: { color: tk.textStrong, fontWeight: '700', fontSize: 14 },
    callRoundBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#e2001a',
      alignItems: 'center',
      justifyContent: 'center',
    },
    warnRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
    warnDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#c62828', marginTop: 7 },
    warnText: { flex: 1, color: tk.textNormal, fontSize: 13 },
  }),
);

export default function EmergencyScreen() {
  const { settings } = useSettings();

  const t = TR[settings.lang];
  const s = styles(settings.theme);
  const shared = sharedStyles(settings.theme);

  return (
    <Screen darkHeader>
      <View style={s.header}>
        <AppText style={s.kicker}>{t.emergency.kicker}</AppText>
        <AppText style={s.headline}>{t.emergency.headline}</AppText>
        <AppText style={s.sub}>{t.emergency.subhead}</AppText>
      </View>

      <View style={shared.screenPad}>
        <View style={s.callCol}>
          {EMERGENCY_NUMBERS.map((contact, i) => (
            <View key={contact.number} style={s.callCard}>
              <AppText style={s.callNumber}>{contact.number}</AppText>
              <View style={{ flex: 1 }}>
                <AppText style={s.callTitle}>{t.emergencyContacts[i].label}</AppText>
                <AppText style={shared.rowSubtitle}>{t.emergencyContacts[i].sub}</AppText>
              </View>
              <Pressable
                onPress={() => void Linking.openURL(contact.tel)}
                style={s.callRoundBtn}
                accessibilityRole="button"
                accessibilityLabel={`${t.emergencyContacts[i].label} ${contact.number}`}
              >
                <IconPhone color="#fff" />
              </Pressable>
            </View>
          ))}
        </View>

        <AppText style={shared.sectionTitleTop}>{t.emergency.warningTitle}</AppText>
        <View style={shared.card}>
          {t.emergency.warnings.map((warning) => (
            <View key={warning} style={s.warnRow}>
              <View style={s.warnDot} />
              <AppText style={s.warnText}>{warning}</AppText>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}
