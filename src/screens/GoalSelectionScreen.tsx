import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radii, type, fonts } from "@/theme/tokens";
import { PrimaryButton } from "@/components/PrimaryButton";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type Goal = "find_products" | "build_routine" | "both";

const OPTIONS: { key: Goal; title: string; sub: string; icon: string }[] = [
  { key: "find_products", title: "Find products", sub: "Personalized picks for skin + budget", icon: "🧴" },
  { key: "build_routine", title: "Build my routine", sub: "Simple AM/PM steps that fit", icon: "🗓️" },
  { key: "both", title: "Both", sub: "Guidance and a routine, together", icon: "✨" },
];

export function GoalSelectionScreen({ navigation }: any) {
  const { session } = useAuth();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [saving, setSaving] = useState(false);

  const onContinue = async () => {
    if (!goal || !session?.user) return;
    setSaving(true);
    const { error } = await supabase.from("skin_profiles").upsert({ user_id: session.user.id, goal });
    setSaving(false);
    if (error) return Alert.alert("Couldn't save", error.message);

    // This is the branch point from the user journey: beginners with no
    // routine go to ProductRecommendation; people who already have products
    // go straight to AddExistingProducts. "both" also starts at recommendations.
    navigation.navigate(goal === "build_routine" ? "AddExistingProducts" : "ProductRecommendation");
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={[type.h1, styles.title]}>What would you like help with?</Text>
      <Text style={[type.body, styles.sub]}>We'll shape GlowTrack around what matters to you</Text>

      {OPTIONS.map((o) => (
        <Pressable
          key={o.key}
          style={[styles.card, goal === o.key && styles.cardSelected]}
          onPress={() => setGoal(o.key)}
        >
          <View style={styles.icon}><Text>{o.icon}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{o.title}</Text>
            <Text style={styles.cardSub}>{o.sub}</Text>
          </View>
        </Pressable>
      ))}

      <Text style={styles.note}>No 10-step routines — we only recommend what earns its place.</Text>
      <PrimaryButton label="Continue" onPress={onContinue} loading={saving} style={{ marginTop: "auto" }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.plum, padding: spacing.xl, paddingTop: spacing.xxl },
  title: { marginBottom: spacing.xs },
  sub: { marginBottom: spacing.xl },
  card: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.glass,
    borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.sm,
  },
  cardSelected: { borderColor: colors.rose, backgroundColor: "rgba(206,140,150,0.14)" },
  icon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  cardSub: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  note: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft, marginTop: spacing.sm },
});
