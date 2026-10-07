import React, { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, type } from "@/theme/tokens";
import { Pill } from "@/components/Pill";
import { PrimaryButton } from "@/components/PrimaryButton";
import { GlassCard } from "@/components/GlassCard";
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

  const onSave = async () => {
    if (!feeling || !session?.user) return;
    setSaving(true);
    const { error } = await supabase.from("skin_check_ins").insert({ user_id: session.user.id, feeling });
    setSaving(false);
    if (error) return Alert.alert("Couldn't save", error.message);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={type.label}>Daily check-in</Text>
      <Text style={[type.h1, styles.title]}>How's your skin feeling today?</Text>
      <Text style={[type.body, styles.sub]}>A quick note helps separate patterns from one-off changes.</Text>

      {FEELINGS.map((f) => (
        <Pill key={f.key} label={f.label} selected={feeling === f.key} onPress={() => setFeeling(f.key)} />
      ))}

      <GlassCard style={{ marginTop: spacing.lg }}>
        <Text style={styles.streakText}>🔥 7 days — best yet</Text>
      </GlassCard>

      {/* Hooks into the "photos" table + the private progress-photos storage
          bucket once an image picker (expo-image-picker) is wired up. */}
      <Pill label="📷 Add progress photo (optional)" onPress={() => {}} />

      <PrimaryButton label="Save check-in" onPress={onSave} loading={saving} style={{ marginTop: "auto" }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.plum, padding: spacing.xl, paddingTop: spacing.xxl },
  title: { marginBottom: spacing.xs },
  sub: { marginBottom: spacing.lg },
  streakText: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 15, color: colors.ink },
});
