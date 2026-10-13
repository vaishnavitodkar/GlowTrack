import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts, spacing, type } from "@/theme/tokens";
import { GlassCard } from "@/components/GlassCard";
import { PrimaryButton } from "@/components/PrimaryButton";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type Product = {
  id: string;
  name: string;
  price: number | null;
  category: string;
  breakout_safe: boolean | null;
  description: string | null;
};
type RoutineSlot = "AM" | "PM";

const ROUTINE_CATEGORIES = ["cleanser", "serum", "moisturizer", "sunscreen", "treatment"];
const OWNED_SOURCES = ["manual", "recommendation_accepted"];

export function ProductRecommendationScreen({ navigation }: any) {
  const { session } = useAuth();
  const [picks, setPicks] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!session?.user) {
      setPicks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadingError(null);
    void (async () => {
      const userId = session.user.id;
      const [profileResult, ownedResult] = await Promise.all([
        supabase.from("skin_profiles").select("skin_type, concerns").eq("user_id", userId).maybeSingle(),
        supabase.from("user_products").select("product_id, routine_slot, source").eq("user_id", userId),
      ]);
      if (!active) return;
      if (profileResult.error || ownedResult.error) {
        const error = profileResult.error ?? ownedResult.error;
        setLoadingError(`Couldn't check your assessment and products: ${error?.message ?? "Unknown error"}`);
        setLoading(false);
        return;
      }

      const owned: Record<string, RoutineSlot[]> = {};
      for (const row of ownedResult.data ?? []) {
        if (!row.product_id || !OWNED_SOURCES.includes(row.source ?? "manual")) continue;
        const slot = row.routine_slot as RoutineSlot;
        owned[row.product_id] = [...(owned[row.product_id] ?? []), slot];
      }
      const products = await Promise.all(ROUTINE_CATEGORIES.map(async (category) => {
        let query = supabase
          .from("products")
          .select("id, name, price, category, breakout_safe, description, suitable_skin_types, suitable_concerns")
          .eq("category", category)
          .order("name")
          .limit(5);
        if (profileResult.data?.skin_type) query = query.contains("suitable_skin_types", [profileResult.data.skin_type]);
        if (profileResult.data?.concerns?.length) query = query.overlaps("suitable_concerns", profileResult.data.concerns);
        const result = await query;
        if (result.error) throw result.error;
        return (result.data ?? []).find((product) => !owned[product.id]?.length) ?? null;
      })).catch((error: unknown) => {
        if (active) setLoadingError((current) => current ?? `Couldn't load recommendations: ${error instanceof Error ? error.message : "Unknown error"}`);
        return [];
      });
      if (!active) return;
      setPicks(products.filter((product) => product !== null) as Product[]);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [session?.user]);

  const addToRoutine = async (product: Product, slot: RoutineSlot) => {
    if (!session?.user || savingKey) return;
    const key = `${product.id}:${slot}`;
    setSavingKey(key);
    try {
      const { data: existing, error: findError } = await supabase
        .from("user_products")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("product_id", product.id)
        .eq("routine_slot", slot)
        .or("source.is.null,source.in.(manual,recommendation_accepted)")
        .limit(1);
      if (findError) throw findError;
      if (existing?.length) {
        setPicks((current) => current.filter((pick) => pick.id !== product.id));
        return;
      }

      const { data: slotRows, error: orderError } = await supabase
        .from("user_products")
        .select("step_order, source")
        .eq("user_id", session.user.id)
        .eq("routine_slot", slot);
      if (orderError) throw orderError;
      const visibleRows = (slotRows ?? []).filter((row) => OWNED_SOURCES.includes(row.source ?? "manual"));
      const stepOrder = Math.max(0, ...visibleRows.map((row) => row.step_order ?? 0)) + 1;
      const { error } = await supabase.from("user_products").insert({
        user_id: session.user.id,
        product_id: product.id,
        custom_name: null,
        routine_slot: slot,
        step_order: stepOrder,
        source: "recommendation_accepted",
      });
      if (error) throw error;
      setPicks((current) => current.filter((pick) => pick.id !== product.id));
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown error";
      Alert.alert("Couldn't add this product", `${detail}\nIt has not been added to your routine.`);
    } finally {
      setSavingKey(null);
    }
  };

  const routeNames: string[] = navigation?.getState?.()?.routeNames ?? [];
  const onContinue = () => {
    if (routeNames.includes("AddExistingProducts")) navigation.navigate("AddExistingProducts");
    else navigation.navigate("Routine");
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={type.label}>Optional suggestions</Text>
        <Text style={[type.h1, styles.title]}>Recommended products</Text>
        <Text style={[type.body, styles.sub]}>These are suggestions, not products you own. Choose Add to AM or Add to PM to put one in your routine.</Text>
        {loading ? <Text style={styles.note}>Finding suitable options…</Text> : null}
        {loadingError ? <Text accessibilityRole="alert" style={styles.error}>{loadingError}</Text> : null}
        {!loading && !loadingError && picks.length === 0 ? <Text style={styles.note}>No additional recommendations are available right now.</Text> : null}

        {picks.map((product) => (
          <GlassCard key={product.id} style={{ marginBottom: spacing.sm }}>
            <Text style={styles.category}>{product.category}</Text>
            <Text style={styles.name}>{product.name}</Text>
            {product.description ? <Text style={styles.note}>{product.description}</Text> : null}
            <Text style={styles.meta}>{product.price == null ? "Price unavailable" : `₹${product.price}`}{product.breakout_safe ? " · Breakout-safe" : ""}</Text>
            <View style={styles.actions}>
              {(["AM", "PM"] as const).map((slot) => (
                <PrimaryButton
                  key={slot}
                  label={`Add to ${slot}`}
                  variant="ghost"
                  loading={savingKey === `${product.id}:${slot}`}
                  disabled={savingKey !== null}
                  onPress={() => { void addToRoutine(product, slot); }}
                  style={styles.action}
                />
              ))}
            </View>
          </GlassCard>
        ))}
      </ScrollView>
      <PrimaryButton label="Continue to my products" onPress={onContinue} style={{ marginTop: spacing.md }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.plum, padding: spacing.xl, paddingTop: spacing.xxl },
  content: { paddingBottom: spacing.md },
  title: { marginBottom: spacing.xs },
  sub: { marginBottom: spacing.lg },
  note: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft, lineHeight: 18 },
  error: { fontFamily: fonts.body, fontSize: 12, color: colors.danger, marginBottom: spacing.md },
  category: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.gold, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  name: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink, marginBottom: 4 },
  meta: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft, marginTop: spacing.xs },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  action: { flex: 1 },
});
