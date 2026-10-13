import React, { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radii, spacing, type } from "@/theme/tokens";

type Message = { role: "user" | "assistant"; content: string };

export function AIChatbotScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  const send = () => {
    const content = input.trim();
    if (!content) return;
    setMessages((current) => [...current, { role: "user", content }]);
    setInput("");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        <View style={styles.header}>
          <Text style={type.label}>CONVERSATION</Text>
          <Text style={[type.h1, styles.title]}>AI Chatbot</Text>
          <Text style={type.body}>Ask follow-up questions in your own words.</Text>
        </View>
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messageContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Start a conversation</Text>
              <Text style={styles.note}>Your message can be entered here. AI replies and saved conversation history are unavailable until a chat service is connected.</Text>
            </View>
          ) : messages.map((message, index) => (
            <View key={index} style={[styles.bubble, styles.userBubble]}>
              <Text style={styles.bubbleText}>{message.content}</Text>
            </View>
          ))}
          {messages.length > 0 ? <Text style={styles.notice}>Messages are shown on this screen only. No AI chat service is configured yet.</Text> : null}
        </ScrollView>
        <Text style={styles.disclaimer}>AI guidance is not a substitute for professional medical advice.</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Ask a skincare question…"
            placeholderTextColor={colors.inkSoft}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={send}
            returnKeyType="send"
            blurOnSubmit={false}
            accessibilityLabel="Your skincare question"
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Send message" style={[styles.sendBtn, !input.trim() && styles.sendDisabled]} disabled={!input.trim()} onPress={send}>
            <Text style={styles.sendText}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.plum },
  screen: { flex: 1, paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  header: { paddingTop: spacing.md, paddingBottom: spacing.md },
  title: { marginTop: 4, marginBottom: spacing.xs },
  messages: { flex: 1 },
  messageContent: { flexGrow: 1, justifyContent: "flex-end", paddingVertical: spacing.sm },
  empty: { borderWidth: 1, borderColor: colors.line, borderRadius: radii.md, backgroundColor: colors.glass, padding: spacing.lg, marginBottom: spacing.md },
  emptyTitle: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 15, marginBottom: spacing.xs },
  note: { fontFamily: fonts.body, color: colors.inkSoft, fontSize: 12, lineHeight: 18 },
  bubble: { maxWidth: "84%", padding: spacing.md, borderRadius: radii.md, marginBottom: spacing.sm },
  userBubble: { alignSelf: "flex-end", backgroundColor: colors.rose },
  bubbleText: { fontFamily: fonts.body, fontSize: 13, color: colors.ink },
  notice: { fontFamily: fonts.body, fontSize: 11, color: colors.inkSoft, lineHeight: 16, marginVertical: spacing.sm },
  disclaimer: { fontFamily: fonts.body, fontSize: 10, color: colors.inkSoft, marginBottom: spacing.xs },
  inputRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center", paddingTop: spacing.xs },
  input: { flex: 1, maxHeight: 110, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.glass, borderRadius: radii.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, color: colors.ink, fontFamily: fonts.body, fontSize: 14 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.rose, alignItems: "center", justifyContent: "center" },
  sendDisabled: { opacity: 0.45 },
  sendText: { color: colors.white, fontSize: 18 },
});
