import React, { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, type } from "@/theme/tokens";
import { Pill } from "@/components/Pill";
import { PrimaryButton } from "@/components/PrimaryButton";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type Answers = {
  age_group: string | null;
  gender: string | null;
  skin_type: string | null;
  reacts_easily: string | null;
  concerns: string[];
  past_breakout_reaction: string | null;
  has_existing_routine: string | null;
};

const EMPTY: Answers = {
  age_group: null,
  gender: null,
  skin_type: null,
  reacts_easily: null,
  concerns: [],
  past_breakout_reaction: null,
  has_existing_routine: null,
};

// Each step: a key into Answers, the question text, its options, and
// whether multiple options can be selected (only "concerns" allows this).
const STEPS: {
  key: keyof Answers;
  title: string;
  options: { label: string; value: string }[];
  multi?: boolean;
  optional?: boolean;
}[] = [
  {
    key: "age_group",
    title: "What's your age group?",
    options: [
      { label: "Under 18", value: "under_18" },
      { label: "18–21", value: "18_21" },
      { label: "22–25", value: "22_25" },
      { label: "26–30", value: "26_30" },
      { label: "Above 30", value: "above_30" },
    ],
  },
  {
    key: "gender",
    title: "What's your gender?",
    optional: true,
    options: [
      { label: "Female", value: "female" },
      { label: "Male", value: "male" },
      { label: "Non-binary", value: "non_binary" },
      { label: "Prefer not to say", value: "prefer_not_to_say" },
    ],
  },
  {
    key: "skin_type",
    title: "What's your skin type?",
    options: [
      { label: "Oily", value: "oily" },
      { label: "Dry", value: "dry" },
      { label: "Combination", value: "combination" },
      { label: "Not sure", value: "not_sure" },
    ],
  },
  {
    key: "reacts_easily",
    title: "Does your skin react easily to new products?",
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
      { label: "Not sure", value: "not_sure" },
    ],
  },
  {
    key: "concerns",
    title: "What's your main concern?",
    multi: true,
    options: [
      { label: "Acne", value: "acne" },
      { label: "Dullness", value: "dullness" },
      { label: "Dryness", value: "dryness" },
      { label: "Dark spots", value: "dark_spots" },
      { label: "Aging", value: "aging" },
      { label: "None in particular", value: "none" },
    ],
  },
  {
    key: "past_breakout_reaction",
    title: "Have products caused breakouts or irritation for you before?",
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
      { label: "Not sure", value: "not_sure" },
    ],
  },
  {
    key: "has_existing_routine",
    title: "Do you currently use skincare products?",
    options: [
      { label: "No routine", value: "none" },
      { label: "A few products", value: "some_products" },
      { label: "Full routine", value: "full_routine" },
    ],
  },
];

export function SkinQuestionsScreen({ navigation }: any) {
  const { session } = useAuth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [saving, setSaving] = useState(false);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const select = (value: string) => {
    if (current.multi) {
      const list = answers.concerns;
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      setAnswers({ ...answers, concerns: next });
    } else {
      setAnswers({ ...answers, [current.key]: value });
    }
  };

  const isSelected = (value: string) =>
    current.multi ? answers.concerns.includes(value) : answers[current.key] === value;

  const canContinue = current.optional || (current.multi ? answers.concerns.length > 0 : !!answers[current.key]);

  const onContinue = async () => {
    if (!canContinue) return; // required question, nothing selected yet
    if (!isLast) {
      setStep(step + 1);
      return;
    }
    await saveAndContinue();
  };

  const saveAndContinue = async () => {
    if (!session?.user) return;
    setSaving(true);

    // age_group and gender live on "profiles"; everything else on "skin_profiles".
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ age_group: answers.age_group, gender: answers.gender })
      .eq("id", session.user.id);

    const { error: skinError } = await supabase.from("skin_profiles").upsert({
      user_id: session.user.id,
      skin_type: answers.skin_type,
      reacts_easily: answers.reacts_easily,
      concerns: answers.concerns,
      past_breakout_reaction: answers.past_breakout_reaction,
      has_existing_routine: answers.has_existing_routine,
    });

    setSaving(false);

    if (profileError || skinError) {
      Alert.alert("Couldn't save", (profileError ?? skinError)?.message ?? "Please try again.");
      return;
    }
    navigation.navigate("GoalSelection");
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.progress}>
        Question {step + 1} of {STEPS.length}
      </Text>
      <Text style={[type.h1, styles.title]}>{current.title}</Text>
      {current.optional && <Text style={[type.body, styles.sub]}>Optional — you can skip this one.</Text>}
      {current.multi && <Text style={[type.body, styles.sub]}>Pick as many as apply.</Text>}

      <View style={{ marginTop: spacing.md }}>
        {current.options.map((o) => (
          <Pill key={o.value} label={o.label} selected={isSelected(o.value)} onPress={() => select(o.value)} />
        ))}
      </View>

      <PrimaryButton
        label={isLast ? "Save & continue" : "Continue"}
        onPress={onContinue}
        loading={saving}
        disabled={!canContinue}
        style={{ marginTop: "auto" }}
      />
      {current.optional && !answers[current.key] && (
        <Text style={styles.skip} onPress={() => (isLast ? saveAndContinue() : setStep(step + 1))}>
          Skip this question
        </Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.plum, padding: spacing.xl, paddingTop: spacing.xxl },
  progress: { color: colors.inkSoft, fontSize: 12, marginBottom: spacing.sm },
  title: { marginBottom: spacing.xs },
  sub: { marginBottom: spacing.sm },
  skip: { textAlign: "center", color: colors.inkSoft, marginTop: spacing.sm, fontSize: 12 },
});