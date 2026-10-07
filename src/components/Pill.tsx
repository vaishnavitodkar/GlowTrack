import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { colors, radii, spacing, fonts } from "@/theme/tokens";

export function Pill({
  label,
  selected = false,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.pill, selected && styles.pillSelected]}
    >
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.dot, selected && styles.dotSelected]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.glass,
    marginBottom: spacing.sm,
  },
  pillSelected: {
    borderColor: colors.rose,
    backgroundColor: "rgba(206,140,150,0.14)",
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.ink,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.inkSoft,
  },
  dotSelected: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
});
