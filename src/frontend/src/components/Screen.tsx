import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSettings } from '@/state/settings/Provider';
import { sharedStyles } from '@/theme/styles';
import { tokens } from '@/theme/tokens';

type Props = {
  children: ReactNode;
  /** Wraps the content in a ScrollView. Off for full-bleed screens like record. */
  scroll?: boolean;
  /** Applies the standard 18pt screen padding. */
  padded?: boolean;
  /**
   * Forces light status bar content. Screens with a dark header set this;
   * everything else follows the theme.
   */
  darkHeader?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

export default function Screen({
  children,
  scroll = true,
  padded = false,
  darkHeader = false,
  style,
  contentStyle,
}: Props) {
  const { settings } = useSettings();
  const s = sharedStyles(settings.theme);
  const tk = tokens(settings.theme);

  const body = padded ? <View style={[s.screenPad, contentStyle]}>{children}</View> : children;

  return (
    <SafeAreaView
      style={[{ flex: 1, backgroundColor: tk.screenBg }, style]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style={darkHeader || settings.theme === 'dark' ? 'light' : 'dark'} />
      {scroll ? (
        <ScrollView style={s.screen} contentContainerStyle={{ flexGrow: 1 }}>
          {body}
        </ScrollView>
      ) : (
        <View style={s.screen}>{body}</View>
      )}
    </SafeAreaView>
  );
}
