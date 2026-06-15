import React, { useEffect } from "react";
import { Image, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { crucibleArt, crucibleSlagArt } from "../assets";

const AnimatedImage = Animated.createAnimatedComponent(Image);

/**
 * The hero crucible image with a gentle living pulse (Reanimated).
 * Shows the curdled "slag" variant after a failed transmute.
 */
export function CrucibleArt({ size = 240, slag = false }: { size?: number; slag?: boolean }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1600 }), -1, true);
  }, [pulse]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.03 }],
    opacity: 0.9 + pulse.value * 0.1,
  }));

  return (
    <AnimatedImage
      source={slag ? crucibleSlagArt : crucibleArt}
      style={[{ width: size, height: size, borderRadius: size / 2 }, styles.img, style]}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  img: { backgroundColor: "transparent" },
});
