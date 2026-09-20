import { StyleSheet, View } from 'react-native';

import AppText from '@/components/AppText';
import Screen from '@/components/Screen';
import ScreenHeader from '@/components/ScreenHeader';
import { IconInfo } from '@/components/icons';
import { HEAT, TRIGGER_COUNTS } from '@/data/cases';
import { TR } from '@/i18n/translations';
import { useSettings } from '@/state/settings/Provider';
import { lh, sharedStyles, themedStyles } from '@/theme/styles';
import { heatColor, tokens } from '@/theme/tokens';

/** Entries per cell that counts as "frequent" on the legend. */
const HEAT_MAX = 3;

const LEGEND_STOPS = [0, 0.25, 0.5, 0.75, 1];

const styles = themedStyles((tk) =>
  StyleSheet.create({
    headerRow: { flexDirection: 'row', gap: 4, marginTop: 14 },
    colLabel: { flex: 1, color: tk.textFaint, fontSize: 9, textAlign: 'center' },
    dataRow: { flexDirection: 'row', gap: 4, alignItems: 'center', marginTop: 4 },
    rowLabel: { width: 44, color: tk.textNormal, fontSize: 11 },
    cell: { flex: 1, aspectRatio: 1, borderRadius: 5 },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
    legendTrack: { flex: 1, flexDirection: 'row', gap: 2 },
    triggerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: tk.inset,
      borderRadius: 14,
      padding: 14,
      marginBottom: 8,
    },
    triggerCount: { color: tk.accent, fontSize: 17, fontWeight: '700' },
    infoCard: {
      flexDirection: 'row',
      backgroundColor: tk.tintBlue.bg,
      borderRadius: 14,
      padding: 14,
      gap: 10,
      alignItems: 'flex-start',
      marginTop: 8,
      marginBottom: 18,
    },
    infoText: { flex: 1, color: tk.tintBlue.fg, fontSize: 12, lineHeight: lh(12, 1.5) },
  }),
);

export default function PatternsScreen() {
  const { settings } = useSettings();

  const t = TR[settings.lang];
  const s = styles(settings.theme);
  const shared = sharedStyles(settings.theme);
  const tk = tokens(settings.theme);

  return (
    <Screen padded>
      <ScreenHeader kicker={t.patterns.kicker} />

      <AppText style={shared.pageTitle}>{t.patterns.title}</AppText>
      <AppText style={shared.pageSubtitle}>{t.patterns.subtitle}</AppText>

      <View style={shared.card}>
        <View style={shared.rowBetween}>
          <AppText style={shared.sectionTitleInCard}>{t.patterns.freqTitle}</AppText>
          <AppText style={shared.textMutedSmall}>{t.patterns.weekRange}</AppText>
        </View>

        <View style={s.headerRow}>
          <View style={{ width: 44 }} />
          {t.weeks.map((week) => (
            <AppText key={week} style={s.colLabel}>
              {week}
            </AppText>
          ))}
        </View>

        {t.patternRegions.map((region, rowIndex) => (
          <View key={region} style={s.dataRow}>
            <AppText style={s.rowLabel}>{region}</AppText>
            {HEAT[rowIndex].map((value, colIndex) => (
              <View
                key={colIndex}
                style={[
                  s.cell,
                  { backgroundColor: heatColor(value / HEAT_MAX, tk.heatFrom, tk.heatTo) },
                ]}
              />
            ))}
          </View>
        ))}

        <View style={s.legendRow}>
          <AppText style={shared.textMutedSmall}>{t.patterns.rare}</AppText>
          <View style={s.legendTrack}>
            {LEGEND_STOPS.map((stop) => (
              <View
                key={stop}
                style={{
                  height: 6,
                  flex: 1,
                  borderRadius: 3,
                  backgroundColor: heatColor(stop, tk.heatFrom, tk.heatTo),
                }}
              />
            ))}
          </View>
          <AppText style={shared.textMutedSmall}>{t.patterns.frequent}</AppText>
        </View>
      </View>

      <AppText style={shared.sectionTitleTop}>{t.patterns.triggersTitle}</AppText>
      <View style={shared.card}>
        {t.triggers.map((trigger, i) => (
          <View key={trigger.label} style={s.triggerRow}>
            <AppText style={s.triggerCount}>{TRIGGER_COUNTS[i]}×</AppText>
            <View>
              <AppText style={shared.textStrong}>{trigger.label}</AppText>
              <AppText style={shared.rowSubtitle}>{trigger.sub}</AppText>
            </View>
          </View>
        ))}
      </View>

      <View style={s.infoCard}>
        <IconInfo color={tk.tintBlue.fg} />
        <AppText style={s.infoText}>{t.patterns.disclaimer}</AppText>
      </View>
    </Screen>
  );
}
