import { Text, StyleSheet } from 'react-native';

// Open Sans families registered by useFonts() in App.js. Custom fonts on native
// don't derive weights automatically, so every weight needs its own family.
const FAMILY_BY_WEIGHT = {
  '400': 'OpenSans_400Regular',
  normal: 'OpenSans_400Regular',
  '500': 'OpenSans_500Medium',
  '600': 'OpenSans_600SemiBold',
  '700': 'OpenSans_700Bold',
  bold: 'OpenSans_700Bold',
  '800': 'OpenSans_800ExtraBold',
};

export default function AppText({ style, ...rest }) {
  const flat = StyleSheet.flatten(style) || {};
  const { fontWeight, fontFamily, ...text } = flat;
  return (
    <Text
      {...rest}
      style={[
        text,
        { fontFamily: fontFamily || FAMILY_BY_WEIGHT[fontWeight] || FAMILY_BY_WEIGHT['400'] },
      ]}
    />
  );
}
