import React, { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, type } from "@/theme/tokens";
import { Pill } from "@/components/Pill";
import { PrimaryButton } from "@/components/PrimaryButton";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const SKIN_TYPES = ["Oily", "Dry", "Combination", "Not sure"];

// This screen covers skin type only, matching screen 03 from the Figma flow.
// Repeat this same pattern (useState + Pill list) for the remaining quiz
// questions — reacts_easily, concerns, past_breakout_reaction, etc. — each
// as its own step, writing into the same skin_profiles row at the end.
export function SkinQuestionsScreen({ navigation }: any) {
  const { session } = useAuth();
  const [skinType, setSkinType] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onContinue = async () => {
    if (!skinType || !session?.user) return;
    setSaving(true);

    const { error } = await supabase.from("skin_profiles").upsert({
      user_id: session.user.id,
      skin_type: skinType.toLowerCase().replace(" ", "_"),
    });

    setSaving(false);
    if (error) {
      Alert.alert("Couldn't save", error.message);
      return;
    }
    navigation.navigate("GoalSelection"); // next screen in the flow
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.progress}>Question 2 of 5</Text>
      <Text style={[type.h1, styles.title]}>What's your skin type?</Text>
      <Text style={[type.body, styles.sub]}>Choose the closest match — you can update this anytime.</Text>

      {SKIN_TYPES.map((t) => (
        <Pill key={t} label={t} selected={skinType === t} onPress={() => setSkinType(t)} />
      ))}

      <PrimaryButton
        label="Continue"
        onPress={onContinue}
        loading={saving}
        style={{ marginTop: "auto" }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.plum, padding: spacing.xl, paddingTop: spacing.xxl },
  progress: { color: colors.inkSoft, fontSize: 12, marginBottom: spacing.sm },
  title: { marginBottom: spacing.xs },
  sub: { marginBottom: spacing.xl },
});
