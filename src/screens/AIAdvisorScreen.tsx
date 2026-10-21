import React, { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { askSkincareAdvisor, type AssistantCitation } from "@/lib/skincareAssistant";
import { colors, fonts, radii, spacing, type } from "@/theme/tokens";

const PROMPTS = ["Build me a gentle routine", "Review my skin sensitivities", "Help me understand a reaction"];
type Advice = { answer: string; citations: AssistantCitation[]; evidenceAvailable?: boolean };

export function AIAdvisorScreen({ navigation }: any) {
  const [input, setInput] = useState("");
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ask = async (prompt = input) => {
    const question = prompt.trim();
    if (!question || loading) return;
    setInput(question); setLoading(true); setError(null); setAdvice(null);
    try {
      const result = await askSkincareAdvisor(question);
      setAdvice({ answer: result.answer ?? "The adviser did not return a response.", citations: result.citations ?? [], evidenceAvailable: result.evidenceAvailable });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The skincare adviser is unavailable. Please try again.");
    } finally { setLoading(false); }
  };

  return <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={type.label}>Personalized guidance</Text>
        <Text style={[type.h1, styles.title]}>AI Adviser</Text>
        <Text style={styles.sub}>Ask one focused question for guidance based on your saved skin assessment and available skincare references. This is education, not a diagnosis.</Text>
        <View style={styles.notice}><Text style={styles.noticeText}>For severe, worsening, persistent, painful, or infected symptoms, contact a qualified dermatologist.</Text></View>
        <Pressable accessibilityRole="button" onPress={() => navigation.navigate("Dermatologist")}><Text style={styles.doctorLink}>Talk to a dermatologist  ›</Text></Pressable>
        <Text style={styles.section}>START WITH A QUESTION</Text>
        {PROMPTS.map((prompt) => <Pressable key={prompt} accessibilityRole="button" disabled={loading} onPress={() => { void ask(prompt); }} style={styles.prompt}><Text style={styles.promptText}>{prompt}  ›</Text></Pressable>)}
        <TextInput value={input} onChangeText={setInput} multiline maxLength={4000} placeholder="Or write your own question…" placeholderTextColor={colors.inkSoft} style={styles.input} />
        <Pressable accessibilityRole="button" accessibilityLabel="Get personalized advice" disabled={!input.trim() || loading} onPress={() => { void ask(); }} style={[styles.askButton, (!input.trim() || loading) && styles.disabled]}>
          {loading ? <ActivityIndicator color={colors.plum} /> : <Text style={styles.askText}>Get guidance</Text>}
        </Pressable>
        {error ? <View accessibilityRole="alert" style={styles.result}><Text style={styles.error}>{error}</Text><Pressable onPress={() => { void ask(input); }}><Text style={styles.doctorLink}>Try again</Text></Pressable></View> : null}
        {advice ? <View style={styles.result}>
          <Text style={styles.resultTitle}>Your guidance</Text><Text style={styles.answer}>{advice.answer}</Text>
          {advice.evidenceAvailable === false ? <Text style={styles.sub}>No relevant indexed reference was found for this question.</Text> : null}
          {advice.citations.length ? <View style={styles.citations}><Text style={styles.resultTitle}>Sources</Text>{advice.citations.map((source) => <Text key={`${source.chunkId}-${source.pageNumber}`} style={styles.citation}>{source.documentName}{source.pageNumber ? ` · p. ${source.pageNumber}` : ""}</Text>)}</View> : null}
        </View> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.plum }, screen: { flex: 1, paddingHorizontal: spacing.xl }, content: { paddingTop: spacing.md, paddingBottom: spacing.xxl },
  title: { marginBottom: spacing.xs }, sub: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 11, lineHeight: 17, marginBottom: spacing.sm },
  notice: { borderLeftWidth: 2, borderLeftColor: colors.gold, paddingLeft: spacing.md, marginVertical: spacing.md }, noticeText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 10, lineHeight: 15 },
  doctorLink: { color: colors.gold, fontFamily: fonts.bodyBold, fontSize: 12, paddingVertical: spacing.sm }, section: { color: colors.gold, fontFamily: fonts.bodyBold, letterSpacing: 0.7, fontSize: 9, marginTop: spacing.lg, marginBottom: spacing.xs },
  prompt: { borderWidth: 1, borderColor: colors.line, borderRadius: radii.md, backgroundColor: colors.glass, padding: spacing.md, marginTop: spacing.sm }, promptText: { color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 12 },
  input: { minHeight: 92, textAlignVertical: "top", color: colors.ink, fontFamily: fonts.body, fontSize: 13, borderWidth: 1, borderColor: colors.line, borderRadius: radii.md, backgroundColor: colors.glass, padding: spacing.md, marginTop: spacing.md },
  askButton: { alignItems: "center", justifyContent: "center", minHeight: 46, borderRadius: radii.md, backgroundColor: colors.gold, marginTop: spacing.md }, askText: { color: colors.plum, fontFamily: fonts.bodyBold, fontSize: 12 }, disabled: { opacity: 0.5 },
  result: { borderWidth: 1, borderColor: colors.line, borderRadius: radii.md, padding: spacing.md, backgroundColor: colors.glass, marginTop: spacing.lg }, resultTitle: { color: colors.gold, fontFamily: fonts.bodyBold, fontSize: 11, marginBottom: spacing.sm }, answer: { color: colors.ink, fontFamily: fonts.body, fontSize: 13, lineHeight: 20 },
  citations: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: spacing.md, paddingTop: spacing.md, gap: spacing.xs }, citation: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 10 }, error: { color: colors.danger, fontFamily: fonts.body, fontSize: 12, lineHeight: 18 },
});
