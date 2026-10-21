import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Alert, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts, radii, spacing, type } from "@/theme/tokens";
import { PrimaryButton } from "@/components/PrimaryButton";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type Answers = {
  age_group: string | null; gender: string | null; skin_type: string | null;
  reacts_easily: string | null; concerns: string[]; past_breakout_reaction: string | null;
  has_existing_routine: string | null;
};
function SelectionAnimatedCard({ active, children }: { active: boolean; children: React.ReactNode }) {
  const scale = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => { let mounted = true; void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => { if (mounted) setReduceMotion(reduced); }); return () => { mounted = false; }; }, []);
  useEffect(() => {
    if (reduceMotion) { scale.setValue(active ? 1.015 : 1); return; }
    const animation = Animated.spring(scale, { toValue: active ? 1.015 : 1, speed: 24, bounciness: 4, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [active, reduceMotion, scale]);
  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}
const EMPTY: Answers = { age_group: null, gender: null, skin_type: null, reacts_easily: null, concerns: [], past_breakout_reaction: null, has_existing_routine: null };
const STEPS: { key: keyof Answers; title: string; subtitle: string; options: { label: string; value: string; note: string }[]; multi?: boolean; optional?: boolean }[] = [
  { key: "age_group", title: "What's your age group?", subtitle: "This helps us keep guidance age appropriate.", options: [
    { label: "Under 18", value: "under_18", note: "A gentle starting point" }, { label: "18–21", value: "18_21", note: "Building healthy habits" }, { label: "22–25", value: "22_25", note: "Finding your balance" }, { label: "26–30", value: "26_30", note: "Supporting changing needs" }, { label: "Above 30", value: "above_30", note: "Care that grows with you" },
  ] },
  { key: "gender", title: "What's your gender?", subtitle: "Share only if you'd like to.", optional: true, options: [
    { label: "Female", value: "female", note: "" }, { label: "Male", value: "male", note: "" }, { label: "Non-binary", value: "non_binary", note: "" }, { label: "Prefer not to say", value: "prefer_not_to_say", note: "" },
  ] },
  { key: "skin_type", title: "How does your skin feel?", subtitle: "Choose the description that feels closest.", options: [
    { label: "Oily", value: "oily", note: "Often shiny through the day" }, { label: "Dry", value: "dry", note: "Can feel tight or flaky" }, { label: "Combination", value: "combination", note: "Oilier in some areas, drier in others" }, { label: "Not sure", value: "not_sure", note: "We'll keep things flexible" },
  ] },
  { key: "reacts_easily", title: "Does your skin react easily?", subtitle: "Think about trying new skincare products.", options: [
    { label: "Yes", value: "yes", note: "Redness, stinging, or discomfort" }, { label: "No", value: "no", note: "Usually feels comfortable" }, { label: "Not sure", value: "not_sure", note: "I haven't noticed a pattern" },
  ] },
  { key: "concerns", title: "What would you like to focus on?", subtitle: "Choose all that apply.", multi: true, options: [
    { label: "Acne", value: "acne", note: "" }, { label: "Dullness", value: "dullness", note: "" }, { label: "Dryness", value: "dryness", note: "" }, { label: "Dark spots", value: "dark_spots", note: "" }, { label: "Aging", value: "aging", note: "" }, { label: "None in particular", value: "none", note: "" },
  ] },
  { key: "past_breakout_reaction", title: "Have products caused irritation before?", subtitle: "Any breakouts or irritation after using skincare?", options: [
    { label: "Yes", value: "yes", note: "" }, { label: "No", value: "no", note: "" }, { label: "Not sure", value: "not_sure", note: "" },
  ] },
  { key: "has_existing_routine", title: "Do you use skincare today?", subtitle: "We'll meet you where you are.", options: [
    { label: "No routine", value: "none", note: "I'm starting fresh" }, { label: "A few products", value: "some_products", note: "I have a few favourites" }, { label: "Full routine", value: "full_routine", note: "I already have my steps" },
  ] },
];

export function SkinQuestionsScreen({ navigation }: any) {
  const { session } = useAuth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const progress = useRef(new Animated.Value(1 / STEPS.length)).current;
  const transition = useRef(new Animated.Value(1)).current;
  const busy = useRef(false);
  const current = STEPS[step];
  const selected = (value: string) => current.multi ? answers.concerns.includes(value) : answers[current.key] === value;
  const valid = current.optional || (current.multi ? answers.concerns.length > 0 : !!answers[current.key]);

  useEffect(() => { void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion); }, []);
  useEffect(() => {
    Animated.timing(progress, { toValue: (step + 1) / STEPS.length, duration: reduceMotion ? 0 : 260, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [step, progress, reduceMotion]);

  const goTo = (next: number) => {
    setError(null);
    if (reduceMotion) { setStep(next); return; }
    Animated.timing(transition, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => {
      setStep(next); transition.setValue(0);
      Animated.timing(transition, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    });
  };
  const choose = (value: string) => {
    setError(null);
    if (current.multi) {
      const list = answers.concerns;
      const updated = value === "none"
        ? (list.includes("none") ? [] : ["none"])
        : list.includes(value)
          ? list.filter((item) => item !== value && item !== "none")
          : [...list.filter((item) => item !== "none"), value];
      setAnswers({ ...answers, concerns: updated });
    } else setAnswers({ ...answers, [current.key]: value });
  };

  const continueFlow = async () => {
    if (busy.current) return;
    if (!valid) { setError("Choose an answer to continue."); return; }
    if (step < STEPS.length - 1) { goTo(step + 1); return; }
    Alert.alert(
      "Submit your skin assessment?",
      "Please confirm that your answers are correct. We'll use them to personalize your skincare recommendations.",
      [
        { text: "Review Answers", style: "cancel" },
        { text: "Yes, Submit", onPress: () => { void submitAssessment(); } },
      ],
      { cancelable: true },
    );
  };

  const submitAssessment = async () => {
    if (busy.current) return;
    if (!session?.user) { setError("Please sign in again to save your assessment."); return; }
    busy.current = true; setSaving(true); setError(null);
    try {
      const { data: existing, error: lookupError } = await supabase.from("skin_profiles").select("user_id").eq("user_id", session.user.id);
      if (lookupError) throw lookupError;
      if (existing?.length) { navigation.replace("AssessmentAnalysis", { alreadySaved: true }); return; }

      const { data: savedProfile, error: profileError } = await supabase.from("profiles").update({ age_group: answers.age_group, gender: answers.gender }).eq("id", session.user.id).select("id").maybeSingle();
      if (profileError) throw profileError;
      if (!savedProfile) throw new Error("Your account profile is missing. Please sign out and sign in again, then retry.");
      const { error: insertError } = await supabase.from("skin_profiles").insert({
        user_id: session.user.id, skin_type: answers.skin_type, reacts_easily: answers.reacts_easily,
        concerns: answers.concerns, past_breakout_reaction: answers.past_breakout_reaction,
        has_existing_routine: answers.has_existing_routine,
      });
      if (insertError) {
        if (insertError.code === "23505") { navigation.replace("AssessmentAnalysis", { alreadySaved: true }); return; }
        throw insertError;
      }
      navigation.replace("AssessmentAnalysis", { alreadySaved: false });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Couldn't save your profile. Please try again.");
    } finally { busy.current = false; setSaving(false); }
  };

  const opacity = transition;
  const translateY = transition.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topline}>
        <Pressable accessibilityRole="button" accessibilityLabel={step === 0 ? "Back" : "Previous question"} onPress={() => step ? goTo(step - 1) : navigation.goBack()} hitSlop={12}><Text style={styles.back}>‹</Text></Pressable>
        <Text style={styles.counter}>YOUR SKIN PROFILE  ·  {step + 1} OF {STEPS.length}</Text>
        <View style={styles.backSpacer} />
      </View>
      <View style={styles.progressTrack}><Animated.View style={[styles.progressFill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} /></View>
      <Animated.View style={{ flex: 1, opacity, transform: [{ translateY }] }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Text style={styles.eyebrow}>A LITTLE ABOUT YOU</Text>
          <Text style={[type.h1, styles.title]}>{current.title}</Text>
          <Text style={[type.body, styles.subtitle]}>{current.subtitle}{current.optional ? " · Optional" : ""}</Text>
          <View style={styles.options}>
            {current.options.map((option) => {
              const active = selected(option.value);
              return <SelectionAnimatedCard key={option.value} active={active}><Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => choose(option.value)} style={({ pressed }) => [styles.option, active && styles.optionActive, pressed && styles.optionPressed]}>
                <View style={[styles.optionMark, active && styles.optionMarkActive]}>{active ? <Text style={styles.check}>✓</Text> : null}</View>
                <View style={styles.optionCopy}><Text style={styles.optionTitle}>{option.label}</Text>{option.note ? <Text style={styles.optionNote}>{option.note}</Text> : null}</View>
                <Text style={[styles.arrow, active && styles.arrowActive]}>›</Text>
              </Pressable></SelectionAnimatedCard>;
            })}
          </View>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        </ScrollView>
      </Animated.View>
      <PrimaryButton label={saving ? "Saving your profile…" : step === STEPS.length - 1 ? "Save & Continue" : "Continue"} onPress={() => { void continueFlow(); }} loading={saving} disabled={!valid || saving} style={styles.cta} />
      <Text style={styles.privacy}>Your answers stay private and help personalize your GlowTrack experience.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FBF9FC", paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  topline: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 38 }, back: { color: colors.plum, fontSize: 32, lineHeight: 34 }, backSpacer: { width: 24 },
  counter: { color: "#7C7185", fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1 },
  progressTrack: { height: 4, borderRadius: 4, backgroundColor: "#EDE8F0", marginTop: spacing.md, overflow: "hidden" }, progressFill: { height: "100%", backgroundColor: "#8054A6", borderRadius: 4 },
  content: { paddingTop: spacing.xxl, paddingBottom: spacing.lg }, eyebrow: { fontFamily: fonts.bodyBold, color: "#8054A6", fontSize: 10, letterSpacing: 1.4, marginBottom: spacing.sm },
  title: { color: "#251C2D", fontSize: 30, lineHeight: 38, marginBottom: spacing.xs }, subtitle: { color: "#766C7F", marginBottom: spacing.xl },
  options: { gap: spacing.sm }, option: { minHeight: 68, borderRadius: radii.lg, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#EEE9F1", paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexDirection: "row", alignItems: "center", gap: spacing.md, shadowColor: "#35233E", shadowOpacity: 0.045, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 }, optionActive: { borderColor: "#8054A6", backgroundColor: "#F6F0FA" }, optionPressed: { transform: [{ scale: 0.99 }] },
  optionMark: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: "#D8CEDF", alignItems: "center", justifyContent: "center" }, optionMarkActive: { backgroundColor: "#8054A6", borderColor: "#8054A6" }, check: { color: "white", fontSize: 13, fontWeight: "700" }, optionCopy: { flex: 1 }, optionTitle: { color: "#302536", fontFamily: fonts.bodySemiBold, fontSize: 14 }, optionNote: { color: "#8B8191", fontFamily: fonts.body, fontSize: 11, marginTop: 3 }, arrow: { color: "#B4AABD", fontSize: 24 }, arrowActive: { color: "#8054A6" },
  error: { color: colors.danger, fontFamily: fonts.body, marginTop: spacing.md, fontSize: 12 }, cta: { backgroundColor: "#8054A6", minHeight: 54 }, privacy: { textAlign: "center", color: "#9A909F", fontFamily: fonts.body, fontSize: 10, marginTop: spacing.sm, marginBottom: spacing.sm },
});
