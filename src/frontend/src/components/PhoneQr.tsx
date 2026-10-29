import QRCode from 'qrcode';
import { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import AppText from '@/components/AppText';
import { TR } from '@/i18n/translations';
import { useSettings } from '@/state/settings/Provider';
import { cardShadow, lh, themedStyles } from '@/theme/styles';

/** The port the Expo dev server runs on in docker compose. */
const DEV_SERVER_PORT = 8081;

const styles = themedStyles((tk) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginTop: 22,
      padding: 16,
      borderRadius: 18,
      backgroundColor: tk.card,
      ...cardShadow,
    },
    // White in both themes: phone cameras need dark modules on a light background.
    code: { padding: 8, borderRadius: 10, backgroundColor: '#fff' },
    title: { color: tk.textStrong, fontWeight: '700', fontSize: 14.5, marginBottom: 3 },
    body: { color: tk.textMuted, fontSize: 12.5, lineHeight: lh(12.5, 1.45) },
  }),
);

/** `exp://<lan-ip>:8081`, or null when there is nothing to show. */
export function expoGoUrl(lanIp: string | undefined): string | null {
  const ip = lanIp?.trim();
  return ip ? `exp://${ip}:${DEV_SERVER_PORT}` : null;
}

/** One SVG path with a 1×1 square per dark module. */
function qrPath(text: string): { path: string; size: number } {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' });
  let path = '';
  for (let row = 0; row < modules.size; row++) {
    for (let col = 0; col < modules.size; col++) {
      if (modules.get(row, col)) path += `M${col} ${row}h1v1h-1z`;
    }
  }
  return { path, size: modules.size };
}

/**
 * "Open on your phone": a QR code for Expo Go, shown in the browser only.
 *
 * The start scripts pass the computer's Wi-Fi address in as `EXPO_PUBLIC_LAN_IP`
 * (see docker-compose.yml). Without it — or on a phone, which is already there —
 * this renders nothing.
 */
export default function PhoneQr() {
  const { settings } = useSettings();
  const url = Platform.OS === 'web' ? expoGoUrl(process.env.EXPO_PUBLIC_LAN_IP) : null;
  const qr = useMemo(() => (url ? qrPath(url) : null), [url]);

  if (!url || !qr) return null;

  const t = TR[settings.lang].login;
  const s = styles(settings.theme);

  return (
    <View style={s.card}>
      <View style={s.code}>
        <Svg
          width={112}
          height={112}
          viewBox={`0 0 ${qr.size} ${qr.size}`}
          accessibilityLabel={url}
        >
          <Path d={qr.path} fill="#000" />
        </Svg>
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={s.title}>{t.phoneTitle}</AppText>
        <AppText style={s.body}>{t.phoneBody}</AppText>
      </View>
    </View>
  );
}
