import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts, spacing, type } from "@/theme/tokens";
import { GlassCard } from "@/components/GlassCard";
import { AnimatedFlower } from "@/components/AnimatedFlower";
import { ProductSkeleton } from "@/components/ProductSkeleton";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { getLocalDateKey } from "@/lib/localDate";

type RoutineStep = { id: string; custom_name: string | null; product_id: string | null; custom_category: string | null; products: { name: string; category: string }[] | { name: string; category: string } | null };

export function HomeScreen({ navigation }: any) {
  const { session } = useAuth();
  const [streak, setStreak] = useState(0);
  const [steps, setSteps] = useState<RoutineStep[]>([]);
  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set());
  const [loadingSteps, setLoadingSteps] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    if (!session?.user) return;
    const userId = session.user.id;
    const today = getLocalDateKey();
    setLoadingSteps(true);
    setLoadError(null);
    void (async () => {
      const [stepResult, completionResult, streakResult] = await Promise.all([
        supabase.from("user_products").select("id, custom_name, product_id, custom_category, products(name, category)")
          .eq("user_id", userId).in("routine_slot", ["AM", "Both"])
          .or("source.is.null,source.in.(manual,recommendation_accepted)").order("step_order"),
        supabase.from("routine_step_completions").select("user_product_id")
          .eq("user_id", userId).eq("completion_date", today).eq("routine_slot", "AM"),
        supabase.rpc("recalculate_glowtrack_streak", { p_today: today }),
      ]);
      if (!active) return;
      if (stepResult.error) setLoadError(`Couldn't load your routine: ${stepResult.error.message}`);
      else {
        const categoryOrder: Record<string, number> = { cleanser: 0, serum: 1, moisturizer: 2, sunscreen: 3 };
        const loadedSteps = (stepResult.data ?? []) as unknown as RoutineStep[];
        setSteps(loadedSteps.sort((left, right) => {
          const leftProduct = Array.isArray(left.products) ? left.products[0] : left.products;
          const rightProduct = Array.isArray(right.products) ? right.products[0] : right.products;
          const leftCategory = (left.custom_category ?? leftProduct?.category ?? "other").toLowerCase();
          const rightCategory = (right.custom_category ?? rightProduct?.category ?? "other").toLowerCase();
          return (categoryOrder[leftCategory] ?? 4) - (categoryOrder[rightCategory] ?? 4);
        }));
      }
      const loadedDone = new Set((completionResult.data ?? []).map((row) => row.user_product_id));
      setCompletedToday(loadedDone);
      if (typeof streakResult.data === "number") setStreak(streakResult.data);
      else {
        const { data } = await supabase.from("streaks").select("current_streak").eq("user_id", userId).maybeSingle();
        if (active) setStreak(data?.current_streak ?? 0);
      }
      setLoadingSteps(false);
    })();
    return () => { active = false; };
  }, [session?.user, retryCount]));

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.welcomeHero}>
        <AnimatedFlower size={72} />
        <View style={styles.welcomeCopy}>
          <Text style={type.label}>A MOMENT FOR YOU</Text>
          <Text style={[type.h1, styles.title]}>Good morning</Text>
          <Text style={styles.welcomeNote}>One gentle step at a time.</Text>
        </View>
      </View>
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
        {loadingSteps ? <><AnimatedFlower size={58} /><ProductSkeleton count={2} /></> : null}
        {loadError ? <><Text accessibilityRole="alert" style={styles.empty}>{loadError}</Text><Pressable accessibilityRole="button" onPress={() => setRetryCount((count) => count + 1)} style={styles.linkButton}><Text style={styles.link}>Retry loading products  ›</Text></Pressable></> : null}
        {steps.map((step) => (
          <View key={step.id} style={styles.stepRow}>
            <View style={[styles.dot, completedToday.has(step.id) && styles.dotDone]} />
            <Text style={[styles.stepLabel, completedToday.has(step.id) && styles.stepDone]}>{step.custom_name ?? (Array.isArray(step.products) ? step.products[0]?.name : step.products?.name) ?? "Skincare product"}</Text>
          </View>
        ))}
        {!loadingSteps && !loadError && steps.length === 0 ? <Text style={styles.empty}>Your morning routine is empty. Add a product to your routine to see it here.</Text> : null}
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
  title: { marginBottom: 0 },
  welcomeHero: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  welcomeCopy: { flex: 1 },
  welcomeNote: { fontFamily: fonts.body, color: colors.inkSoft, fontSize: 11, marginTop: spacing.xs },
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
