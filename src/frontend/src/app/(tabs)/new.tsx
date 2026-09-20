import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import Analysing from '@/components/Analysing';
import AppText from '@/components/AppText';
import Button from '@/components/Button';
import Screen from '@/components/Screen';
import ScreenHeader from '@/components/ScreenHeader';
import { IconChevron, IconMic } from '@/components/icons';
import { CASE_ORDER, type CaseKey } from '@/data/cases';
import { TR } from '@/i18n/translations';
import { useSettings } from '@/state/settings/Provider';
import { lh, sharedStyles, themedStyles } from '@/theme/styles';
import { tokens } from '@/theme/tokens';

/** Matches the placeholder delay the prototype used for the fake analysis. */
const ANALYSE_MS = 1500;
const MAX_CHARS = 600;

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
  }),
);

export default function NewEntryScreen() {
  const router = useRouter();
  const { settings } = useSettings();

  const t = TR[settings.lang];
  const s = styles(settings.theme);
  const shared = sharedStyles(settings.theme);
  const tk = tokens(settings.theme);

  const [description, setDescription] = useState('');
  const [selectedCase, setSelectedCase] = useState<CaseKey>('headache');
  const [analysing, setAnalysing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const pickChip = (index: number) => {
    setSelectedCase(CASE_ORDER[index]);
    setDescription(t.chips[index]);
  };

  const analyse = () => {
    if (!description.trim()) return;
    setAnalysing(true);
    timer.current = setTimeout(() => {
      setAnalysing(false);
      router.push(`/assessment/${selectedCase}`);
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
        maxLength={MAX_CHARS}
        style={s.textarea}
      />

      <View style={s.footRow}>
        <AppText style={s.footText}>{t.newDesc.helperNote}</AppText>
        <AppText style={s.footText}>
          {description.length} / {MAX_CHARS}
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
          const active = selectedCase === CASE_ORDER[i];
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

      <Button label={t.newDesc.analyze} onPress={analyse} disabled={!description.trim()} />
    </Screen>
  );
}
