import React, { useEffect } from "react";
import {
  Blur,
  Canvas,
  Circle,
  Group,
  RadialGradient,
  vec,
} from "@shopify/react-native-skia";
import { useDerivedValue, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { theme } from "../theme";

/**
 * The Crucible centerpiece — a glowing, gently pulsing vessel.
 * Skia + Reanimated; intensity reflects the brewing state.
 * This is where the headline "transmutation" moment will be juiced up
 * (particles, weak-spot taps, success flash) as art lands.
 */
export function CrucibleVessel({ size = 220, intensity = 1 }: { size?: number; intensity?: number }) {
  const pulse = useSharedValue(0.6);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1400 }), -1, true);
  }, [pulse]);

  const r = size * 0.34;
  const cx = size / 2;
  const cy = size / 2;
  const glowR = useDerivedValue(() => r * (1.1 + pulse.value * 0.25 * intensity));

  return (
    <Canvas style={{ width: size, height: size }}>
      <Group>
        {/* outer glow */}
        <Circle c={vec(cx, cy)} r={glowR}>
          <RadialGradient
            c={vec(cx, cy)}
            r={r * 1.6}
            colors={[theme.colors.crucibleGlow, "rgba(255,138,76,0)"]}
          />
          <Blur blur={18} />
        </Circle>
        {/* molten core */}
        <Circle c={vec(cx, cy)} r={r}>
          <RadialGradient
            c={vec(cx, cy - r * 0.3)}
            r={r}
            colors={[theme.colors.ember, "#7a2d12"]}
          />
        </Circle>
        {/* brass rim */}
        <Circle c={vec(cx, cy)} r={r} color={theme.colors.brass} style="stroke" strokeWidth={6} />
      </Group>
    </Canvas>
  );
}
