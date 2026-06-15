import React, { useEffect } from "react";
import { Pressable, type PressableProps, StyleSheet, Text, View, type ViewStyle, type StyleProp } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { theme } from "../theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** A pressable that springs down slightly while pressed — tactile button feel. */
export function TapScale({
  children,
  style,
  ...rest
}: PressableProps & { style?: StyleProp<ViewStyle> }) {
  const s = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AnimatedPressable
      onPressIn={() => {
        s.value = withSpring(0.93, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        s.value = withSpring(1, { damping: 12, stiffness: 250 });
      }}
      style={[style, aStyle]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

/** Fade + scale in on mount (one-shot entrance). */
export function Pop({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const s = useSharedValue(0.7);
  const o = useSharedValue(0);
  useEffect(() => {
    s.value = withDelay(delay, withSpring(1, { damping: 12 }));
    o.value = withDelay(delay, withTiming(1, { duration: 220 }));
  }, [delay, o, s]);
  const aStyle = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: s.value }] }));
  return <Animated.View style={[style, aStyle]}>{children}</Animated.View>;
}

/** Opacity-only fade-in on mount (for screen/tab transitions). */
export function FadeIn({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const o = useSharedValue(0);
  useEffect(() => {
    o.value = withTiming(1, { duration: 220 });
  }, [o]);
  const aStyle = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[style, aStyle]}>{children}</Animated.View>;
}

/** Gentle continuous vertical float — makes a sprite feel alive. */
export function Bob({
  children,
  amplitude = 6,
  duration = 1700,
  style,
}: {
  children: React.ReactNode;
  amplitude?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withRepeat(withTiming(-amplitude, { duration }), -1, true);
  }, [amplitude, duration, y]);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={[style, aStyle]}>{children}</Animated.View>;
}

/** A progress bar whose fill animates smoothly to `pct` (0-100). */
export function AnimatedBar({
  pct,
  color = theme.colors.ember,
  height = 14,
}: {
  pct: number;
  color?: string;
  height?: number;
}) {
  const w = useSharedValue(pct);
  useEffect(() => {
    w.value = withTiming(Math.max(0, Math.min(100, pct)), { duration: 500 });
  }, [pct, w]);
  const aStyle = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <Animated.View style={[{ height, backgroundColor: color, borderRadius: height / 2 }, aStyle]} />
    </View>
  );
}

/** Floating "+reward" text that rises and fades; replays when `trigger` changes. */
export function FloatingReward({ text, trigger, color = theme.colors.success }: { text: string; trigger: number; color?: string }) {
  const y = useSharedValue(0);
  const o = useSharedValue(0);
  useEffect(() => {
    if (!trigger) return;
    y.value = 0;
    o.value = 1;
    y.value = withTiming(-70, { duration: 1300 });
    o.value = withSequence(withTiming(1, { duration: 150 }), withTiming(0, { duration: 1150 }));
  }, [trigger, o, y]);
  const aStyle = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value }] }));
  if (!trigger) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.float, aStyle]}>
      <Text style={[styles.floatText, { color }]}>{text}</Text>
    </Animated.View>
  );
}

/** A full-bleed colour flash that pulses when `trigger` changes (success/fail feedback). */
export function Flash({ trigger, color }: { trigger: number; color: string }) {
  const o = useSharedValue(0);
  useEffect(() => {
    if (!trigger) return;
    o.value = withSequence(withTiming(0.5, { duration: 120 }), withTiming(0, { duration: 500 }));
  }, [trigger, o]);
  const aStyle = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: color }, aStyle]}
    />
  );
}

const styles = StyleSheet.create({
  track: { width: "100%", backgroundColor: theme.colors.bg, overflow: "hidden" },
  float: {
    position: "absolute",
    top: 6,
    alignSelf: "center",
    zIndex: 20,
  },
  floatText: { fontWeight: "900", fontSize: 18, textShadowColor: "#000", textShadowRadius: 4 },
});
