import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/components/AppText';
import {
  IconHome,
  IconMic,
  IconPhone,
  IconPlus,
  IconSettings,
} from '@/components/icons';
import { TR } from '@/i18n/translations';
import { useSettings } from '@/state/settings/Provider';
import { themedStyles } from '@/theme/styles';
import { tokens } from '@/theme/tokens';

const styles = themedStyles((tk) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: tk.navBg,
      borderTopWidth: 1,
      borderTopColor: tk.divider,
    },
    item: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 4 },
    label: { fontSize: 10, fontWeight: '600' },
    plus: {
      width: 52,
      height: 52,
      borderRadius: 20,
      backgroundColor: tk.accent,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginHorizontal: 6,
      marginTop: -14,
      shadowColor: '#285172',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 14,
      elevation: 4,
    },
  }),
);

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { settings } = useSettings();

  const t = TR[settings.lang];
  const s = styles(settings.theme);
  const tk = tokens(settings.theme);

  const colorFor = (path: string) => (pathname === path ? tk.accent : tk.textMuted);

  return (
    <View style={s.bar}>
      <Pressable onPress={() => router.navigate('/start')} style={s.item} accessibilityRole="button">
        <IconHome color={colorFor('/start')} />
        <AppText style={[s.label, { color: colorFor('/start') }]}>{t.nav.start}</AppText>
      </Pressable>

      <Pressable
        onPress={() => router.navigate('/emergency')}
        style={s.item}
        accessibilityRole="button"
      >
        <IconPhone color={colorFor('/emergency')} />
        <AppText style={[s.label, { color: colorFor('/emergency') }]}>{t.nav.emergency}</AppText>
      </Pressable>

      <Pressable onPress={() => router.navigate('/new')} style={s.plus} accessibilityRole="button">
        <IconPlus color={tk.accentText} />
      </Pressable>

      {/* Recording lives outside the tab group, so this pushes the modal route. */}
      <Pressable onPress={() => router.push('/record')} style={s.item} accessibilityRole="button">
        <IconMic color={colorFor('/record')} size={20} />
        <AppText style={[s.label, { color: colorFor('/record') }]}>{t.nav.speak}</AppText>
      </Pressable>

      <Pressable onPress={() => router.navigate('/data')} style={s.item} accessibilityRole="button">
        <IconSettings color={colorFor('/data')} />
        <AppText style={[s.label, { color: colorFor('/data') }]}>{t.nav.settings}</AppText>
      </Pressable>
    </View>
  );
}
