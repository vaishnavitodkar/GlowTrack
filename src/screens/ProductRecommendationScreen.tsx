import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radii, type, fonts } from "@/theme/tokens";
import { GlassCard } from "@/components/GlassCard";
import { PrimaryButton } from "@/components/PrimaryButton";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type Product = { id: string; name: string; price: number | null; category: string; breakout_safe: boolean | null };

// Every basic daily routine needs one product from each of these, in this order.
const ROUTINE_CATEGORIES = ["cleanser", "serum", "moisturizer", "sunscreen"] as const;

export function ProductRecommendationScreen({ navigation }: any) {
  const { session } = useAuth();
  const [picks, setPicks] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      const { data: profile } = await supabase
        .from("skin_profiles")
        .select("skin_type")
        .eq("user_id", session.user.id)
        .maybeSingle();

      // One query per category so every slot in the routine gets filled,
      // rather than one query that happens to return several of the same type.
      const results = await Promise.all(
        ROUTINE_CATEGORIES.map(async (category) => {
          let query = supabase.from("products").select("*").eq("category", category).limit(1);
          if (profile?.skin_type) query = query.contains("suitable_skin_types", [profile.skin_type]);
          const { data } = await query;
          return data?.[0] ?? null;
        })
      );

      setPicks(results.filter((p): p is Product => !!p));
      setLoading(false);
    })();
  }, [session?.user]);

  const onContinue = async () => {
    if (!session?.user || !picks.length) {
      navigation.navigate("AddExistingProducts");
      return;
    }
    setSaving(true);

    // Save this as the user's actual AM routine, in category order, so Home
    // and Routine screens show these real picks instead of placeholder steps.
    const rows = picks.map((p, i) => ({
      user_id: session.user.id,
      product_id: p.id,
      routine_slot: "AM",
      step_order: i + 1,
      source: "recommended",
    }));
    const { error } = await supabase.from("user_products").insert(rows);

    setSaving(false);
    if (error) console.warn("Could not save recommended routine:", error.message);
    navigation.navigate("AddExistingProducts");
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        <Text style={type.label}>Your match</Text>
        <Text style={[type.h1, styles.title]}>Your basic routine</Text>
        <Text style={[type.body, styles.sub]}>One pick per step — everything your routine needs, nothing extra.</Text>

        {loading && <Text style={styles.loading}>Finding your matches…</Text>}

        {(picks.length ? picks : PLACEHOLDER).map((p) => (
          <GlassCard key={p.id} style={{ marginBottom: spacing.sm }}>
            <Text style={styles.category}>{p.category}</Text>
            <Text style={styles.name}>{p.name}</Text>
            <Text style={styles.meta}>₹{p.price}{p.breakout_safe ? " · Breakout-safe" : ""}</Text>
          </GlassCard>
        ))}
      </ScrollView>

      <PrimaryButton label="Build my routine" onPress={onContinue} loading={saving} style={{ marginTop: spacing.md }} />
    </SafeAreaView>
  );
}

const PLACEHOLDER: Product[] = [
  { id: "p1", name: "Salicylic Acid Cleanser", price: 399, category: "cleanser", breakout_safe: true },
  { id: "p2", name: "Niacinamide Serum", price: 549, category: "serum", breakout_safe: true },
  { id: "p3", name: "Gel Moisturizer", price: 450, category: "moisturizer", breakout_safe: true },
  { id: "p4", name: "Mineral Sunscreen SPF 50", price: 625, category: "sunscreen", breakout_safe: true },
];

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.plum, padding: spacing.xl, paddingTop: spacing.xxl },
  title: { marginBottom: spacing.xs },
  sub: { marginBottom: spacing.lg },
  loading: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft, marginBottom: spacing.md },
  category: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.gold, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  name: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink, marginBottom: 2 },
  meta: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft },
});