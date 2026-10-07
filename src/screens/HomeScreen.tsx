import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radii, type, fonts } from "@/theme/tokens";
import { GlassCard } from "@/components/GlassCard";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type RoutineStep = { id: string; custom_name: string | null; product_id: string | null };

export function HomeScreen() {
  const { session } = useAuth();
  const [streak, setStreak] = useState(0);
  const [steps, setSteps] = useState<RoutineStep[]>([]);
  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!session?.user) return;

    supabase
      .from("streaks")
      .select("current_streak")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => setStreak(data?.current_streak ?? 0));

    supabase
      .from("user_products")
      .select("id, custom_name, product_id")
      .eq("user_id", session.user.id)
      .eq("routine_slot", "AM")
      .order("step_order")
      .then(({ data }) => setSteps(data ?? []));
  }, [session?.user]);

  const toggleStep = async (id: string) => {
    if (!session?.user) return;

    // Optimistic UI update first, so tapping feels instant.
    const next = new Set(completedToday);
    next.has(id) ? next.delete(id) : next.add(id);
    setCompletedToday(next);

    const totalSteps = steps.length || 4;
    const amDone = next.size >= totalSteps;
    const today = new Date().toISOString().slice(0, 10);

    // Save today's check-in row regardless of whether it's fully complete yet,
    // so partial progress isn't lost if the user closes the app mid-routine.
    const { error: checkInError } = await supabase
      .from("check_ins")
      .upsert(
        { user_id: session.user.id, check_in_date: today, am_completed: amDone },
        { onConflict: "user_id,check_in_date" }
      );
    if (checkInError) {
      console.warn("check-in save failed:", checkInError.message);
      return;
    }

    // Only bump the streak the moment the full AM routine is completed,
    // and only once per day (guarded by last_check_in_date).
    if (amDone) {
      const { data: existing } = await supabase
        .from("streaks")
        .select("current_streak, longest_streak, last_check_in_date")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (existing?.last_check_in_date !== today) {
        const newStreak = (existing?.current_streak ?? 0) + 1;
        const newLongest = Math.max(newStreak, existing?.longest_streak ?? 0);
        await supabase.from("streaks").upsert({
          user_id: session.user.id,
          current_streak: newStreak,
          longest_streak: newLongest,
          last_check_in_date: today,
        });
        setStreak(newStreak);
      }
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={[type.h1, styles.title]}>Good morning</Text>

      <View style={styles.row}>
        <GlassCard style={{ flex: 1, marginRight: spacing.sm }}>
          <Text style={type.label}>Streak</Text>
          <Text style={styles.stat}>🔥 {streak} days</Text>
        </GlassCard>
        <GlassCard style={{ flex: 1, backgroundColor: "rgba(206,140,150,0.12)" }}>
          <Text style={[type.label, { color: colors.rose }]}>Today</Text>
          <Text style={styles.stat}>
            {completedToday.size}/{steps.length || 4}
          </Text>
        </GlassCard>
      </View>

      <GlassCard style={{ marginTop: spacing.lg }}>
        <Text style={type.h2}>Morning routine</Text>
        {(steps.length ? steps : PLACEHOLDER_STEPS).map((s) => (
          <Pressable
            key={s.id}
            style={styles.stepRow}
            onPress={() => toggleStep(s.id)}
          >
            <View style={[styles.dot, completedToday.has(s.id) && styles.dotDone]} />
            <Text style={styles.stepLabel}>{s.custom_name ?? "Step"}</Text>
          </Pressable>
        ))}
      </GlassCard>
    </SafeAreaView>
  );
}

// Shown only before real routine data loads, so the screen isn't empty.
const PLACEHOLDER_STEPS: RoutineStep[] = [
  { id: "1", custom_name: "Cleanser", product_id: null },
  { id: "2", custom_name: "Vitamin C serum", product_id: null },
  { id: "3", custom_name: "Moisturizer", product_id: null },
  { id: "4", custom_name: "Sunscreen", product_id: null },
];

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.plum, padding: spacing.xl, paddingTop: spacing.xxl },
  title: { marginBottom: spacing.lg },
  row: { flexDirection: "row" },
  stat: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.ink, marginTop: 4 },
  stepRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.line },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: colors.inkSoft, marginRight: spacing.sm },
  dotDone: { backgroundColor: colors.gold, borderColor: colors.gold },
  stepLabel: { fontFamily: fonts.body, fontSize: 14, color: colors.ink },
});
