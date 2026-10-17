import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radii, type, fonts } from "@/theme/tokens";
import { Pill } from "@/components/Pill";
import { PrimaryButton } from "@/components/PrimaryButton";

const STEPS = { AM: ["Cleanser", "Vitamin C serum", "Moisturizer", "Sunscreen"], PM: ["Cleanser", "Treatment", "Moisturizer"] };

export function RoutineScreen() {
  const [tab, setTab] = useState<"AM" | "PM">("AM");

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={type.label}>Your plan</Text>
      <Text style={[type.h1, styles.title]}>A routine you'll keep</Text>

      <View style={styles.tabs}>
        {(["AM", "PM"] as const).map((t) => (
          <Pressable key={t} style={[styles.tab, tab === t && styles.tabOn]} onPress={() => setTab(t)}>
            <Text style={[styles.tabLabel, tab === t && styles.tabLabelOn]}>{t} routine</Text>
          </Pressable>
        ))}
      </View>

      {STEPS[tab].map((s, i) => (
        <View key={s} style={styles.step}>
          <Text style={styles.stepNum}>{String(i + 1).padStart(2, "0")}</Text>
          <Text style={styles.stepLabel}>{s}</Text>
        </View>
      ))}

      <Text style={[type.label, { marginTop: spacing.lg }]}>Gentle reminders</Text>
      {/* Wire these to expo-notifications.scheduleNotificationAsync on save */}
      <Pill label="🌅 Morning · 8:00 AM" selected />
      <Pill label="🌙 Evening · 9:30 PM" selected />

      <PrimaryButton label="Save & continue" onPress={() => {}} style={{ marginTop: "auto" }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.plum, padding: spacing.xl, paddingTop: spacing.xxl },
  title: { marginBottom: spacing.lg },
  tabs: { flexDirection: "row", gap: spacing.xs, marginBottom: spacing.md },
  tab: { flex: 1, alignItems: "center", paddingVertical: spacing.sm, borderRadius: radii.sm, backgroundColor: colors.glass },
  tabOn: { backgroundColor: colors.rose },
  tabLabel: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.inkSoft },
  tabLabelOn: { color: colors.white },
  step: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.line },
  stepNum: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.gold, backgroundColor: "rgba(227,197,138,0.16)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  stepLabel: { fontFamily: fonts.body, fontSize: 14, color: colors.ink },
});
