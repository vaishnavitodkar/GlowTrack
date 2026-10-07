import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radii, type, fonts } from "@/theme/tokens";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Pill } from "@/components/Pill";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type OwnedProduct = { id: string; custom_name: string | null };

export function AddExistingProductsScreen({ navigation }: any) {
  const { session } = useAuth();
  const [hasProducts, setHasProducts] = useState(true);
  const [products, setProducts] = useState<OwnedProduct[]>([]);

  useEffect(() => {
    if (!session?.user) return;
    supabase
      .from("user_products")
      .select("id, custom_name")
      .eq("user_id", session.user.id)
      .then(({ data }) => setProducts(data ?? []));
  }, [session?.user]);

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={type.label}>Your shelf</Text>
      <Text style={[type.h1, styles.title]}>Do you already use any products?</Text>
      <Text style={[type.body, styles.sub]}>
        Add what you have — we'll avoid duplicates and build around the essentials
      </Text>

      <View style={styles.tabs}>
        <Pressable style={[styles.tab, hasProducts && styles.tabOn]} onPress={() => setHasProducts(true)}>
          <Text style={[styles.tabLabel, hasProducts && styles.tabLabelOn]}>Yes, I do</Text>
        </Pressable>
        <Pressable style={[styles.tab, !hasProducts && styles.tabOn]} onPress={() => setHasProducts(false)}>
          <Text style={[styles.tabLabel, !hasProducts && styles.tabLabelOn]}>Not yet</Text>
        </Pressable>
      </View>

      {hasProducts && (
        <>
          <Text style={[type.label, { marginTop: spacing.md }]}>Added products · {products.length}</Text>
          {products.map((p) => (
            <View key={p.id} style={styles.row}>
              <View style={styles.rowThumb} />
              <Text style={styles.rowName}>{p.custom_name}</Text>
            </View>
          ))}
          {/* Hook this up to a real "add product" modal/form that inserts
              into user_products with routine_slot + step_order set. */}
          <Pill label="+ Add product" onPress={() => {}} />
        </>
      )}

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
  tabs: { flexDirection: "row", gap: spacing.xs, marginBottom: spacing.sm },
  tab: { flex: 1, alignItems: "center", paddingVertical: spacing.sm, borderRadius: radii.sm, backgroundColor: colors.glass },
  tabOn: { backgroundColor: colors.rose },
  tabLabel: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.inkSoft },
  tabLabelOn: { color: colors.white },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  rowThumb: { width: 36, height: 36, borderRadius: 9, backgroundColor: colors.rose },
  rowName: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ink },
});
