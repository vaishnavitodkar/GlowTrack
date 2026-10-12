import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radii, type, fonts } from "@/theme/tokens";
import { Pill } from "@/components/Pill";
import { PrimaryButton } from "@/components/PrimaryButton";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useOnboarding, RoutineSlot } from "@/context/OnboardingContext";

type Step = { key: string; name: string; routine_slot: RoutineSlot };

// This screen is used twice:
//  - During onboarding it shows the draft routine, lets the user remove steps,
//    and "Save & continue" writes it to user_products.
//  - As the Routine tab afterwards it shows the saved routine (read-only).
export function RoutineScreen() {
  const { session } = useAuth();
  const { onboardingDone, items, removeItem, saveRoutineAndFinish } = useOnboarding();
  const inOnboarding = !onboardingDone;

  const [tab, setTab] = useState<RoutineSlot>("AM");
  const [saved, setSaved] = useState<Step[]>([]);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false); // blocks double taps instantly (state updates are async)

  useEffect(() => {
    if (inOnboarding || !session?.user) return;
    supabase
      .from("user_products")
      .select("id, custom_name, routine_slot, step_order")
      .eq("user_id", session.user.id)
      .order("step_order")
      .then(({ data }) =>
        setSaved(
          (data ?? []).map((r) => ({
            key: r.id,
            name: r.custom_name ?? "Step",
            routine_slot: r.routine_slot as RoutineSlot,
          }))
        )
      );
  }, [inOnboarding, session?.user?.id]);

  const source: Step[] = inOnboarding
    ? items.map((i) => ({ key: i.key, name: i.name, routine_slot: i.routine_slot }))
    : saved;
  const steps = source.filter((s) => s.routine_slot === tab);

  const onSave = async () => {
    if (savingRef.current) return;
    if (!items.length) {
      Alert.alert("Add at least one step", "Go back and pick or add a product to build your routine.");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    const errorMessage = await saveRoutineAndFinish();
    savingRef.current = false;
    setSaving(false);
    // On success there's nothing to do here: the navigator switches to the
    // main app on its own once onboarding is marked complete.
    if (errorMessage) Alert.alert("Couldn't save your routine", errorMessage);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <Text style={type.label}>Your plan</Text>
        <Text style={[type.h1, styles.title]}>A routine you'll keep</Text>

        <View style={styles.tabs}>
          {(["AM", "PM"] as const).map((t) => (
            <Pressable key={t} style={[styles.tab, tab === t && styles.tabOn]} onPress={() => setTab(t)}>
              <Text style={[styles.tabLabel, tab === t && styles.tabLabelOn]}>{t} routine</Text>
            </Pressable>
          ))}
        </View>

        {steps.length === 0 && (
          <Text style={[type.body, { marginBottom: spacing.md }]}>
            {inOnboarding
              ? `No ${tab} steps yet. Go back to add a product.`
              : `No ${tab} steps in your routine yet.`}
          </Text>
        )}

        {steps.map((s, i) => (
          <View key={s.key} style={styles.step}>
            <Text style={styles.stepNum}>{String(i + 1).padStart(2, "0")}</Text>
            <Text style={[styles.stepLabel, { flex: 1 }]}>{s.name}</Text>
            {inOnboarding && (
              <Pressable onPress={() => removeItem(s.key)} hitSlop={10}>
                <Text style={styles.remove}>✕</Text>
              </Pressable>
            )}
          </View>
        ))}

        <Text style={[type.label, { marginTop: spacing.lg, marginBottom: spacing.sm }]}>Gentle reminders</Text>
        {/* Wire these to expo-notifications.scheduleNotificationAsync on save */}
        <Pill label="🌅 Morning · 8:00 AM" selected />
        <Pill label="🌙 Evening · 9:30 PM" selected />
      </ScrollView>

      {inOnboarding && (
        <PrimaryButton label="Save & continue" onPress={onSave} loading={saving} style={{ marginTop: spacing.md }} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.plum, padding: spacing.xl, paddingTop: spacing.xxl },
  title: { marginBottom: spacing.lg },
  tabs: { flexDirection: "row", gap: spacing.xs, marginBottom: spacing.md },
  tab: { flex: 1, alignItems: "center", paddingVertical: spacing.sm, borderRadius: radii.sm, backgroundColor: colors.glass },
  tabOn: { backgroundColor: colors.rose },
  tabLabel: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.inkSoft },
  tabLabelOn: { color: colors.white },
  step: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.line },
  stepNum: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.gold, backgroundColor: "rgba(227,197,138,0.16)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  stepLabel: { fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  remove: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkSoft, paddingHorizontal: spacing.xs },
});