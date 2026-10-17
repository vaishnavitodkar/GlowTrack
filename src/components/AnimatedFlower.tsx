import React, { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from "react-native";

export function AnimatedFlower({ size = 112 }: { size?: number }) {
  const rotation = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let spin: Animated.CompositeAnimation | undefined;
    let breathe: Animated.CompositeAnimation | undefined;
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!active || reduced) return;
      spin = Animated.loop(Animated.timing(rotation, { toValue: 1, duration: 6200, easing: Easing.linear, useNativeDriver: true }));
      breathe = Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1.07, duration: 950, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 950, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]));
      spin.start();
      breathe.start();
    });
    return () => { active = false; spin?.stop(); breathe?.stop(); };
  }, [rotation, pulse]);

  const flowerSize = size * 0.72;
  const petalWidth = flowerSize * 0.24;
  const petalHeight = flowerSize * 0.45;
  const turn = rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.wrap, { width: size, height: size }]}>
      <Animated.View style={[styles.halo, { width: size * 0.92, height: size * 0.92, borderRadius: size, transform: [{ scale: pulse }] }]} />
      <Animated.View style={{ width: flowerSize, height: flowerSize, transform: [{ rotate: turn }] }}>
        {Array.from({ length: 8 }, (_, index) => <View key={index} style={[styles.petal, { width: petalWidth, height: petalHeight, borderRadius: petalWidth, marginLeft: -petalWidth / 2, marginTop: -petalHeight / 2, transform: [{ rotate: `${index * 45}deg` }, { translateY: -flowerSize * 0.24 }] }]} />)}
      </Animated.View>
      <Animated.View style={[styles.core, { width: flowerSize * 0.3, height: flowerSize * 0.3, borderRadius: flowerSize, transform: [{ scale: pulse }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  halo: { position: "absolute", backgroundColor: "rgba(144,103,178,0.12)", borderWidth: 1, borderColor: "rgba(144,103,178,0.15)" },
  petal: { position: "absolute", top: "50%", left: "50%", backgroundColor: "#9067B2", opacity: 0.92 },
  core: { position: "absolute", backgroundColor: "#F4D9A5", borderWidth: 4, borderColor: "#FBF9FC" },
});
