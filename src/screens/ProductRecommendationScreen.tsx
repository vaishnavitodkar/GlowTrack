import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radii, type, fonts } from "@/theme/tokens";
import { GlassCard } from "@/components/GlassCard";
import { PrimaryButton } from "@/components/PrimaryButton";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type Product = {
  id: string;
  name: string;
  price: number | null;
  category: string;
  suitable_skin_types: string[] | null;
  breakout_safe: boolean | null;
};

export function ProductRecommendationScreen({ navigation }: any) {
  const { session } = useAuth();
  const [primary, setPrimary] = useState<Product | null>(null);
  const [more, setMore] = useState<Product[]>([]);

  useEffect(() => {
    if (!session?.user) return;

    // Real recommendation logic: read the user's skin_type from skin_profiles,
    // then filter products where suitable_skin_types contains it. This is the
    // rule-based matching from the roadmap — RAG comes later, on top of this.
    (async () => {
      const { data: profile } = await supabase
        .from("skin_profiles")
        .select("skin_type, concerns")
        .eq("user_id", session.user.id)
        .maybeSingle();

      let query = supabase.from("products").select("*").eq("category", "cleanser").limit(4);
      if (profile?.skin_type) {
        query = query.contains("suitable_skin_types", [profile.skin_type]);
      }
      const { data } = await query;
      if (data && data.length) {
        setPrimary(data[0]);
        setMore(data.slice(1));
      }
    })();
  }, [session?.user]);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={type.label}>Your match</Text>
        <Text style={[type.h1, styles.title]}>Picked for your skin</Text>

        <GlassCard>
          <View style={styles.thumb} />
          <Text style={styles.name}>{primary?.name ?? "Salicylic Acid Cleanser"}</Text>
          <Text style={styles.meta}>
            ₹{primary?.price ?? 399} · {primary?.breakout_safe ? "Breakout-safe" : "Oily, acne-prone"}
          </Text>
        </GlassCard>

        <Text style={[type.label, { marginTop: spacing.lg }]}>More products like this</Text>
        {(more.length ? more : PLACEHOLDER).map((p) => (
          <View key={p.id} style={styles.row}>
            <View style={styles.rowThumb} />
            <View>
              <Text style={styles.rowName}>{p.name}</Text>
              <Text style={styles.rowPrice}>₹{p.price}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <PrimaryButton
        label="Continue to routine"
        onPress={() => navigation.navigate("AddExistingProducts")}
        style={{ marginTop: spacing.md }}
      />
    </SafeAreaView>
  );
}

const PLACEHOLDER: Product[] = [
  { id: "p1", name: "Niacinamide Serum", price: 549, category: "serum", suitable_skin_types: null, breakout_safe: null },
  { id: "p2", name: "Gel Moisturizer", price: 450, category: "moisturizer", suitable_skin_types: null, breakout_safe: null },
];

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.plum, padding: spacing.xl, paddingTop: spacing.xxl },
  title: { marginBottom: spacing.lg },
  thumb: { height: 80, borderRadius: radii.md, backgroundColor: colors.rose, marginBottom: spacing.md },
  name: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink, marginBottom: 2 },
  meta: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft },
  row: { flexDirection: "row", gap: spacing.sm, alignItems: "center", marginTop: spacing.sm },
  rowThumb: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.gold },
  rowName: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink },
  rowPrice: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft },
});
