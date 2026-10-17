import React, { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, ViewStyle } from "react-native";

export function FadeInUp({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: ViewStyle }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let animation: Animated.CompositeAnimation | undefined;
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!active) return;
      animation = Animated.timing(progress, { toValue: 1, duration: reduced ? 0 : 280, delay: reduced ? 0 : delay, useNativeDriver: true });
      animation.start();
    });
    return () => { active = false; animation?.stop(); };
  }, [delay, progress]);
  return <Animated.View style={[style, { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>{children}</Animated.View>;
}
