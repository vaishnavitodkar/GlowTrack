import React, { useEffect, useState } from "react";
import { Alert, TextInput, View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radii, type, fonts } from "@/theme/tokens";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Pill } from "@/components/Pill";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type OwnedProduct = {
  id: string;
  custom_name: string | null;
  usage_instructions: string | null;
  source?: string | null;
  products?: { name: string }[] | { name: string } | null;
};

export function AddExistingProductsScreen({ navigation }: any) {
  const { session } = useAuth();
  const [hasProducts, setHasProducts] = useState(false);
  const [products, setProducts] = useState<OwnedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newInstructions, setNewInstructions] = useState("");
  const [newSlot, setNewSlot] = useState<"AM" | "PM">("AM");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    supabase
      .from("user_products")
      .select("id, custom_name, usage_instructions, source, products(name)")
      .eq("user_id", session.user.id)
      .or("source.is.null,source.neq.recommended")
      .then(({ data, error: queryError }) => {
        setProducts(data ?? []);
        setHasProducts((data ?? []).length > 0);
        setError(queryError ? `Couldn't load your products: ${queryError.message}` : null);
        setLoading(false);
      });
  }, [session?.user]);

  const addProduct = async () => {
    if (!session?.user || saving) return;
    const name = newName.trim();
    if (!name) return Alert.alert("Add a product name", "Enter the name shown on your product.");
    setSaving(true);
    try {
      const { data: duplicate, error: duplicateError } = await supabase
        .from("user_products")
        .select("id")
        .eq("user_id", session.user.id)
        .ilike("custom_name", name)
        .limit(1);
      if (duplicateError) throw duplicateError;
      if (duplicate?.length) {
        Alert.alert("Already in your products", "That product name is already in your collection.");
        return;
      }
      const { data: rows, error: lookupError } = await supabase
        .from("user_products")
        .select("step_order, source")
        .eq("user_id", session.user.id)
        .eq("routine_slot", newSlot);
      if (lookupError) throw lookupError;
      const lastStep = Math.max(0, ...(rows ?? [])
        .filter((row) => row.source !== "recommended")
        .map((row) => row.step_order ?? 0));
      const { data, error: insertError } = await supabase
        .from("user_products")
        .insert({
          user_id: session.user.id,
          product_id: null,
          custom_name: name,
          usage_instructions: newInstructions.trim() || null,
          routine_slot: newSlot,
          step_order: lastStep + 1,
          source: "manual",
        })
        .select("id, custom_name, usage_instructions, source, products(name)")
        .single();
      if (insertError) throw insertError;
      setProducts((current) => [...current, data as unknown as OwnedProduct]);
      setHasProducts(true);
      setNewName("");
      setNewInstructions("");
      setShowAddForm(false);
    } catch (saveError) {
      const detail = saveError instanceof Error ? saveError.message : "Unknown error";
      setError(`Couldn't add your product: ${detail}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={type.label}>Your shelf</Text>
      <Text style={[type.h1, styles.title]}>Do you already use any products?</Text>
      <Text style={[type.body, styles.sub]}>
        Add what you use and keep your AM and PM routine simple
      </Text>

      <View style={styles.tabs}>
        <Pressable style={[styles.tab, hasProducts && styles.tabOn]} onPress={() => setHasProducts(true)}>
          <Text style={[styles.tabLabel, hasProducts && styles.tabLabelOn]}>Yes, I do</Text>
        </Pressable>
        <Pressable style={[styles.tab, !hasProducts && styles.tabOn]} onPress={() => setHasProducts(false)}>
          <Text style={[styles.tabLabel, !hasProducts && styles.tabLabelOn]}>Not yet</Text>
        </Pressable>
      </View>

      {(hasProducts || products.length === 0) && (
        <>
          <Text style={[type.label, { marginTop: spacing.md }]}>My products · {products.length}</Text>
          {loading ? <Text style={styles.empty}>Loading your products…</Text> : null}
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          {!loading && products.length === 0 ? <Text style={styles.empty}>No products yet. Browse optional recommendations, or build a routine later.</Text> : null}
          {products.map((p) => (
            <View key={p.id} style={styles.row}>
              <View style={styles.rowThumb} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{p.custom_name ?? (Array.isArray(p.products) ? p.products[0]?.name : p.products?.name) ?? "Product"}</Text>
                {p.usage_instructions ? <Text style={styles.empty}>{p.usage_instructions}</Text> : null}
              </View>
            </View>
          ))}
        {showAddForm ? (
          <View style={styles.form}>
            <TextInput value={newName} onChangeText={setNewName} placeholder="Product name" placeholderTextColor={colors.inkSoft} style={styles.input} />
            <TextInput value={newInstructions} onChangeText={setNewInstructions} placeholder="How you use it (optional)" placeholderTextColor={colors.inkSoft} style={styles.input} />
            <View style={styles.tabs}>
              {(["AM", "PM"] as const).map((slot) => (
                <Pressable key={slot} style={[styles.tab, newSlot === slot && styles.tabOn]} onPress={() => setNewSlot(slot)}>
                  <Text style={[styles.tabLabel, newSlot === slot && styles.tabLabelOn]}>{slot} routine</Text>
                </Pressable>
              ))}
            </View>
            <PrimaryButton label="Add to my products" onPress={() => { void addProduct(); }} loading={saving} />
          </View>
        ) : null}
        <Pill label={showAddForm ? "Cancel adding product" : "+ Add a product I already use"} onPress={() => setShowAddForm((value) => !value)} />
        </>
      )}

      <Pill label="Recommend products" onPress={() => navigation.navigate("ProductRecommendation")} />

      <PrimaryButton
        label="Build my routine"
        onPress={() => navigation.navigate("Routine")}
        style={{ marginTop: "auto" }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.plum, padding: spacing.xl, paddingTop: spacing.xxl },
  title: { marginBottom: spacing.xs },
  sub: { marginBottom: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  rowThumb: { width: 36, height: 36, borderRadius: 9, backgroundColor: colors.rose },
  rowName: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ink },
  empty: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft, lineHeight: 18, marginBottom: spacing.sm },
  error: { fontFamily: fonts.body, fontSize: 12, color: colors.danger, marginBottom: spacing.sm },
  form: { backgroundColor: colors.glass, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm },
  input: { color: colors.ink, borderWidth: 1, borderColor: colors.line, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.sm, fontFamily: fonts.body, fontSize: 13 },
  tabs: { flexDirection: "row", gap: spacing.xs, marginBottom: spacing.sm },
  tab: { flex: 1, alignItems: "center", paddingVertical: spacing.sm, borderRadius: radii.sm, backgroundColor: colors.dusk },
  tabOn: { backgroundColor: colors.rose },
  tabLabel: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.inkSoft },
  tabLabelOn: { color: colors.white },
});
