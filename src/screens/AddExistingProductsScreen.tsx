import React, { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedFlower } from "@/components/AnimatedFlower";
import { FadeInUp } from "@/components/FadeInUp";
import { Pill } from "@/components/Pill";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ProductSkeleton } from "@/components/ProductSkeleton";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { colors, fonts, radii, spacing, type } from "@/theme/tokens";

type Slot = "AM" | "PM" | "Both";
type Category = "cleanser" | "serum" | "moisturizer" | "sunscreen" | "other";
type OwnedProduct = {
  id: string;
  custom_name: string | null;
  custom_category: string | null;
  usage_instructions: string | null;
  routine_slot: Slot;
  source: string | null;
  products?: { name: string; category?: string }[] | { name: string; category?: string } | null;
};
const CORE_CATEGORIES: { value: Exclude<Category, "other">; label: string; icon: string; help: string }[] = [
  { value: "cleanser", label: "Cleanser", icon: "🫧", help: "A gentle first step" },
  { value: "serum", label: "Serum", icon: "💧", help: "A concentrated step" },
  { value: "moisturizer", label: "Moisturizer", icon: "🧴", help: "Comfort and hydration" },
  { value: "sunscreen", label: "Sunscreen", icon: "☀️", help: "Your daytime protection" },
];
const OWNED_SOURCES = ["manual", "recommendation_accepted"];

function displayName(product: OwnedProduct) {
  return product.custom_name ?? (Array.isArray(product.products) ? product.products[0]?.name : product.products?.name) ?? "Product";
}
function displayCategory(product: OwnedProduct) {
  return product.custom_category ?? (Array.isArray(product.products) ? product.products[0]?.category : product.products?.category) ?? null;
}

export function AddExistingProductsScreen({ navigation }: any) {
  const { session } = useAuth();
  const [products, setProducts] = useState<OwnedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newInstructions, setNewInstructions] = useState("");
  const [newSlot, setNewSlot] = useState<Slot | null>(null);
  const [newCategory, setNewCategory] = useState<Category>("cleanser");
  const [otherCategory, setOtherCategory] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const editingProduct = useMemo(() => products.find((product) => product.id === editingId) ?? null, [editingId, products]);

  const loadProducts = useCallback(async () => {
    if (!session?.user) { setLoading(false); return; }
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from("user_products")
      .select("id, custom_name, custom_category, routine_slot, usage_instructions, source, products(name, category)")
      .eq("user_id", session.user.id)
      .or("source.is.null,source.in.(manual,recommendation_accepted)")
      .order("step_order");
    if (queryError) setError(`Couldn't load your products: ${queryError.message}`);
    else { setProducts((data ?? []) as unknown as OwnedProduct[]); setError(null); }
    setLoading(false);
  }, [session?.user]);
  useFocusEffect(useCallback(() => { void loadProducts(); }, [loadProducts]));

  const openAdd = (category: Category) => {
    setEditingId(null);
    setNewName("");
    setNewInstructions("");
    setNewCategory(category);
    setOtherCategory("");
    setNewSlot(category === "sunscreen" ? "AM" : null);
    setFormError(null);
    setShowAddForm(true);
  };
  const openEdit = (product: OwnedProduct) => {
    setEditingId(product.id);
    setNewSlot(product.routine_slot);
    setFormError(null);
    setShowAddForm(true);
  };

  const saveProduct = async () => {
    if (!session?.user || saveLock.current || saving || loading || error) return;
    if (!newSlot) { setFormError("Choose AM, PM, or Both before saving."); return; }
    const name = newName.trim();
    if (!editingProduct && !name) { setFormError("Enter the name shown on your product."); return; }
    const categoryValue = newCategory === "other" ? otherCategory.trim() : newCategory;
    if (!editingProduct && newCategory === "other" && !categoryValue) { setFormError("Enter a category for this product."); return; }
    saveLock.current = true; setSaving(true); setFormError(null);
    try {
      if (editingProduct) {
        const { data, error: updateError } = await supabase.from("user_products")
          .update({ routine_slot: newSlot })
          .eq("id", editingProduct.id).eq("user_id", session.user.id)
          .select("id, custom_name, custom_category, routine_slot, usage_instructions, source, products(name, category)").single();
        if (updateError) throw updateError;
        setProducts((current) => current.map((item) => item.id === editingProduct.id ? data as unknown as OwnedProduct : item));
      } else {
        const { data: duplicate, error: duplicateError } = await supabase.from("user_products")
          .select("id").eq("user_id", session.user.id).ilike("custom_name", name).limit(1);
        if (duplicateError) throw duplicateError;
        if (duplicate?.length) { setFormError("That product name is already in your collection."); return; }
        const { data: rows, error: orderError } = await supabase.from("user_products")
          .select("step_order, source").eq("user_id", session.user.id).in("routine_slot", ["AM", "PM", "Both"]);
        if (orderError) throw orderError;
        const stepOrder = Math.max(0, ...(rows ?? []).filter((row) => OWNED_SOURCES.includes(row.source ?? "manual")).map((row) => row.step_order ?? 0)) + 1;
        const { data, error: insertError } = await supabase.from("user_products").insert({
          user_id: session.user.id, product_id: null, custom_name: name,
          custom_category: categoryValue, usage_instructions: newInstructions.trim() || null,
          routine_slot: newSlot, step_order: stepOrder, source: "manual",
        }).select("id, custom_name, custom_category, routine_slot, usage_instructions, source, products(name, category)").single();
        if (insertError) throw insertError;
        setProducts((current) => [...current, data as unknown as OwnedProduct]);
      }
      setShowAddForm(false); setEditingId(null); setNewName(""); setNewInstructions(""); setNewSlot(null);
    } catch (saveError) {
      setFormError(`Couldn't save this product. Your saved products are unchanged. ${saveError instanceof Error ? saveError.message : "Please try again."}`);
    } finally { saveLock.current = false; setSaving(false); }
  };

  const countFor = (category: string) => products.filter((product) => displayCategory(product)?.toLowerCase() === category).length;
  const timingLabel = (slot: Slot) => slot === "Both" ? "AM + PM" : slot;
  const onContinue = () => {
    const names: string[] = navigation?.getState?.()?.routeNames ?? [];
    if (names.includes("Routine")) navigation.navigate("Routine");
    else navigation.navigate("Tabs", { screen: "Routine" });
  };

  return <SafeAreaView style={styles.screen}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <Text style={type.label}>Your shelf</Text>
      <Text style={[type.h1, styles.title]}>Add my products</Text>
      <Text style={[type.body, styles.sub]}>Start with the products you own. Pick when you use each one; you can skip any category.</Text>

      {loading ? <ProductSkeleton count={4} /> : error ? <View>
        <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
        <PrimaryButton label="Retry" variant="ghost" onPress={() => { void loadProducts(); }} />
      </View> : <>
        <View style={styles.categoryGrid}>
          {CORE_CATEGORIES.map((category, index) => {
            const count = countFor(category.value);
            return <FadeInUp key={category.value} delay={index * 55} style={styles.categoryCell}>
              <Pressable accessibilityRole="button" onPress={() => openAdd(category.value)} style={({ pressed }) => [styles.categoryCard, pressed && styles.pressed]}>
                <View style={styles.categoryTop}><Text style={styles.categoryIcon}>{category.icon}</Text><Text style={styles.categoryStatus}>{count ? `${count} added` : "Not added"}</Text></View>
                <Text style={styles.categoryName}>{category.label}</Text>
                <Text style={styles.categoryHelp}>{category.help}</Text>
              </Pressable>
            </FadeInUp>;
          })}
        </View>
        <Pressable accessibilityRole="button" onPress={() => openAdd("other")} style={styles.otherButton}>
          <Text style={styles.otherButtonText}>＋ Add Other Product</Text>
        </Pressable>
        {products.length === 0 ? <View style={styles.emptyState}>
          <AnimatedFlower size={74} />
          <Text style={styles.emptyTitle}>Your shelf is ready when you are</Text>
          <Text style={styles.emptyText}>Add only the products you already own, or skip ahead to build your routine.</Text>
        </View> : <>
          <Text style={[type.label, styles.sectionLabel]}>My products · {products.length}</Text>
          {products.map((product, index) => <FadeInUp key={product.id} delay={index * 35} style={styles.productRow}>
            <View style={styles.productIcon}><Text style={styles.productIconText}>{CORE_CATEGORIES.find((item) => item.value === displayCategory(product))?.icon ?? "✦"}</Text></View>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{displayName(product)}</Text>
              <Text style={styles.productMeta}>{displayCategory(product) || "Product"} · {timingLabel(product.routine_slot)}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={() => openEdit(product)} style={styles.editButton}><Text style={styles.editText}>Edit</Text></Pressable>
          </FadeInUp>)}
        </>}
      </>}

      {showAddForm && !loading && !error ? <View style={styles.form}>
        <Text style={styles.formTitle}>{editingProduct ? `When do you use ${displayName(editingProduct)}?` : newCategory === "other" ? "Add another product" : `Add a ${newCategory}`}</Text>
        {editingProduct ? null : <>
          <TextInput value={newName} onChangeText={setNewName} placeholder="Product name" placeholderTextColor={colors.inkSoft} style={styles.input} />
          {newCategory === "other" ? <TextInput value={otherCategory} onChangeText={setOtherCategory} placeholder="Category (e.g. toner, eye cream)" placeholderTextColor={colors.inkSoft} style={styles.input} /> : null}
          <TextInput value={newInstructions} onChangeText={setNewInstructions} placeholder="How you use it (optional)" placeholderTextColor={colors.inkSoft} style={styles.input} />
        </>}
        <Text style={styles.formLabel}>Application time</Text>
        <View style={styles.slotRow}>
          {(["AM", "PM", "Both"] as const).map((slot) => <Pressable key={slot} accessibilityRole="radio" accessibilityState={{ selected: newSlot === slot }} onPress={() => { setNewSlot(slot); setFormError(null); }} style={[styles.slotChoice, newSlot === slot && styles.slotChoiceOn]}>
            <View style={[styles.radio, newSlot === slot && styles.radioOn]} />
            <Text style={[styles.slotText, newSlot === slot && styles.slotTextOn]}>{slot === "Both" ? "Both" : slot}</Text>
            <Text style={[styles.slotHelp, newSlot === slot && styles.slotTextOn]}>{slot === "AM" ? "Morning" : slot === "PM" ? "Night" : "AM + PM"}</Text>
          </Pressable>)}
        </View>
        {formError ? <Text accessibilityRole="alert" style={styles.error}>{formError}</Text> : null}
        <PrimaryButton label={editingProduct ? "Save timing" : "Add to my products"} onPress={() => { void saveProduct(); }} loading={saving} />
        <Pill label="Cancel" onPress={() => { setShowAddForm(false); setEditingId(null); setFormError(null); }} />
      </View> : null}

      {!error ? <Pressable accessibilityRole="button" onPress={() => {
        const names: string[] = navigation?.getState?.()?.routeNames ?? [];
        navigation.navigate(names.includes("ProductRecommendation") ? "ProductRecommendation" : "Recommendations");
      }} style={styles.recommendLink}><Text style={styles.recommendText}>Browse optional recommendations  ›</Text></Pressable> : null}
    </ScrollView>
    <PrimaryButton label="Build my routine" onPress={onContinue} style={styles.buildButton} disabled={loading || !!error || saving} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.plum, paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  content: { paddingBottom: spacing.md }, title: { marginTop: spacing.xs, marginBottom: spacing.xs }, sub: { marginBottom: spacing.lg },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, categoryCell: { width: "48%" },
  categoryCard: { minHeight: 112, borderRadius: radii.md, padding: spacing.md, backgroundColor: colors.dusk, borderWidth: 1, borderColor: colors.line }, pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  categoryTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, categoryIcon: { fontSize: 24 }, categoryStatus: { fontFamily: fonts.bodyMedium, color: colors.inkSoft, fontSize: 9 },
  categoryName: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 14, marginTop: spacing.sm, textTransform: "capitalize" }, categoryHelp: { fontFamily: fonts.body, color: colors.inkSoft, fontSize: 10, marginTop: 2 },
  otherButton: { minHeight: 45, borderRadius: radii.md, borderWidth: 1, borderColor: "rgba(227,197,138,0.35)", alignItems: "center", justifyContent: "center", marginTop: spacing.sm, backgroundColor: colors.glass },
  otherButtonText: { color: colors.gold, fontFamily: fonts.bodyBold, fontSize: 12 },
  emptyState: { alignItems: "center", paddingVertical: spacing.lg, marginTop: spacing.sm, borderRadius: radii.md, backgroundColor: colors.glass }, emptyTitle: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 13, marginTop: spacing.sm }, emptyText: { fontFamily: fonts.body, color: colors.inkSoft, fontSize: 11, lineHeight: 17, textAlign: "center", paddingHorizontal: spacing.lg, marginTop: spacing.xs },
  sectionLabel: { marginTop: spacing.lg, marginBottom: spacing.sm }, productRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 58, borderTopWidth: 1, borderTopColor: colors.line }, productIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: "rgba(206,140,150,0.19)", alignItems: "center", justifyContent: "center" }, productIconText: { color: colors.gold, fontSize: 18 }, productInfo: { flex: 1 }, productName: { color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 12 }, productMeta: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 10, marginTop: 3, textTransform: "capitalize" }, editButton: { padding: spacing.sm }, editText: { color: colors.gold, fontFamily: fonts.bodyBold, fontSize: 11 },
  form: { backgroundColor: colors.glass, borderRadius: radii.md, borderWidth: 1, borderColor: colors.line, padding: spacing.md, marginTop: spacing.md }, formTitle: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 14, marginBottom: spacing.md }, input: { color: colors.ink, borderWidth: 1, borderColor: colors.line, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.sm, fontFamily: fonts.body, fontSize: 13 }, formLabel: { color: colors.inkSoft, fontFamily: fonts.bodyBold, fontSize: 11, marginBottom: spacing.xs },
  slotRow: { flexDirection: "row", gap: spacing.xs, marginBottom: spacing.md }, slotChoice: { flex: 1, minHeight: 74, borderRadius: radii.sm, backgroundColor: colors.dusk, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", gap: 3 }, slotChoiceOn: { borderColor: colors.rose, backgroundColor: "rgba(206,140,150,0.17)" }, radio: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: colors.inkSoft, marginBottom: 2 }, radioOn: { borderWidth: 4, borderColor: colors.rose }, slotText: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 11 }, slotTextOn: { color: colors.gold }, slotHelp: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 8 },
  error: { color: colors.danger, fontFamily: fonts.body, fontSize: 11, lineHeight: 16, marginBottom: spacing.sm }, recommendLink: { paddingVertical: spacing.lg, alignItems: "center" }, recommendText: { fontFamily: fonts.bodyBold, color: colors.gold, fontSize: 12 }, buildButton: { marginTop: spacing.sm },
});
