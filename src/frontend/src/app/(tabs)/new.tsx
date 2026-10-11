import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import AppText from '@/components/AppText';
import Button from '@/components/Button';
import Screen from '@/components/Screen';
import ScreenHeader from '@/components/ScreenHeader';
import { IconChevron, IconMic } from '@/components/icons';
import { ERROR_KEYS, isApiError } from '@/api/errors';
import { translate } from '@/i18n/translate';
import { TR } from '@/i18n/translations';
import { apiEntriesRepository } from '@/repositories/entriesRepository';
import type { BodyRegion } from '@/repositories/entryMapping';
import { takeTranscript } from '@/state/dictation/handoff';
import { joinText, MAX_DESCRIPTION_CHARS } from '@/state/dictation/reducer';
import { useEntries } from '@/state/entries/Provider';
import { useSettings } from '@/state/settings/Provider';
import { lh, sharedStyles, themedStyles } from '@/theme/styles';
import { tokens } from '@/theme/tokens';

/** Body region each suggestion chip sends, index-aligned with `TR.chips`. */
const CHIP_REGIONS: readonly BodyRegion[] = ['head', 'stomach', 'throat', 'knee'];

const styles = themedStyles((tk) =>
  StyleSheet.create({
    textarea: {
      minHeight: 130,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: tk.divider,
      backgroundColor: tk.card,
      color: tk.textStrong,
      fontSize: 14,
      padding: 14,
      lineHeight: lh(14, 1.5),
      textAlignVertical: 'top',
    },
    footRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, marginBottom: 14 },
    footText: { color: tk.textFaint, fontSize: 11 },
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, marginBottom: 18 },
    chip: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5 },
    error: { color: '#c62828', fontSize: 12.5, marginBottom: 10 },
  }),
);

export default function NewEntryScreen() {
  const router = useRouter();
  const { settings } = useSettings();

  const t = TR[settings.lang];
  const s = styles(settings.theme);
  const shared = sharedStyles(settings.theme);
  const tk = tokens(settings.theme);

  const { reload } = useEntries();

  const [description, setDescription] = useState('');
  const [region, setRegion] = useState<BodyRegion | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  // A finished dictation lands here for review; it is appended, never sent on its own.
  useFocusEffect(
    useCallback(() => {
      const transcript = takeTranscript();
      if (transcript) setDescription((current) => joinText(current, transcript));
    }, []),
  );

  const pickChip = (index: number) => {
    setRegion(CHIP_REGIONS[index]);
    setDescription(t.chips[index]);
  };

  const analyse = async () => {
    if (!description.trim() || submitting) return;
    setSubmitting(true);
    setErrorKey(null);

    try {
      // Returns as soon as the entry is queued; the assessment screen polls for the result.
      const { id } = await apiEntriesRepository.create(settings.lang, description, region);
      if (!mounted.current) return;
      void reload();
      setDescription('');
      setRegion(null);
      router.push(`/assessment/${id}`);
    } catch (error) {
      if (!mounted.current) return;
      setErrorKey(isApiError(error) ? error.messageKey : ERROR_KEYS.unknown);
    } finally {
      if (mounted.current) setSubmitting(false);
    }
  };

  return (
    <Screen padded>
      <ScreenHeader onBack={() => router.navigate('/start')} />

      <AppText style={shared.pageTitle}>{t.newDesc.title}</AppText>
      <AppText style={shared.pageSubtitle}>{t.newDesc.subtitle}</AppText>

      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder={t.newDesc.placeholder}
        placeholderTextColor={tk.textFaint}
        multiline
        maxLength={MAX_DESCRIPTION_CHARS}
        style={s.textarea}
      />

      <View style={s.footRow}>
        <AppText style={s.footText}>{t.newDesc.helperNote}</AppText>
        <AppText style={s.footText}>
          {description.length} / {MAX_DESCRIPTION_CHARS}
        </AppText>
      </View>

      <Pressable onPress={() => router.push('/record')} style={shared.card}>
        <View style={shared.rowBetween}>
          <View style={shared.rowStart}>
            <View style={shared.iconBoxDark}>
              <IconMic color="#fff" size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={shared.textStrong}>{t.newDesc.speakInstead}</AppText>
              <AppText style={shared.rowSubtitle}>{t.newDesc.speakSubtitle}</AppText>
            </View>
          </View>
          <IconChevron color={tk.textFaint} />
        </View>
      </Pressable>

      <View style={s.chipsWrap}>
        {t.chips.map((label, i) => {
          const active = region === CHIP_REGIONS[i];
          return (
            <Pressable
              key={label}
              onPress={() => pickChip(i)}
              style={[
                s.chip,
                {
                  backgroundColor: active ? tk.accentSelectedBg : 'transparent',
                  borderColor: active ? tk.accentSelectedBorder : tk.divider,
                },
              ]}
            >
              <AppText
                style={{
                  fontSize: 12.5,
                  fontWeight: '600',
                  color: active
                    ? settings.theme === 'dark'
                      ? '#fff'
                      : tk.textStrong
                    : tk.textNormal,
                }}
              >
                {label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {errorKey ? <AppText style={s.error}>{translate(settings.lang, errorKey)}</AppText> : null}

      <Button
        label={t.newDesc.analyze}
        onPress={() => void analyse()}
        disabled={!description.trim() || submitting}
      />
    </Screen>
  );
}
