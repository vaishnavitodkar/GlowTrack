import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts, spacing, type } from "@/theme/tokens";
import { GlassCard } from "@/components/GlassCard";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { getLocalDateKey } from "@/lib/localDate";

type RoutineStep = { id: string; custom_name: string | null; product_id: string | null };

export function HomeScreen({ navigation }: any) {
  const { session } = useAuth();
  const [streak, setStreak] = useState(0);
  const [steps, setSteps] = useState<RoutineStep[]>([]);
  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set());
  const [loadingSteps, setLoadingSteps] = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    if (!session?.user) return;
    const userId = session.user.id;
    const today = getLocalDateKey();
    void (async () => {
      const [stepResult, completionResult, streakResult] = await Promise.all([
        supabase.from("user_products").select("id, custom_name, product_id")
          .eq("user_id", userId).eq("routine_slot", "AM")
          .or("source.is.null,source.in.(manual,recommendation_accepted)").order("step_order"),
        supabase.from("routine_step_completions").select("user_product_id")
          .eq("user_id", userId).eq("completion_date", today),
        supabase.rpc("recalculate_glowtrack_streak", { p_today: today }),
      ]);
      if (!active) return;
      const loadedSteps = stepResult.data ?? [];
      const loadedDone = new Set((completionResult.data ?? []).map((row) => row.user_product_id));
      setSteps(loadedSteps);
      setCompletedToday(loadedDone);
      if (typeof streakResult.data === "number") setStreak(streakResult.data);
      else {
        const { data } = await supabase.from("streaks").select("current_streak").eq("user_id", userId).maybeSingle();
        if (active) setStreak(data?.current_streak ?? 0);
      }
      setLoadingSteps(false);
    })();
    return () => { active = false; };
  }, [session?.user]));

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={[type.h1, styles.title]}>Good morning</Text>
      <View style={styles.row}>
        <GlassCard style={{ flex: 1, marginRight: spacing.sm }}>
          <Text style={type.label}>Streak</Text>
          <Text style={styles.stat}>🔥 {streak} days</Text>
        </GlassCard>
        <GlassCard style={{ flex: 1, backgroundColor: "rgba(206,140,150,0.12)" }}>
          <Text style={[type.label, { color: colors.rose }]}>Today · AM</Text>
          <Text style={styles.stat}>{completedToday.size}/{steps.length}</Text>
        </GlassCard>
      </View>
      <GlassCard style={{ marginTop: spacing.lg }}>
        <Text style={type.h2}>Morning routine</Text>
        {steps.map((step) => (
          <View key={step.id} style={styles.stepRow}>
            <View style={[styles.dot, completedToday.has(step.id) && styles.dotDone]} />
            <Text style={[styles.stepLabel, completedToday.has(step.id) && styles.stepDone]}>{step.custom_name ?? "Skincare product"}</Text>
          </View>
        ))}
        {!loadingSteps && steps.length === 0 ? <Text style={styles.empty}>Your morning routine is empty. Add a product to your routine to see it here.</Text> : null}
        <Pressable accessibilityRole="button" onPress={() => navigation.navigate("Tabs", { screen: "Routine" })} style={styles.linkButton}>
          <Text style={styles.link}>Open routine to track today's steps  ›</Text>
        </Pressable>
      </GlassCard>
      <Pressable accessibilityRole="button" onPress={() => navigation.navigate("CheckIn")} style={styles.checkIn}>
        <Text style={styles.link}>How is your skin today?  ›</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.plum, padding: spacing.xl, paddingTop: spacing.xxl },
  title: { marginBottom: spacing.lg },
  row: { flexDirection: "row" },
  stat: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.ink, marginTop: 4 },
  stepRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.line },
  dot: { width: 16, height: 16, borderRadius: 5, borderWidth: 1.5, borderColor: colors.inkSoft, marginRight: spacing.sm },
  dotDone: { backgroundColor: colors.gold, borderColor: colors.gold },
  stepLabel: { fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  stepDone: { color: colors.inkSoft, textDecorationLine: "line-through" },
  empty: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft, lineHeight: 18, paddingTop: spacing.sm },
  linkButton: { paddingTop: spacing.md },
  checkIn: { marginTop: spacing.md, padding: spacing.md, borderColor: colors.line, borderWidth: 1, borderRadius: 12, backgroundColor: colors.glass },
  link: { fontFamily: fonts.bodyBold, color: colors.gold, fontSize: 13 },
});
