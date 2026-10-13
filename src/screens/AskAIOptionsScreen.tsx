import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts, radii, spacing, type } from "@/theme/tokens";

export function AskAIOptionsScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.screen}>
      <Text style={type.label}>Choose your support</Text>
      <Text style={[type.h1, styles.title]}>How can we help?</Text>
      <Text style={[type.body, styles.sub]}>Pick the kind of skincare help you need today.</Text>
      <Pressable accessibilityRole="button" onPress={() => navigation.navigate("AIAdvisor")} style={styles.card}>
        <Text style={styles.eyebrow}>PERSONALIZED GUIDANCE</Text>
        <Text style={styles.name}>AI Adviser</Text>
        <Text style={styles.description}>Explore a skin concern and get structured guidance based on your assessment and routine.</Text>
        <Text style={styles.action}>Open AI Adviser  ›</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => navigation.navigate("AIChat")} style={styles.card}>
        <Text style={styles.eyebrow}>FOLLOW-UP QUESTIONS</Text>
        <Text style={styles.name}>AI Chatbot</Text>
        <Text style={styles.description}>Ask questions naturally and continue with follow-ups in a conversational chat.</Text>
        <Text style={styles.action}>Open AI Chatbot  ›</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.plum, padding: spacing.xl, paddingTop: spacing.xxl },
  title: { marginTop: spacing.xs, marginBottom: spacing.xs },
  sub: { marginBottom: spacing.lg },
  card: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.glass, borderRadius: radii.md, padding: spacing.lg, marginBottom: spacing.md },
  eyebrow: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1, color: colors.gold, marginBottom: spacing.xs },
  name: { fontFamily: fonts.bodyBold, fontSize: 19, color: colors.ink, marginBottom: spacing.xs },
  description: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.inkSoft },
  action: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.rose, marginTop: spacing.md },
});
