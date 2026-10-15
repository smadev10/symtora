import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { meApi } from '@/api/me';
import { ERROR_KEYS, isApiError } from '@/api/errors';
import AppText from '@/components/AppText';
import { saveExport } from '@/export/saveExport';
import Button from '@/components/Button';
import Screen from '@/components/Screen';
import ScreenHeader from '@/components/ScreenHeader';
import { Avatar, IconChevron, IconDownload, IconMoon, IconSun } from '@/components/icons';
import { translate } from '@/i18n/translate';
import { LANGS, TR } from '@/i18n/translations';
import { useEntries } from '@/state/entries/Provider';
import { useSession } from '@/state/session/Provider';
import { useSettings } from '@/state/settings/Provider';
import { sharedStyles, themedStyles } from '@/theme/styles';
import { tokens } from '@/theme/tokens';

const LANG_NAMES = { de: 'Deutsch', en: 'English', fr: 'Français' } as const;

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
    dangerText: { color: '#c62828', fontSize: 14, fontWeight: '700' },
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
    sheetError: { color: '#c62828', fontSize: 13, marginTop: 10 },
  }),
);

export default function DataScreen() {
  const router = useRouter();
  const { settings, setLang, setTheme } = useSettings();
  const { session, signOut } = useSession();
  const { clear } = useEntries();

  const t = TR[settings.lang];
  const s = styles(settings.theme);
  const shared = sharedStyles(settings.theme);
  const tk = tokens(settings.theme);

  /** Which deletion the sheet is confirming, if it is open. */
  const [confirming, setConfirming] = useState<'data' | 'account' | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
  const [exportErrorKey, setExportErrorKey] = useState<string | null>(null);

  const exportData = async () => {
    if (exporting) return;
    setExporting(true);
    setExportErrorKey(null);
    try {
      await saveExport(await meApi.exportData());
    } catch (error) {
      setExportErrorKey(isApiError(error) ? error.messageKey : ERROR_KEYS.unknown);
    } finally {
      setExporting(false);
    }
  };

  const openSheet = (kind: 'data' | 'account') => {
    setErrorKey(null);
    setConfirming(kind);
  };
  const closeSheet = () => {
    if (!deleting) setConfirming(null);
  };

  // The server deletes first and the screen follows: clearing only the local list would leave
  // everything on the server, to reappear on the next reload.
  const confirmDelete = async () => {
    setDeleting(true);
    setErrorKey(null);
    try {
      if (confirming === 'account') {
        await meApi.deleteAccount();
        setConfirming(null);
        signOut(); // drops the stored token; the entries empty themselves on sign-out
        return;
      }
      await meApi.deleteData();
      clear();
      setConfirming(null);
      router.navigate('/start');
    } catch (error) {
      setErrorKey(isApiError(error) ? error.messageKey : ERROR_KEYS.unknown);
    } finally {
      setDeleting(false);
    }
  };

  const sheetText =
    confirming === 'account'
      ? {
          title: t.data.deleteAccountConfirmTitle,
          body: t.data.deleteAccountConfirmBody,
          cta: t.data.deleteAccountConfirmCta,
        }
      : { title: t.data.deleteConfirmTitle, body: t.data.deleteConfirmBody, cta: t.data.deleteConfirmCta };

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
        <Pressable
          onPress={() => void exportData()}
          disabled={exporting}
          style={[shared.rowBetween, exporting && { opacity: 0.5 }]}
        >
          <View>
            <AppText style={shared.textStrong}>{t.data.export}</AppText>
            <AppText style={shared.rowSubtitle}>{t.data.exportSubtitle}</AppText>
          </View>
          <IconDownload color={tk.textFaint} />
        </Pressable>
        {exportErrorKey ? (
          <AppText style={s.sheetError}>{translate(settings.lang, exportErrorKey)}</AppText>
        ) : null}
        <View style={shared.divider} />
        <Pressable onPress={() => openSheet('data')} style={shared.rowBetween}>
          <AppText style={s.dangerText}>{t.data.delete}</AppText>
          <IconChevron color={tk.textFaint} />
        </Pressable>
        <View style={shared.divider} />
        <Pressable onPress={() => openSheet('account')} style={shared.rowBetween}>
          <View>
            <AppText style={s.dangerText}>{t.data.deleteAccount}</AppText>
            <AppText style={shared.rowSubtitle}>{t.data.deleteAccountSubtitle}</AppText>
          </View>
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

      <Modal visible={confirming !== null} transparent animationType="fade" onRequestClose={closeSheet}>
        <Pressable style={s.sheetOverlay} onPress={closeSheet}>
          <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.sheetHandle} />
            <AppText style={s.sheetTitle}>{sheetText.title}</AppText>
            <AppText style={shared.textMuted}>{sheetText.body}</AppText>
            {errorKey ? <AppText style={s.sheetError}>{translate(settings.lang, errorKey)}</AppText> : null}
            <Button
              label={sheetText.cta}
              variant="danger"
              disabled={deleting}
              onPress={() => void confirmDelete()}
              style={{ marginBottom: 10, marginTop: 10 }}
            />
            <Button label={t.data.cancel} variant="secondary" disabled={deleting} onPress={closeSheet} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
