import { StyleSheet, View } from 'react-native';

import { Spinner } from '@/components/AnimatedBits';
import AppText from '@/components/AppText';
import { TR } from '@/i18n/translations';
import { useSettings } from '@/state/settings/Provider';
import { sharedStyles, themedStyles } from '@/theme/styles';
import { tokens } from '@/theme/tokens';

const styles = themedStyles((tk) =>
  StyleSheet.create({
    screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    text: { color: tk.textStrong, fontWeight: '700', fontSize: 14 },
    sub: { color: tk.textMuted, fontSize: 12.5, marginBottom: 10 },
  }),
);

/**
 * Shown while an entry is being analysed.
 *
 * This was a `loading` screen in the old state machine. It is a state of the
 * analyse action, not a destination, so it lives inside the screens that
 * trigger it and cannot be navigated back into.
 */
export default function Analysing() {
  const { settings } = useSettings();
  const t = TR[settings.lang];
  const s = styles(settings.theme);
  const shared = sharedStyles(settings.theme);
  const tk = tokens(settings.theme);

  return (
    <View style={s.screen}>
      <Spinner size={36} color={tk.accent} trackColor={tk.divider} />
      <AppText style={s.text}>{t.loading.text}</AppText>
      <AppText style={s.sub}>{t.loading.subtitle}</AppText>
      <AppText style={shared.badge}>{t.badgeLocal}</AppText>
    </View>
  );
}
