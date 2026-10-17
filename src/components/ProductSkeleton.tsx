import React, { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, StyleSheet, View } from "react-native";
import { colors, radii, spacing } from "@/theme/tokens";

export function ProductSkeleton({ count = 3 }: { count?: number }) {
  const shimmer = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    let animation: Animated.CompositeAnimation | undefined;
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!active || reduced) return;
      animation = Animated.loop(Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0.55, duration: 700, useNativeDriver: true }),
      ]));
      animation.start();
    });
    return () => { active = false; animation?.stop(); };
  }, [shimmer]);
  return <View accessibilityLabel="Loading products" accessibilityRole="progressbar">
    {Array.from({ length: count }, (_, index) => <View key={index} style={styles.card}>
      <Animated.View style={[styles.icon, { opacity: shimmer }]} />
      <View style={styles.copy}>
        <Animated.View style={[styles.line, styles.category, { opacity: shimmer }]} />
        <Animated.View style={[styles.line, styles.title, { opacity: shimmer }]} />
        <Animated.View style={[styles.line, styles.detail, { opacity: shimmer }]} />
      </View>
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  card: { minHeight: 64, borderRadius: radii.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.glass, marginBottom: spacing.sm, padding: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md },
  icon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(206,140,150,0.32)" },
  copy: { flex: 1, gap: 7 },
  line: { height: 8, borderRadius: 5, backgroundColor: "rgba(243,238,242,0.17)" },
  category: { width: "35%" },
  title: { width: "70%", height: 10 },
  detail: { width: "48%", height: 6 },
});
