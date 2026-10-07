import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radii, type, fonts } from "@/theme/tokens";
import { useAuth } from "@/context/AuthContext";

const ROWS = ["My products", "AM / PM routine", "Reminder settings", "Account settings"];

export function ProfileScreen() {
  const { session, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={[type.h1, styles.title]}>
        {session?.user.user_metadata?.full_name ?? "Your profile"}
      </Text>
      <Text style={[type.body, styles.sub]}>{session?.user.email}</Text>

      {ROWS.map((label) => (
        <Pressable key={label} style={styles.row}>
          <Text style={styles.rowLabel}>{label}</Text>
        </Pressable>
      ))}

      <Pressable style={[styles.row, styles.logout]} onPress={signOut}>
        <Text style={[styles.rowLabel, { color: colors.danger }]}>Log out</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.plum, padding: spacing.xl, paddingTop: spacing.xxl },
  title: { marginBottom: spacing.xs },
  sub: { marginBottom: spacing.xl },
  row: {
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.glass,
    borderRadius: radii.md, padding: spacing.lg, marginBottom: spacing.sm,
  },
  rowLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink },
  logout: { marginTop: spacing.lg },
});
