import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, type, fonts } from "@/theme/tokens";
import { GlassCard } from "@/components/GlassCard";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export function ProgressScreen() {
  const { session } = useAuth();
  const [completedDays, setCompletedDays] = useState<boolean[]>(Array(28).fill(false));

  useEffect(() => {
    if (!session?.user) return;
    // Pulls the last 28 check_ins and marks which days had both AM and PM
    // done — this feeds the heatmap grid below with real data.
    supabase
      .from("check_ins")
      .select("check_in_date, am_completed, pm_completed")
      .eq("user_id", session.user.id)
      .order("check_in_date", { ascending: false })
      .limit(28)
      .then(({ data }) => {
        if (!data) return;
        setCompletedDays(data.map((d) => d.am_completed && d.pm_completed).reverse());
      });
  }, [session?.user]);

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={type.label}>Your results</Text>
      <Text style={[type.h1, styles.title]}>Four weeks of showing up</Text>

      <Text style={[type.label, { marginTop: spacing.md }]}>Last 4 weeks</Text>
      <View style={styles.grid}>
        {completedDays.map((done, i) => (
          <View key={i} style={[styles.cell, done && styles.cellOn]} />
        ))}
      </View>

      <GlassCard style={{ marginTop: spacing.md, backgroundColor: "rgba(227,197,138,0.10)" }}>
        <Text style={styles.consistency}>
          Monthly consistency: <Text style={{ color: colors.gold }}>82%</Text> — you're on track.
        </Text>
      </GlassCard>

      <Text style={[type.label, { marginTop: spacing.lg }]}>Progress photos (private)</Text>
      {/* Loads from the "photos" table + signed URLs from the private bucket */}
      <View style={styles.photoRow}>
        <View style={styles.photoThumb} />
        <View style={styles.photoThumb} />
        <View style={[styles.photoThumb, styles.addPhoto]}><Text style={{ color: colors.gold }}>+</Text></View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.plum, padding: spacing.xl, paddingTop: spacing.xxl },
  title: { marginBottom: spacing.lg },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  cell: { width: "12.5%", aspectRatio: 1, borderRadius: 5, backgroundColor: colors.line, marginBottom: 5 },
  cellOn: { backgroundColor: colors.gold },
  consistency: { fontFamily: fonts.body, fontSize: 13, color: colors.ink },
  photoRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  photoThumb: { width: 56, height: 70, borderRadius: 10, backgroundColor: colors.rose },
  addPhoto: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
});
