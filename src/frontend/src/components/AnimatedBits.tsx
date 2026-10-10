import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const USE_NATIVE = Platform.OS !== 'web';

type SpinnerProps = {
  size?: number;
  color?: string;
  trackColor?: string;
  testID?: string;
};

// Rotating ring with a ~70% coloured arc over a full-circle track.
export function Spinner({
  size = 32,
  color = '#285172',
  trackColor = '#e4e8eb',
  testID,
}: SpinnerProps) {
  const spin = useRef(new Animated.Value(0)).current;
  const strokeWidth = Math.max(2, size * 0.11);
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: USE_NATIVE,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View
      testID={testID}
      style={{ width: size, height: size, transform: [{ rotate }] }}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${c * 0.7} ${c * 0.3}`}
          fill="none"
        />
      </Svg>
    </Animated.View>
  );
}

function Ring({ size, delay }: { size: number; delay: number }) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.loop(
        Animated.timing(t, {
          toValue: 1,
          duration: 1800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: USE_NATIVE,
        }),
      ),
    ]);
    anim.start();
    return () => anim.stop();
  }, [t, delay]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.55)',
        opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
        transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
      }}
    />
  );
}

// Concentric pulsing rings, sits behind the record button (dark screen only).
export function PulseRing({ size = 92, testID }: { size?: number; testID?: string }) {
  return (
    <View
      testID={testID}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <Ring size={size} delay={0} />
      <Ring size={size} delay={900} />
    </View>
  );
}

type WaveBarProps = {
  height?: number;
  color?: string;
  delay?: number;
  duration?: number;
  testID?: string;
};

// Single audio-wave bar, looped scaleY between a floor and full height.
export function WaveBar({
  height = 20,
  color = '#b9dcf7',
  delay = 0,
  duration = 700,
  testID,
}: WaveBarProps) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.loop(
        Animated.sequence([
          Animated.timing(t, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: USE_NATIVE,
          }),
          Animated.timing(t, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: USE_NATIVE,
          }),
        ]),
      ),
    ]);
    anim.start();
    return () => anim.stop();
  }, [t, delay, duration]);

  return (
    <Animated.View
      testID={testID}
      style={{
        width: 3,
        height,
        borderRadius: 2,
        backgroundColor: color,
        transform: [{ scaleY: t.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) }],
      }}
    />
  );
}

// Indeterminate progress bar: a segment sweeping left to right across a track.
export function LoadingBar({
  color = '#285172',
  trackColor = '#e4e8eb',
  testID,
}: {
  color?: string;
  trackColor?: string;
  testID?: string;
}) {
  const [width, setWidth] = useState(0);
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(t, {
        toValue: 1,
        duration: 1300,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: USE_NATIVE,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [t]);

  const segment = width * 0.35;

  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ width: '100%', height: 4, borderRadius: 2, backgroundColor: trackColor, overflow: 'hidden' }}
    >
      <Animated.View
        style={{
          width: segment,
          height: '100%',
          borderRadius: 2,
          backgroundColor: color,
          transform: [{ translateX: t.interpolate({ inputRange: [0, 1], outputRange: [-segment, width] }) }],
        }}
      />
    </View>
  );
}
