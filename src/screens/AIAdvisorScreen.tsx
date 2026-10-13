import React, { useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, View, Text, StyleSheet, TextInput, ScrollView, Pressable } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, radii, type, fonts } from "@/theme/tokens";

type Message = { role: "user" | "assistant"; content: string };

// This screen is UI-only for now. Wiring it up means: send `input` to a
// Supabase Edge Function that embeds the question, retrieves matching rows
// from a `knowledge_base` table (pgvector similarity search), and passes
// those chunks + the question to the Claude API, same architecture as the
// RAG diagram from earlier in the project.
export function AIAdvisorScreen({ navigation }: any) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  const onSend = () => {
    if (!input.trim()) return;
    Alert.alert("AI Adviser unavailable", "The RAG adviser service is not configured in this project yet. Your question is still in the input field.");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}>
        <View style={styles.header}>
          <Text style={[type.h1, styles.title]}>AI Adviser</Text>
          <Text style={[type.body, styles.sub]}>Personalized skincare guidance</Text>
          <Text style={styles.serviceNote}>The RAG adviser service is not configured in this project yet. No AI response or citations are being generated.</Text>
          <Pressable onPress={() => navigation.navigate("Dermatologist")}><Text style={styles.doctorLink}>Talk to a dermatologist  ›</Text></Pressable>
        </View>
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messageContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((m, i) => (
            <View key={i} style={[styles.bubble, m.role === "user" ? styles.bubbleMe : styles.bubbleAi]}>
              <Text style={styles.bubbleText}>{m.content}</Text>
            </View>
          ))}
        </ScrollView>
        <Text style={styles.disclaimer}>AI guidance only — not a substitute for professional medical advice.</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Ask a skincare question…"
            placeholderTextColor={colors.inkSoft}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={onSend}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Send message" style={styles.sendBtn} onPress={onSend}>
            <Text style={{ color: colors.white }}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.plum },
  screen: { flex: 1, backgroundColor: colors.plum, paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  header: { paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { marginBottom: spacing.xs },
  sub: { marginBottom: spacing.xs },
  doctorLink: { color: colors.gold, fontFamily: fonts.bodyBold, fontSize: 12, paddingVertical: spacing.xs },
  serviceNote: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 11, lineHeight: 16, marginTop: spacing.xs },
  messages: { flex: 1 },
  messageContent: { flexGrow: 1, justifyContent: "flex-end", paddingTop: spacing.sm },
  bubble: { maxWidth: "80%", padding: spacing.sm, borderRadius: radii.md, marginBottom: spacing.sm },
  bubbleMe: { alignSelf: "flex-end", backgroundColor: colors.rose },
  bubbleAi: { alignSelf: "flex-start", backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.line },
  bubbleText: { fontFamily: fonts.body, fontSize: 13, color: colors.ink },
  disclaimer: { fontFamily: fonts.body, fontSize: 10, color: colors.inkSoft, marginVertical: spacing.sm },
  inputRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  input: { flex: 1, maxHeight: 110, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.glass, borderRadius: radii.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, color: colors.ink, fontFamily: fonts.body },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.rose, alignItems: "center", justifyContent: "center" },
});
