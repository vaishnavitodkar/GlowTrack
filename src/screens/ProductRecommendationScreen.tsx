import React, { useEffect, useRef, useState } from "react";
import { Alert, Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts, spacing, type } from "@/theme/tokens";
import { GlassCard } from "@/components/GlassCard";
import { PrimaryButton } from "@/components/PrimaryButton";
import { AnimatedFlower } from "@/components/AnimatedFlower";
import { FadeInUp } from "@/components/FadeInUp";
import { ProductSkeleton } from "@/components/ProductSkeleton";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { getPersonalizedRecommendations, type AssistantCitation } from "@/lib/skincareAssistant";

type Product = {
  id: string; name: string; brand: string | null; image_url?: string | null; price: number | null; category: string;
  breakout_safe: boolean | null; suitable_skin_types: string[] | null; suitable_concerns: string[] | null;
  description: string | null; ingredients?: string[] | null; affiliate_link?: string | null;
  ai_reason?: string; ai_precautions?: string; ai_sources?: AssistantCitation[];
};
type RoutineSlot = "AM" | "PM" | "Both";
const OWNED_SOURCES = ["manual", "recommendation_accepted"];

export function ProductRecommendationScreen({ navigation }: any) {
  const { session } = useAuth();
  const [picks, setPicks] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedTiming, setSelectedTiming] = useState<Record<string, RoutineSlot>>({});
  const [personalizedNote, setPersonalizedNote] = useState("");
  const [budgetInput, setBudgetInput] = useState("");
  const budgetRef = useRef("");
  const [retryCount, setRetryCount] = useState(0);
  const saveLock = useRef(false);

  useEffect(() => {
    let active = true;
    if (!session?.user) { setPicks([]); setLoading(false); setLoadingError("Sign in to request personalized recommendations."); return; }
    setLoading(true); setLoadingError(null); setPersonalizedNote("");
    void (async () => {
      try {
        const userId = session.user.id;
        const [profileResult, ownedResult] = await Promise.all([
          supabase.from("skin_profiles").select("skin_type").eq("user_id", userId),
          supabase.from("user_products").select("product_id, custom_category, routine_slot, source, products(category)").eq("user_id", userId),
        ]);
        if (profileResult.error) throw new Error(`Couldn't load your skin assessment: ${profileResult.error.message}`);
        if (ownedResult.error) throw new Error(`Couldn't load your products: ${ownedResult.error.message}`);
        const profileRows = profileResult.data ?? [];
        if (!profileRows.length || !profileRows.some((profile) => profile.skin_type)) {
          throw new Error("Complete your skin assessment before requesting personalized recommendations.");
        }
        const skinTypes = [...new Set(profileRows.map((profile) => profile.skin_type).filter(Boolean))];
        if (skinTypes.length > 1) throw new Error("Your saved assessment has conflicting skin types. Please review it before requesting recommendations.");
        const budget = budgetRef.current.trim() ? Number(budgetRef.current) : null;
        const result = await getPersonalizedRecommendations(
          "Recommend products suitable for my saved assessment, concerns, sensitivities, previous reactions, goals, and owned products. Consider the optional total budget. Use only catalog products and source citations.",
          budget != null && Number.isFinite(budget) && budget >= 0 ? budget : null,
        );
        if (result.evidenceAvailable !== true) throw new Error("The skincare reference documents are not indexed or retrieval is unavailable. Source-backed recommendations are withheld until retrieval works.");
        const recommendations = result.recommendations ?? [];
        const ids = [...new Set(recommendations.map((item) => item.product.id))];
        let catalogById = new Map<string, Product>();
        if (ids.length) {
          const { data, error } = await supabase.from("products")
            .select("id, name, brand, image_url, price, category, breakout_safe, suitable_skin_types, suitable_concerns, description, ingredients, affiliate_link")
            .in("id", ids);
          if (error) throw new Error(`Couldn't verify recommended catalog products: ${error.message}`);
          catalogById = new Map(((data ?? []) as Product[]).map((product) => [product.id, product]));
        }
        const ownedIds = new Set((ownedResult.data ?? []).filter((row) => OWNED_SOURCES.includes(row.source ?? "manual")).map((row) => row.product_id).filter(Boolean));
        const validated = recommendations.flatMap(({ product, reason, precautions, sources }) => {
          const catalogProduct = catalogById.get(product.id);
          if (!catalogProduct || ownedIds.has(product.id) || !sources.length) return [];
          return [{ ...catalogProduct, ai_reason: reason, ai_precautions: precautions, ai_sources: sources }];
        });
        if (!active) return;
        setPicks(validated);
        setPersonalizedNote(result.answer ?? "");
        setSelectedIds(new Set());
        setSavedIds(ownedIds);
      } catch (error) {
        if (active) setLoadingError(error instanceof Error ? error.message : "The source-backed recommendation service is unavailable. Please try again.");
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [session?.user, retryCount]);

  const toggleSelected = (id: string) => setSelectedIds((current) => {
    const next = new Set(current); if (next.has(id)) next.delete(id); else if (!savedIds.has(id)) next.add(id); return next;
  });

  const addSelected = async () => {
    if (!session?.user || saveLock.current || !selectedIds.size) return;
    saveLock.current = true; setSaving(true);
    try {
      const ids = [...selectedIds];
      const { data: existing, error: existingError } = await supabase.from("user_products").select("product_id")
        .eq("user_id", session.user.id).in("product_id", ids).or("source.is.null,source.in.(manual,recommendation_accepted)");
      if (existingError) throw existingError;
      const existingIds = new Set((existing ?? []).map((row) => row.product_id));
      const { data: orderRows, error: orderError } = await supabase.from("user_products").select("step_order, source").eq("user_id", session.user.id);
      if (orderError) throw orderError;
      const rows = picks.filter((product) => ids.includes(product.id) && !existingIds.has(product.id)).map((product, index) => ({
        user_id: session.user!.id, product_id: product.id, custom_name: null,
        routine_slot: selectedTiming[product.id] ?? (product.category.toLowerCase() === "sunscreen" ? "AM" : "Both"),
        step_order: Math.max(0, ...(orderRows ?? []).filter((row) => OWNED_SOURCES.includes(row.source ?? "manual")).map((row) => row.step_order ?? 0)) + index + 1,
        source: "recommendation_accepted",
      }));
      if (rows.length) {
        const { error } = await supabase.from("user_products").insert(rows);
        if (error) throw error;
      }
      setSavedIds((current) => new Set([...current, ...ids])); setSelectedIds(new Set());
      Alert.alert("Products added", `${rows.length} selected product${rows.length === 1 ? " was" : "s were"} added to your products.`);
    } catch (error) {
      Alert.alert("Couldn't add selected products", error instanceof Error ? error.message : "Please try again. No unconfirmed products were added.");
    } finally { saveLock.current = false; setSaving(false); }
  };

  const routeNames: string[] = navigation?.getState?.()?.routeNames ?? [];
  const openManual = () => {
    if (routeNames.includes("AddExistingProducts")) navigation.navigate("AddExistingProducts");
    else if (routeNames.includes("Products")) navigation.navigate("Products");
    else navigation.getParent?.()?.navigate("Products");
  };
  const goRoutine = () => {
    if (routeNames.includes("Routine")) navigation.navigate("Routine");
    else navigation.navigate("Tabs", { screen: "Routine" });
  };

  return <SafeAreaView style={styles.screen}>
    <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}>
        <Pressable accessibilityRole="button" onPress={() => navigation.canGoBack?.() ? navigation.goBack() : openManual()} style={styles.backButton}><Text style={styles.backText}>‹  Back</Text></Pressable>
        <Text style={type.label}>Optional suggestions</Text>
        <Text style={[type.h1, styles.title]}>Recommended products</Text>
        <Text style={[type.body, styles.sub]}>Recommendations are generated from your saved assessment, indexed skincare sources, and the actual product catalog. Nothing is saved until you select it.</Text>
        <View style={styles.budgetRow}><Text style={styles.budgetLabel}>Optional total budget (₹)</Text><TextInput accessibilityLabel="Optional total budget in rupees" keyboardType="numeric" value={budgetInput}
          onChangeText={(value) => { const next = value.replace(/[^0-9]/g, "").slice(0, 7); budgetRef.current = next; setBudgetInput(next); }}
          onEndEditing={() => setRetryCount((count) => count + 1)} placeholder="No budget limit" placeholderTextColor={colors.inkSoft} style={styles.budgetInput} maxLength={7} /></View>
        {personalizedNote ? <Text style={styles.recommendationNote}>{personalizedNote}</Text> : null}
        {loading ? <View style={styles.loading}><AnimatedFlower size={100} /><Text style={styles.note}>Finding source-backed options…</Text><ProductSkeleton count={3} /></View> : null}
        {loadingError ? <><Text accessibilityRole="alert" style={styles.error}>{loadingError}</Text><PrimaryButton label="Retry" variant="ghost" onPress={() => { setLoading(true); setRetryCount((count) => count + 1); }} /></> : null}
        {!loading && !loadingError && !picks.length ? <Text style={styles.note}>No source-backed catalog products were returned. Add your own products or try again after the knowledge base has more relevant documents.</Text> : null}
        {!loading && !loadingError ? picks.map((product, index) => <FadeInUp key={product.id} delay={index * 50}><GlassCard style={styles.card}>
          <View style={styles.productTop}><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selectedIds.has(product.id), disabled: savedIds.has(product.id) }} disabled={savedIds.has(product.id) || saving} onPress={() => toggleSelected(product.id)} style={[styles.checkbox, selectedIds.has(product.id) && styles.checkboxOn]}><Text style={styles.checkboxText}>{savedIds.has(product.id) || selectedIds.has(product.id) ? "✓" : ""}</Text></Pressable><View style={styles.productBody}>
            {product.image_url ? <Image source={{ uri: product.image_url }} accessibilityLabel={`${product.name} product image`} style={styles.productImage} resizeMode="cover" /> : null}
            <Text style={styles.category}>{product.category}</Text><Text style={styles.name}>{product.name}</Text>
            {product.brand ? <Text style={styles.note}>{product.brand}</Text> : null}
            {product.description ? <Text style={styles.note}>{product.description}</Text> : null}
            {product.ingredients?.length ? <Text style={styles.note}>Ingredients: {product.ingredients.join(", ")}</Text> : null}
            <Text style={styles.meta}>{product.price == null ? "Price unavailable" : `₹${product.price}`}{product.breakout_safe ? " · Catalog marked breakout-safe" : ""}</Text>
            <Text style={styles.reason}>{product.ai_reason}</Text>
            {product.ai_precautions ? <Text style={styles.precaution}>Precautions: {product.ai_precautions}</Text> : null}
            {product.ai_sources?.length ? <View style={styles.sources}><Text style={styles.sourceHeading}>Evidence</Text>{product.ai_sources.map((source) => <Text key={`${source.chunkId}-${source.pageNumber}`} style={styles.sourceText}>{source.documentName}{source.pageNumber ? ` · p. ${source.pageNumber}` : ""}</Text>)}</View> : null}
            {savedIds.has(product.id) ? <Text style={styles.added}>Already in your products</Text> : <View style={styles.actions}>{(["AM", "PM", "Both"] as const).map((slot) => <PrimaryButton key={slot} label={slot} variant="ghost" disabled={saving} onPress={() => setSelectedTiming((current) => ({ ...current, [product.id]: slot }))} style={{ ...styles.action, borderColor: (selectedTiming[product.id] ?? (product.category.toLowerCase() === "sunscreen" ? "AM" : "Both")) === slot ? colors.gold : colors.line }} />)}</View>}
          </View></View>
        </GlassCard></FadeInUp>) : null}
        {selectedIds.size ? <PrimaryButton label={`Add ${selectedIds.size} selected to my products`} onPress={() => { Keyboard.dismiss(); void addSelected(); }} loading={saving} disabled={saving} /> : null}
        <PrimaryButton label="Add My Own Products" variant="ghost" onPress={openManual} style={{ marginTop: spacing.md }} />
        <PrimaryButton label="Build My Routine" variant="ghost" onPress={goRoutine} style={{ marginTop: spacing.xs }} />
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.plum, padding: spacing.xl, paddingTop: spacing.xxl }, keyboard: { flex: 1 }, content: { paddingBottom: spacing.md },
  loading: { alignItems: "center", paddingVertical: spacing.lg, gap: spacing.sm }, title: { marginBottom: spacing.xs }, sub: { marginBottom: spacing.lg },
  budgetRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, marginBottom: spacing.md }, budgetLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.inkSoft, flex: 1 },
  budgetInput: { minWidth: 120, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, color: colors.ink, fontFamily: fonts.body, fontSize: 12, textAlign: "right" },
  recommendationNote: { fontFamily: fonts.body, color: colors.inkSoft, fontSize: 11, lineHeight: 16, marginBottom: spacing.md }, note: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft, lineHeight: 18 },
  reason: { fontFamily: fonts.body, fontSize: 10, color: colors.inkSoft, lineHeight: 15, marginTop: spacing.sm }, precaution: { fontFamily: fonts.body, fontSize: 10, color: colors.gold, lineHeight: 15, marginTop: spacing.xs },
  sources: { marginTop: spacing.sm, gap: 3 }, sourceHeading: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.gold }, sourceText: { fontFamily: fonts.body, fontSize: 10, color: colors.inkSoft },
  added: { color: colors.gold, fontFamily: fonts.bodyBold, fontSize: 11, marginTop: spacing.md }, error: { fontFamily: fonts.body, fontSize: 12, color: colors.danger, marginBottom: spacing.md },
  card: { marginBottom: spacing.sm }, productTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }, productBody: { flex: 1 }, productImage: { width: 92, height: 92, borderRadius: 12, backgroundColor: colors.glass, marginBottom: spacing.sm }, checkbox: { width: 24, height: 24, borderWidth: 1.5, borderColor: colors.inkSoft, borderRadius: 6, alignItems: "center", justifyContent: "center", marginTop: spacing.xs }, checkboxOn: { backgroundColor: colors.gold, borderColor: colors.gold }, checkboxText: { color: colors.white, fontFamily: fonts.bodyBold },
  category: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.gold, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }, name: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink, marginBottom: 4 }, meta: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft, marginTop: spacing.xs },
  actions: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.sm }, action: { flex: 1 }, backButton: { alignSelf: "flex-start", paddingVertical: spacing.xs, paddingRight: spacing.md, marginBottom: spacing.sm }, backText: { color: colors.gold, fontFamily: fonts.bodyBold, fontSize: 13 },
});
