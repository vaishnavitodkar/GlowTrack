import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { colors, radii, spacing } from "@/theme/tokens";

export function GlassCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
    padding: spacing.lg,
    // Note: true backdrop-blur isn't supported on React Native views directly.
    // For a real frosted-glass effect, wrap children in expo-blur's <BlurView>
    // once you're ready — this flat version matches the look closely for now.
  },
});
