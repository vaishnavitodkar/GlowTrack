import React, { useState } from "react";
import { Text, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, type } from "@/theme/tokens";
import { Pill } from "@/components/Pill";
import { PrimaryButton } from "@/components/PrimaryButton";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const FEELINGS = [
  { key: "better", label: "😊 Better" },
  { key: "same", label: "😐 About the same" },
  { key: "worse", label: "😕 Worse / irritated" },
] as const;

export function CheckInScreen({ navigation }: any) {
  const { session } = useAuth();
  const [feeling, setFeeling] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const onSave = async () => {
    if (!feeling || !session?.user || saving || saved) return;
    setSaving(true);
    const { error } = await supabase.from("skin_check_ins").insert({ user_id: session.user.id, feeling });
    setSaving(false);
    if (error) return Alert.alert("Couldn't save", error.message);
    setSaved(true);
    Alert.alert("Check-in saved", "Your skin check-in has been recorded.");
    navigation.navigate("Tabs", { screen: "Progress" });
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={type.label}>Daily check-in</Text>
      <Text style={[type.h1, styles.title]}>How's your skin feeling today?</Text>
      <Text style={[type.body, styles.sub]}>A quick note helps separate patterns from one-off changes.</Text>

      {FEELINGS.map((f) => (
        <Pill key={f.key} label={f.label} selected={feeling === f.key} onPress={() => setFeeling(f.key)} />
      ))}

      <Pill label="📷 Add progress photo (optional)" onPress={() => navigation.navigate("Tabs", { screen: "Progress" })} />

      <PrimaryButton label={saved ? "Saved" : "Save check-in"} onPress={onSave} loading={saving} disabled={!feeling || saved} style={{ marginTop: "auto" }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.plum, padding: spacing.xl, paddingTop: spacing.xxl },
  title: { marginBottom: spacing.xs },
  sub: { marginBottom: spacing.lg },
});
