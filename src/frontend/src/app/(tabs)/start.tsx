import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/components/AppText';
import Screen from '@/components/Screen';
import { AsyncBoundary } from '@/components/states';
import { IconChevron, IconWarning } from '@/components/icons';
import { DEMO_KPIS, DIST, TREND } from '@/data/cases';
import { TR } from '@/i18n/translations';
import { useEntries } from '@/state/entries/Provider';
import { useSession } from '@/state/session/Provider';
import { useSettings } from '@/state/settings/Provider';
import { cardShadow, ls, sharedStyles, themedStyles } from '@/theme/styles';
import { tokens } from '@/theme/tokens';

const URGENCY_COLOR = { low: '#2f8f5b', mid: '#b9770e', high: '#c62828' } as const;

const styles = themedStyles((tk) =>
  StyleSheet.create({
    header: {
      backgroundColor: '#142939',
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
      padding: 18,
      paddingTop: 20,
      paddingBottom: 40,
    },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    signOut: { color: '#fff', fontSize: 12, fontWeight: '700' },
    kicker: { color: 'rgba(255,255,255,.6)', fontSize: 11, fontWeight: '700', letterSpacing: ls(11, 0.12) },
    greeting: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 14, marginBottom: 20 },
    trendLabel: { color: 'rgba(255,255,255,.55)', fontSize: 12.5, marginBottom: 10 },
    trendRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 44 },
    trendFootRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
    trendFootText: { color: 'rgba(255,255,255,.45)', fontSize: 10.5 },
    kpiRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 18, marginTop: -20 },
    kpiCard: { flex: 1, backgroundColor: tk.card, borderRadius: 18, padding: 14, alignItems: 'center', ...cardShadow },
    kpiVal: { color: tk.textStrong, fontSize: 22, fontWeight: '700', letterSpacing: ls(22, -0.02) },
    kpiLabel: { color: tk.textMuted, fontSize: 11, marginTop: 2 },
    promo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: tk.card,
      borderRadius: 19,
      padding: 14,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: 'rgba(198,40,40,.25)',
      ...cardShadow,
    },
    iconBoxAlert: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    promoTitle: { color: tk.textStrong, fontWeight: '700', fontSize: 14 },
    distRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
    distLabel: { color: tk.textNormal, fontSize: 12.5, width: 62 },
    distCount: { color: tk.textStrong, fontSize: 13, fontWeight: '700', minWidth: 32, textAlign: 'right' },
    histTitle: { color: tk.textStrong, fontWeight: '700', fontSize: 13.5 },
    histMeta: { color: tk.textMuted, fontSize: 11.5, marginTop: 4 },
    urgencyPill: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '700',
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 20,
      overflow: 'hidden',
    },
  }),
);

export default function StartScreen() {
  const router = useRouter();
  const { settings } = useSettings();
  const { entries, reload } = useEntries();
  const { session, signOut } = useSession();

  const t = TR[settings.lang];
  const s = styles(settings.theme);
  const shared = sharedStyles(settings.theme);
  const tk = tokens(settings.theme);

  const trendMax = Math.max(...TREND);
  const distMax = Math.max(...DIST);

  return (
    <Screen darkHeader>
      <View style={s.header}>
        <View style={shared.rowBetween}>
          <AppText style={s.kicker}>SYMTORA</AppText>
          <View style={s.headerActions}>
            {/* The tabs layout redirects to /login as soon as the session is cleared. */}
            <Pressable onPress={signOut} accessibilityRole="button" hitSlop={8}>
              <AppText style={s.signOut}>{t.data.signOut}</AppText>
            </Pressable>
          </View>
        </View>
        <AppText style={s.greeting}>
          {session.status === 'authenticated' && session.user.name
            ? `${t.start.greeting}, ${session.user.name}`
            : t.start.greeting}
        </AppText>
        <AppText style={s.trendLabel}>{t.start.trendSubtitle}</AppText>

        <View style={s.trendRow}>
          {TREND.map((value, i) => (
            <View key={i} style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
              <View
                style={{
                  width: '100%',
                  height: 8 + (value / trendMax) * 36,
                  borderRadius: 2,
                  backgroundColor: 'rgba(255,255,255,.55)',
                }}
              />
            </View>
          ))}
        </View>

        <View style={s.trendFootRow}>
          <AppText style={s.trendFootText}>{t.start.trendLabel}</AppText>
          <AppText style={s.trendFootText}>{t.start.trendRange}</AppText>
        </View>
      </View>

      <View style={s.kpiRow}>
        <View style={s.kpiCard}>
          <AppText style={s.kpiVal}>{DEMO_KPIS.entries}</AppText>
          <AppText style={s.kpiLabel}>{t.start.kpiEntries}</AppText>
        </View>
        <View style={s.kpiCard}>
          <AppText style={s.kpiVal}>{DEMO_KPIS.regions}</AppText>
          <AppText style={s.kpiLabel}>{t.start.kpiRegions}</AppText>
        </View>
        <View style={s.kpiCard}>
          <AppText style={s.kpiVal}>{DEMO_KPIS.emergencies}</AppText>
          <AppText style={s.kpiLabel}>{t.start.kpiEmergencies}</AppText>
        </View>
      </View>

      <View style={shared.screenPadNoTop}>
        <Pressable onPress={() => router.push('/emergency')} style={s.promo}>
          <View
            style={[
              s.iconBoxAlert,
              { backgroundColor: settings.theme === 'dark' ? '#3a1a1a' : '#fdeaea' },
            ]}
          >
            <IconWarning color="#b9770e" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={s.promoTitle}>{t.start.emergencyPromoTitle}</AppText>
            <AppText style={shared.rowSubtitle}>{t.start.emergencyPromoSub}</AppText>
          </View>
          <IconChevron color={tk.textFaint} />
        </Pressable>

        <View style={shared.card}>
          <View style={shared.rowBetween}>
            <AppText style={shared.sectionTitleInCard}>{t.start.distributionTitle}</AppText>
            <AppText style={shared.textMutedSmall}>{t.start.distributionRange}</AppText>
          </View>
          <View style={{ marginTop: 12 }}>
            {t.patternRegions.map((label, i) => (
              <View key={label} style={s.distRow}>
                <AppText style={s.distLabel}>{label}</AppText>
                <View style={shared.distTrack}>
                  <View
                    style={{
                      height: '100%',
                      width: `${(DIST[i] / distMax) * 100}%`,
                      backgroundColor: tk.accent,
                      borderRadius: 4,
                    }}
                  />
                </View>
                <AppText style={s.distCount}>{DIST[i]}%</AppText>
              </View>
            ))}
          </View>
        </View>

        <AppText style={shared.sectionTitleTop}>{t.start.recentTitle}</AppText>

        <AsyncBoundary
          status={entries.status}
          errorKey={entries.errorKey}
          hasContent={entries.items.length > 0}
          onRetry={() => void reload()}
        >
          <View>
            {entries.items.map((entry) => (
              <Pressable
                key={entry.id}
                onPress={() => router.push(`/assessment/${entry.id}`)}
                style={shared.card}
              >
                <View style={shared.rowBetween}>
                  <AppText style={s.histTitle}>{entry.title}</AppText>
                  <AppText
                    style={[
                      s.urgencyPill,
                      {
                        backgroundColor: entry.urgency ? URGENCY_COLOR[entry.urgency] : tk.textFaint,
                      },
                    ]}
                  >
                    {entry.urgencyLabel}
                  </AppText>
                </View>
                <AppText style={s.histMeta}>
                  {entry.region ? `${entry.dateLabel} · ${entry.region}` : entry.dateLabel}
                </AppText>
              </Pressable>
            ))}
          </View>
        </AsyncBoundary>
      </View>
    </Screen>
  );
}
