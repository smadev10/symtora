import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import AppText from '@/components/AppText';
import { IconChevronLeft, LogoMark } from '@/components/icons';
import { useSettings } from '@/state/settings/Provider';
import { sharedStyles, ls } from '@/theme/styles';
import { tokens } from '@/theme/tokens';

type Props = {
  /** Renders the back chevron. Omit for a screen reached from the tab bar. */
  onBack?: () => void;
  /** Small uppercase label shown instead of a back button. */
  kicker?: string;
  /** Shows the wordmark and logo instead of a back button or kicker. */
  brand?: boolean;
  /** Optional content on the right of the row. */
  right?: ReactNode;
};

/**
 * The back-button / kicker row that sat inline at
 * the top of six screens in App.js.
 */
export default function ScreenHeader({ onBack, kicker, brand, right }: Props) {
  const { settings } = useSettings();
  const s = sharedStyles(settings.theme);
  const tk = tokens(settings.theme);

  return (
    <View style={s.rowBetween}>
      {onBack ? (
        <Pressable onPress={onBack} style={s.backBtn} accessibilityRole="button">
          <IconChevronLeft color={tk.textStrong} />
        </Pressable>
      ) : brand ? (
        <View style={s.rowStart}>
          <LogoMark size={22} />
          <AppText
            style={{
              color: tk.textStrong,
              fontWeight: '800',
              fontSize: 13,
              letterSpacing: ls(13, 0.08),
            }}
          >
            SYMTORA
          </AppText>
        </View>
      ) : (
        <AppText style={s.kickerLight}>{kicker ?? ''}</AppText>
      )}

      {right}
    </View>
  );
}
