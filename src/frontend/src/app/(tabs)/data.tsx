import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/components/AppText';
import Button from '@/components/Button';
import Screen from '@/components/Screen';
import ScreenHeader from '@/components/ScreenHeader';
import { Avatar, IconChevron, IconDownload, IconMoon, IconStorage, IconSun } from '@/components/icons';
import { LANGS, TR } from '@/i18n/translations';
import { useEntries } from '@/state/entries/Provider';
import { useSession } from '@/state/session/Provider';
import { RETENTIONS, type Retention } from '@/state/settings/reducer';
import { useSettings } from '@/state/settings/Provider';
import { sharedStyles, themedStyles } from '@/theme/styles';
import { tokens } from '@/theme/tokens';

const LANG_NAMES = { de: 'Deutsch', en: 'English', fr: 'Français' } as const;

const RETENTION_KEYS = { 7: 'd7', 30: 'd30', 365: 'd365' } as const;

const styles = themedStyles((tk) =>
  StyleSheet.create({
    optionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    optionCell: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    optionCellRow: {
      flex: 1,
      height: 48,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    storageValue: { color: tk.textStrong, fontSize: 20, fontWeight: '700' },
    dangerText: { color: '#c62828', fontSize: 14, fontWeight: '700' },
    toggleTrack: { width: 46, height: 26, borderRadius: 13, justifyContent: 'center' },
    toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
    sheetOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,.45)',
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    sheet: {
      width: '100%',
      backgroundColor: tk.card,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      padding: 20,
      paddingTop: 14,
      paddingBottom: 30,
    },
    sheetHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: tk.divider,
      alignSelf: 'center',
      marginBottom: 16,
    },
    sheetTitle: { color: tk.textStrong, fontWeight: '800', fontSize: 16, marginBottom: 8 },
  }),
);

export default function DataScreen() {
  const router = useRouter();
  const { settings, setLang, setTheme, setRetention, toggleLocalOnly } = useSettings();
  const { session, signOut } = useSession();
  const { clear } = useEntries();

  const t = TR[settings.lang];
  const s = styles(settings.theme);
  const shared = sharedStyles(settings.theme);
  const tk = tokens(settings.theme);

  const [showDeleteSheet, setShowDeleteSheet] = useState(false);

  const profileName = session.status === 'authenticated' ? session.user.name : '';

  const selectedStyle = (active: boolean) => ({
    backgroundColor: active ? tk.accentSelectedBg : 'transparent',
    borderWidth: 1.5,
    borderColor: active ? tk.accentSelectedBorder : tk.divider,
  });

  const selectedText = (active: boolean) => ({
    color: active ? (settings.theme === 'dark' ? '#fff' : tk.textStrong) : tk.textNormal,
  });

  return (
    <Screen padded>
      <ScreenHeader kicker={t.data.kicker} />
      <AppText style={shared.pageTitle}>{t.data.title}</AppText>

      <View style={shared.card}>
        <View style={shared.rowBetween}>
          <View style={shared.rowStart}>
            <View style={shared.iconBoxLight}>
              <IconStorage color={tk.textNormal} />
            </View>
            <View>
              <AppText style={shared.textStrong}>{t.data.storageCard}</AppText>
              <AppText style={shared.rowSubtitle}>{t.data.storageSubtitle}</AppText>
            </View>
          </View>
          <AppText style={s.storageValue}>{t.data.storageSize}</AppText>
        </View>
      </View>

      <Pressable onPress={() => router.push('/profile')} style={shared.card}>
        <View style={shared.rowBetween}>
          <View style={shared.rowStart}>
            <Avatar size={40} name={profileName} bg={tk.badgeBg} fg={tk.textNormal} />
            <View>
              <AppText style={shared.textStrong}>{profileName}</AppText>
              <AppText style={shared.rowSubtitle}>{t.profile.editLink}</AppText>
            </View>
          </View>
          <IconChevron color={tk.textFaint} />
        </View>
      </Pressable>

      <View style={shared.card}>
        <AppText style={shared.textStrong}>{t.data.appearanceCard}</AppText>
        <AppText style={shared.rowSubtitle}>{t.data.appearanceSubtitle}</AppText>
        <View style={s.optionRow}>
          <Pressable
            onPress={() => setTheme('light')}
            style={[s.optionCellRow, selectedStyle(settings.theme === 'light')]}
          >
            <IconSun color={settings.theme === 'light' ? tk.textStrong : tk.textNormal} />
            <AppText
              style={[
                { fontSize: 13, fontWeight: '700' },
                selectedText(settings.theme === 'light'),
              ]}
            >
              {t.data.light}
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => setTheme('dark')}
            style={[s.optionCellRow, selectedStyle(settings.theme === 'dark')]}
          >
            <IconMoon color={settings.theme === 'dark' ? '#fff' : tk.textNormal} />
            <AppText
              style={[{ fontSize: 13, fontWeight: '700' }, selectedText(settings.theme === 'dark')]}
            >
              {t.data.dark}
            </AppText>
          </Pressable>
        </View>
      </View>

      <View style={shared.card}>
        <AppText style={shared.textStrong}>{t.data.langCard}</AppText>
        <AppText style={shared.rowSubtitle}>{t.data.langSubtitle}</AppText>
        <View style={s.optionRow}>
          {LANGS.map((code) => (
            <Pressable
              key={code}
              onPress={() => setLang(code)}
              style={[s.optionCell, selectedStyle(settings.lang === code)]}
            >
              <AppText
                style={[{ fontSize: 13, fontWeight: '700' }, selectedText(settings.lang === code)]}
              >
                {code.toUpperCase()} · {LANG_NAMES[code]}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={shared.card}>
        <View style={shared.rowBetween}>
          <View style={{ flex: 1 }}>
            <AppText style={shared.textStrong}>{t.data.localOnlyToggle}</AppText>
            <AppText style={shared.rowSubtitle}>{t.data.localOnlySubtitle}</AppText>
          </View>
          <Pressable
            onPress={toggleLocalOnly}
            accessibilityRole="switch"
            accessibilityState={{ checked: settings.localOnly }}
            style={[
              s.toggleTrack,
              { backgroundColor: settings.localOnly ? tk.accent : tk.divider },
            ]}
          >
            <View style={[s.toggleKnob, { marginLeft: settings.localOnly ? 23 : 3 }]} />
          </Pressable>
        </View>
      </View>

      <View style={shared.card}>
        <AppText style={shared.textStrong}>{t.data.retentionCard}</AppText>
        <AppText style={shared.rowSubtitle}>{t.data.retentionSubtitle}</AppText>
        <View style={s.optionRow}>
          {RETENTIONS.map((value: Retention) => (
            <Pressable
              key={value}
              onPress={() => setRetention(value)}
              style={[s.optionCell, selectedStyle(settings.retention === value)]}
            >
              <AppText
                style={[
                  { fontSize: 12.5, fontWeight: '700' },
                  selectedText(settings.retention === value),
                ]}
              >
                {t.retentionLabels[RETENTION_KEYS[value]]}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={shared.card}>
        <View style={shared.rowBetween}>
          <View>
            <AppText style={shared.textStrong}>{t.data.export}</AppText>
            <AppText style={shared.rowSubtitle}>{t.data.exportSubtitle}</AppText>
          </View>
          <IconDownload color={tk.textFaint} />
        </View>
        <View style={shared.divider} />
        <Pressable onPress={() => setShowDeleteSheet(true)} style={shared.rowBetween}>
          <AppText style={s.dangerText}>{t.data.delete}</AppText>
          <IconChevron color={tk.textFaint} />
        </Pressable>
      </View>

      <Pressable onPress={signOut} style={shared.card}>
        <View style={shared.rowBetween}>
          <View>
            <AppText style={shared.textStrong}>{t.data.signOut}</AppText>
            <AppText style={shared.rowSubtitle}>{t.data.signOutSubtitle}</AppText>
          </View>
          <IconChevron color={tk.textFaint} />
        </View>
      </Pressable>

      <Modal
        visible={showDeleteSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteSheet(false)}
      >
        <Pressable style={s.sheetOverlay} onPress={() => setShowDeleteSheet(false)}>
          <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.sheetHandle} />
            <AppText style={s.sheetTitle}>{t.data.deleteConfirmTitle}</AppText>
            <AppText style={shared.textMuted}>{t.data.deleteConfirmBody}</AppText>
            <Button
              label={t.data.deleteConfirmCta}
              variant="danger"
              onPress={() => {
                clear();
                setShowDeleteSheet(false);
                router.navigate('/start');
              }}
              style={{ marginBottom: 10, marginTop: 10 }}
            />
            <Button
              label={t.data.cancel}
              variant="secondary"
              onPress={() => setShowDeleteSheet(false)}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
