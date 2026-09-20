import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import AppText from '@/components/AppText';
import { useSettings } from '@/state/settings/Provider';
import { themedStyles } from '@/theme/styles';
import { tokens } from '@/theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

const styles = themedStyles((tk) =>
  StyleSheet.create({
    base: { alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
    block: { width: '100%', height: 50 },
    inline: { flex: 1, height: 48 },
    primary: { backgroundColor: tk.accent },
    primaryDisabled: { backgroundColor: tk.divider },
    secondary: { borderWidth: 1, borderColor: tk.divider, backgroundColor: 'transparent' },
    danger: { backgroundColor: '#c62828' },
    labelPrimary: { color: tk.accentText, fontWeight: '700', fontSize: 15 },
    labelSecondary: { color: tk.textStrong, fontWeight: '700', fontSize: 15 },
    labelDanger: { color: '#fff', fontWeight: '700', fontSize: 14 },
    labelDisabled: { color: tk.textFaint, fontWeight: '700', fontSize: 15 },
  }),
);

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** `inline` sits in a row of buttons; `block` spans the screen. */
  layout?: 'block' | 'inline';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function Button({
  label,
  onPress,
  variant = 'primary',
  layout = 'block',
  disabled = false,
  style,
}: Props) {
  const { settings } = useSettings();
  const s = styles(settings.theme);
  const tk = tokens(settings.theme);

  const surface =
    variant === 'secondary' ? s.secondary : variant === 'danger' ? s.danger : s.primary;

  const label$ =
    variant === 'secondary'
      ? s.labelSecondary
      : variant === 'danger'
        ? s.labelDanger
        : s.labelPrimary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[
        s.base,
        layout === 'inline' ? s.inline : s.block,
        disabled && variant === 'primary' ? s.primaryDisabled : surface,
        disabled && variant !== 'primary' ? { borderColor: tk.divider, opacity: 0.6 } : null,
        style,
      ]}
    >
      <AppText style={[label$, disabled ? s.labelDisabled : null]}>{label}</AppText>
    </Pressable>
  );
}
