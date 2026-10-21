import React, { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radii, spacing, type } from "@/theme/tokens";
import { useAssistantChat } from "@/hooks/useAssistantChat";

export function AIChatbotScreen() {
  const [input, setInput] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const { messages, loadingHistory, sending, error, retry, send } = useAssistantChat();

  const submit = () => {
    const value = input.trim();
    if (!value || sending) return;
    setInput("");
    void send(value);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}>
        <View style={styles.header}>
          <Text style={type.label}>CONVERSATION</Text>
          <Text style={[type.h1, styles.title]}>AI Chatbot</Text>
          <Text style={type.body}>Evidence-backed guidance tailored to your saved skin profile.</Text>
          <Text style={styles.note}>Your question and relevant saved skin/product details are sent to our AI provider to prepare the reply.</Text>
        </View>
        <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={styles.messageContent}
          keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
          {loadingHistory ? <Text style={styles.note}>Loading your conversation…</Text> : null}
          {!loadingHistory && messages.length === 0 ? <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Start a conversation</Text>
            <Text style={styles.note}>Ask about ingredients, routines, or your skin concerns. Responses cite the skincare references used.</Text>
          </View> : null}
          {messages.map((message, index) => <View key={`${message.created_at ?? "pending"}-${index}`} style={[
            styles.bubble, message.role === "user" ? styles.userBubble : styles.assistantBubble,
          ]}>
            <Text style={styles.bubbleText}>{message.content}</Text>
            {message.role === "assistant" && message.cited_sources?.length ? <View style={styles.citations}>
              <Text style={styles.citationsTitle}>Sources</Text>
              {message.cited_sources.map((source) => <Text key={`${source.chunkId}-${source.pageNumber}`} style={styles.citation}>
                {source.documentName}{source.pageNumber ? ` · p. ${source.pageNumber}` : ""}
              </Text>)}
            </View> : null}
          </View>)}
          {sending ? <Text style={styles.note}>Reviewing your question and sources…</Text> : null}
          {error ? <View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.error}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={retry}><Text style={styles.retry}>Retry</Text></Pressable>
          </View> : null}
        </ScrollView>
        <Text style={styles.disclaimer}>Educational guidance only. This assistant cannot diagnose skin conditions.</Text>
        <View style={styles.inputRow}>
          <TextInput style={styles.input} placeholder="Ask a skincare question…" placeholderTextColor={colors.inkSoft}
            value={input} onChangeText={setInput} onSubmitEditing={submit} returnKeyType="send" blurOnSubmit={false}
            accessibilityLabel="Your skincare question" maxLength={4000} />
          <Pressable accessibilityRole="button" accessibilityLabel="Send message" style={[styles.sendBtn, (!input.trim() || sending) && styles.sendDisabled]}
            disabled={!input.trim() || sending} onPress={submit}><Text style={styles.sendText}>{sending ? "…" : "↑"}</Text></Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.plum }, screen: { flex: 1, paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  header: { paddingTop: spacing.md, paddingBottom: spacing.md }, title: { marginTop: 4, marginBottom: spacing.xs },
  messages: { flex: 1 }, messageContent: { flexGrow: 1, justifyContent: "flex-end", paddingVertical: spacing.sm },
  empty: { borderWidth: 1, borderColor: colors.line, borderRadius: radii.md, backgroundColor: colors.glass, padding: spacing.lg, marginBottom: spacing.md },
  emptyTitle: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 15, marginBottom: spacing.xs },
  note: { fontFamily: fonts.body, color: colors.inkSoft, fontSize: 12, lineHeight: 18, marginVertical: spacing.xs },
  bubble: { maxWidth: "88%", padding: spacing.md, borderRadius: radii.md, marginBottom: spacing.sm },
  userBubble: { alignSelf: "flex-end", backgroundColor: colors.rose },
  assistantBubble: { alignSelf: "flex-start", backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.line },
  bubbleText: { fontFamily: fonts.body, fontSize: 13, color: colors.ink, lineHeight: 19 },
  citations: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: spacing.sm, paddingTop: spacing.sm, gap: 3 },
  citationsTitle: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.gold },
  citation: { fontFamily: fonts.body, fontSize: 10, color: colors.inkSoft },
  errorBox: { borderWidth: 1, borderColor: colors.danger, borderRadius: radii.md, padding: spacing.md, marginVertical: spacing.sm },
  error: { fontFamily: fonts.body, color: colors.danger, fontSize: 12 }, retry: { color: colors.gold, fontFamily: fonts.bodyBold, marginTop: spacing.sm, fontSize: 12 },
  disclaimer: { fontFamily: fonts.body, fontSize: 10, color: colors.inkSoft, marginBottom: spacing.xs },
  inputRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center", paddingTop: spacing.xs },
  input: { flex: 1, maxHeight: 110, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.glass, borderRadius: radii.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, color: colors.ink, fontFamily: fonts.body, fontSize: 14 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.rose, alignItems: "center", justifyContent: "center" },
  sendDisabled: { opacity: 0.45 }, sendText: { color: colors.white, fontSize: 18 },
});
