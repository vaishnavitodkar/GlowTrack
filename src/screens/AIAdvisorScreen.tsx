import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radii, type, fonts } from "@/theme/tokens";

type Message = { role: "user" | "assistant"; content: string };

const SEED: Message[] = [
  { role: "user", content: "Is it normal to break out in week 2?" },
  {
    role: "assistant",
    content:
      "Often yes — this can be \"purging\" as your skin adjusts, different from a bad reaction. Give it 2-3 more weeks.",
  },
];

// This screen is UI-only for now. Wiring it up means: send `input` to a
// Supabase Edge Function that embeds the question, retrieves matching rows
// from a `knowledge_base` table (pgvector similarity search), and passes
// those chunks + the question to the Claude API, same architecture as the
// RAG diagram from earlier in the project.
export function AIAdvisorScreen() {
  const [messages, setMessages] = useState<Message[]>(SEED);
  const [input, setInput] = useState("");

  const onSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: input }]);
    setInput("");
    // Replace with the real Edge Function call described above.
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={[type.h1, styles.title]}>Ask GlowTrack</Text>
      <Text style={[type.body, styles.sub]}>Grounded in dermatologist-reviewed sources</Text>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {messages.map((m, i) => (
          <View key={i} style={[styles.bubble, m.role === "user" ? styles.bubbleMe : styles.bubbleAi]}>
            <Text style={styles.bubbleText}>{m.content}</Text>
          </View>
        ))}
      </ScrollView>

      <Text style={styles.disclaimer}>⚠️ AI guidance only — not a substitute for professional medical advice.</Text>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask a skincare question…"
          placeholderTextColor={colors.inkSoft}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={onSend}
        />
        <Pressable style={styles.sendBtn} onPress={onSend}>
          <Text style={{ color: colors.white }}>↑</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.plum, padding: spacing.xl, paddingTop: spacing.xxl },
  title: { marginBottom: spacing.xs },
  sub: { marginBottom: spacing.lg },
  bubble: { maxWidth: "80%", padding: spacing.sm, borderRadius: radii.md, marginBottom: spacing.sm },
  bubbleMe: { alignSelf: "flex-end", backgroundColor: colors.rose },
  bubbleAi: { alignSelf: "flex-start", backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.line },
  bubbleText: { fontFamily: fonts.body, fontSize: 13, color: colors.ink },
  disclaimer: { fontFamily: fonts.body, fontSize: 10, color: colors.inkSoft, marginVertical: spacing.sm },
  inputRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  input: { flex: 1, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.glass, borderRadius: radii.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, color: colors.ink, fontFamily: fonts.body },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.rose, alignItems: "center", justifyContent: "center" },
});
