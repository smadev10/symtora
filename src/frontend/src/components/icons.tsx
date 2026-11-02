import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { G, Path, Circle, Line, Polyline, Rect } from 'react-native-svg';

import AppText from './AppText';

export type IconProps = {
  size?: number;
  color?: string;
};

type BaseProps = IconProps & {
  viewBox?: string;
  children: ReactNode;
};

type AvatarProps = {
  size?: number;
  name?: string;
  bg?: string;
  fg?: string;
};

// Feather-style outline icons on a 24x24 grid. `Base` applies the shared stroke
// presentation so each icon only declares geometry.
function Base({ size = 22, color = '#142939', viewBox = '0 0 24 24', children }: BaseProps) {
  return (
    <Svg width={size} height={size} viewBox={viewBox} fill="none">
      <G stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {children}
      </G>
    </Svg>
  );
}

export function IconMic({ size = 22, color = '#142939' }: IconProps) {
  return (
    <Base size={size} color={color}>
      <Path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <Path d="M19 10v1a7 7 0 0 1-14 0v-1" />
      <Line x1="12" y1="18" x2="12" y2="22" />
      <Line x1="8" y1="22" x2="16" y2="22" />
    </Base>
  );
}

export function IconChevron({ size = 22, color = '#142939' }: IconProps) {
  return (
    <Base size={size} color={color}>
      <Polyline points="9 6 15 12 9 18" />
    </Base>
  );
}

export function IconChevronLeft({ size = 22, color = '#142939' }: IconProps) {
  return (
    <Base size={size} color={color}>
      <Polyline points="15 6 9 12 15 18" />
    </Base>
  );
}

export function IconCheck({ size = 22, color = '#142939' }: IconProps) {
  return (
    <Base size={size} color={color}>
      <Polyline points="20 6 9 17 4 12" />
    </Base>
  );
}

export function IconWarning({ size = 22, color = '#142939' }: IconProps) {
  return (
    <Base size={size} color={color}>
      <Path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <Line x1="12" y1="9" x2="12" y2="13" />
      <Line x1="12" y1="17" x2="12.01" y2="17" />
    </Base>
  );
}

export function IconInfo({ size = 22, color = '#142939' }: IconProps) {
  return (
    <Base size={size} color={color}>
      <Circle cx="12" cy="12" r="10" />
      <Line x1="12" y1="11" x2="12" y2="16" />
      <Line x1="12" y1="8" x2="12.01" y2="8" />
    </Base>
  );
}

export function IconStop({ size = 22, color = '#ffffff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="6" y="6" width="12" height="12" rx="2" fill={color} />
    </Svg>
  );
}

export function IconDownload({ size = 22, color = '#142939' }: IconProps) {
  return (
    <Base size={size} color={color}>
      <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <Polyline points="7 10 12 15 17 10" />
      <Line x1="12" y1="15" x2="12" y2="3" />
    </Base>
  );
}

export function IconPhone({ size = 22, color = '#142939' }: IconProps) {
  return (
    <Base size={size} color={color}>
      <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </Base>
  );
}

export function IconHome({ size = 22, color = '#142939' }: IconProps) {
  return (
    <Base size={size} color={color}>
      <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <Polyline points="9 22 9 12 15 12 15 22" />
    </Base>
  );
}

export function IconSettings({ size = 22, color = '#142939' }: IconProps) {
  return (
    <Base size={size} color={color}>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Base>
  );
}

export function IconPlus({ size = 22, color = '#142939' }: IconProps) {
  return (
    <Base size={size} color={color}>
      <Line x1="12" y1="5" x2="12" y2="19" />
      <Line x1="5" y1="12" x2="19" y2="12" />
    </Base>
  );
}

export function IconClose({ size = 22, color = '#142939' }: IconProps) {
  return (
    <Base size={size} color={color}>
      <Line x1="18" y1="6" x2="6" y2="18" />
      <Line x1="6" y1="6" x2="18" y2="18" />
    </Base>
  );
}

export function IconSun({ size = 22, color = '#142939' }: IconProps) {
  return (
    <Base size={size} color={color}>
      <Circle cx="12" cy="12" r="5" />
      <Line x1="12" y1="1" x2="12" y2="3" />
      <Line x1="12" y1="21" x2="12" y2="23" />
      <Line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <Line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <Line x1="1" y1="12" x2="3" y2="12" />
      <Line x1="21" y1="12" x2="23" y2="12" />
      <Line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <Line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </Base>
  );
}

export function IconMoon({ size = 22, color = '#142939' }: IconProps) {
  return (
    <Base size={size} color={color}>
      <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </Base>
  );
}

export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect x="0" y="0" width="64" height="64" rx="16" fill="#142939" />
      <Polyline
        points="9 35 21 35 27 20 35 45 40 33 55 33"
        fill="none"
        stroke="#b9dcf7"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function Avatar({ size = 40, name = '', bg = '#eef4f9', fg = '#285172' }: AvatarProps) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AppText style={{ color: fg, fontSize: Math.round(size * 0.38), fontWeight: '700' }}>{initials}</AppText>
    </View>
  );
}
