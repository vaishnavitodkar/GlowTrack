import React, { useEffect, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts, spacing, type } from "@/theme/tokens";
import { GlassCard } from "@/components/GlassCard";
import { PrimaryButton } from "@/components/PrimaryButton";
import { AnimatedFlower } from "@/components/AnimatedFlower";
import { FadeInUp } from "@/components/FadeInUp";
import { ProductSkeleton } from "@/components/ProductSkeleton";
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
type RoutineSlot = "AM" | "PM" | "Both";

const ROUTINE_CATEGORIES = ["cleanser", "serum", "moisturizer", "sunscreen"];
const OWNED_SOURCES = ["manual", "recommendation_accepted"];

export function ProductRecommendationScreen({ navigation }: any) {
  const { session } = useAuth();
  const [picks, setPicks] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [addedTiming, setAddedTiming] = useState<Record<string, RoutineSlot>>({});
  const [profileReason, setProfileReason] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const saveLock = useRef(false);

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
        supabase.from("skin_profiles").select("skin_type, concerns").eq("user_id", userId),
        supabase.from("user_products").select("product_id, routine_slot, source").eq("user_id", userId),
      ]);
      if (!active) return;
      if (profileResult.error || ownedResult.error) {
        const error = profileResult.error ?? ownedResult.error;
        setLoadingError(`Couldn't check your assessment and products: ${error?.message ?? "Unknown error"}`);
        setLoading(false);
        return;
      }

      const profileRows = profileResult.data ?? [];
      const profileSkinTypes = [...new Set(profileRows.map((profile) => profile.skin_type).filter(Boolean))];
      if (profileSkinTypes.length > 1) {
        setLoadingError("Your saved skin profiles need to be reconciled before recommendations can be personalized. Your account and products are safe; please retry after the profile migration is applied.");
        setLoading(false);
        return;
      }
      const skinType = profileSkinTypes[0] ?? null;
      const concerns = [...new Set(profileRows.flatMap((profile) => profile.concerns ?? []))];
      setProfileReason(skinType || concerns.length ? "Chosen from catalog options matching your saved skin profile and goals." : "A catalog option for this routine category.");
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
        if (skinType) query = query.contains("suitable_skin_types", [skinType]);
        if (concerns.length) query = query.overlaps("suitable_concerns", concerns);
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
  }, [session?.user, retryCount]);

  const addToRoutine = async (product: Product, choice: RoutineSlot) => {
    if (!session?.user || saveLock.current || savingKey) return;
    if (addedTiming[product.id]) return;
    const key = `${product.id}:${choice}`;
    saveLock.current = true; setSavingKey(key);
    try {
      const { data: existing, error: findError } = await supabase
        .from("user_products")
        .select("routine_slot")
        .eq("user_id", session.user.id)
        .eq("product_id", product.id)
        .in("routine_slot", ["AM", "PM", "Both"])
        .or("source.is.null,source.in.(manual,recommendation_accepted)")
        .limit(1);
      if (findError) throw findError;
      if (existing?.length) { setAddedTiming((current) => ({ ...current, [product.id]: choice })); return; }
      const { data: slotRows, error: orderError } = await supabase
        .from("user_products")
        .select("step_order, source")
        .eq("user_id", session.user.id)
        .in("routine_slot", ["AM", "PM", "Both"]);
      if (orderError) throw orderError;
      const visibleRows = (slotRows ?? []).filter((row) => OWNED_SOURCES.includes(row.source ?? "manual"));
      const { error } = await supabase.from("user_products").insert({
        user_id: session.user.id,
        product_id: product.id,
        custom_name: null,
        routine_slot: choice,
        step_order: Math.max(0, ...visibleRows.map((row) => row.step_order ?? 0)) + 1,
        source: "recommendation_accepted",
      });
      if (error) throw error;
      setAddedTiming((current) => ({ ...current, [product.id]: choice }));
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown error";
      Alert.alert("Couldn't add this product", `${detail}\nIt has not been added to your routine.`);
    } finally {
      saveLock.current = false; setSavingKey(null);
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
        <Text style={[type.body, styles.sub]}>Choose a cleanser, serum, moisturizer, and sunscreen for AM, PM, or both. Recommendations stay optional; you can add products you already own too.</Text>
        {loading ? <View style={styles.loading}><AnimatedFlower size={100} /><Text style={styles.note}>Finding suitable options…</Text><ProductSkeleton count={4} /></View> : null}
        {loadingError ? <><Text accessibilityRole="alert" style={styles.error}>{loadingError}</Text><PrimaryButton label="Retry" variant="ghost" onPress={() => { setLoading(true); setRetryCount((count) => count + 1); }} /></> : null}
        {!loading && !loadingError && picks.length === 0 ? <Text style={styles.note}>No catalog suggestions are available right now. You can still add your own products below.</Text> : null}

        {!loading && !loadingError && ROUTINE_CATEGORIES.map((category, index) => {
          const product = picks.find((item) => item.category === category);
          return <FadeInUp key={category} delay={index * 65}><GlassCard style={{ marginBottom: spacing.sm }}>
            <Text style={styles.category}>{category}</Text>
            {product ? <>
              <Text style={styles.name}>{product.name}</Text>
              {product.description ? <Text style={styles.note}>{product.description}</Text> : null}
              <Text style={styles.meta}>{product.price == null ? "Price unavailable" : `₹${product.price}`}{product.breakout_safe ? " · Breakout-safe" : ""}</Text>
              <Text style={styles.reason}>{profileReason}</Text>
              {addedTiming[product.id] ? <FadeInUp key={`added:${product.id}`}><Text accessibilityRole="text" style={styles.added}>✓ Added to {addedTiming[product.id] === "Both" ? "AM + PM" : addedTiming[product.id]}</Text></FadeInUp> : <View style={styles.actions}>
                {(["AM", "PM", "Both"] as const).map((slot) => (
                  <PrimaryButton key={slot} label={slot === "Both" ? "Both" : slot} variant="ghost" loading={savingKey === `${product.id}:${slot}`} disabled={savingKey !== null} onPress={() => { void addToRoutine(product, slot); }} style={styles.action} />
                ))}
              </View>}
            </> : <Text style={styles.note}>No suggestion available · add a product you own instead.</Text>}
          </GlassCard></FadeInUp>;
        })}
      </ScrollView>
      <PrimaryButton label="Add my own products" variant="ghost" onPress={onContinue} style={{ marginTop: spacing.md }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.plum, padding: spacing.xl, paddingTop: spacing.xxl },
  content: { paddingBottom: spacing.md },
  loading: { alignItems: "center", paddingVertical: spacing.lg, gap: spacing.sm },
  title: { marginBottom: spacing.xs },
  sub: { marginBottom: spacing.lg },
  note: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft, lineHeight: 18 },
  reason: { fontFamily: fonts.body, fontSize: 10, color: colors.inkSoft, lineHeight: 15, marginTop: spacing.sm },
  added: { color: colors.gold, fontFamily: fonts.bodyBold, fontSize: 12, marginTop: spacing.md },
  error: { fontFamily: fonts.body, fontSize: 12, color: colors.danger, marginBottom: spacing.md },
  category: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.gold, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  name: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink, marginBottom: 4 },
  meta: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft, marginTop: spacing.xs },
  actions: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.sm },
  action: { flex: 1 },
});
