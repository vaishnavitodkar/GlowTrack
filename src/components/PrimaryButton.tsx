import React from "react";
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle } from "react-native";
import { colors, radii, spacing, fonts } from "@/theme/tokens";

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = "solid",
  style,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "solid" | "ghost";
  style?: ViewStyle;
}) {
  const isGhost = variant === "ghost";
  return (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      style={({ pressed }) => [
        styles.btn,
        isGhost ? styles.ghost : styles.solid,
        (pressed || disabled) && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isGhost ? colors.gold : colors.white} />
      ) : (
        <Text style={[styles.label, isGhost && { color: colors.gold }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: spacing.md + 2,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  solid: {
    backgroundColor: colors.rose, // swap for a LinearGradient (expo-linear-gradient) later for the rose->gold glow
  },
  ghost: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.line,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.white,
  },
});