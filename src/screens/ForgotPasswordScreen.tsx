import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { makeRedirectUri } from "expo-auth-session";
import { colors, fonts, radii, spacing, type } from "@/theme/tokens";
import { PrimaryButton } from "@/components/PrimaryButton";
import { supabase } from "@/lib/supabase";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestReset = async () => {
    if (loading) return;
    const normalizedEmail = email.trim();
    if (!EMAIL.test(normalizedEmail)) { setError("Enter a valid email address and try again."); return; }
    setLoading(true); setError(null);
    try {
      const redirectTo = makeRedirectUri({ scheme: "glowtrack", path: "auth/reset-password" });
      const { error: requestError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
      if (requestError) throw requestError;
      setSent(true);
    } catch {
      // Keep this generic so the screen never confirms whether an address is registered.
      setError("We couldn't send a reset request right now. Check your connection and try again.");
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" accessibilityLabel="Back to login" onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹  Back</Text>
        </Pressable>
        <Text style={[type.h1, styles.title]}>{sent ? "Check your inbox" : "Reset your password"}</Text>
        <Text style={[type.body, styles.subtitle]}>{sent ? "If an account matches that address, we'll send a secure link to reset your password." : "Enter the email address for your GlowTrack account and we'll send a secure reset link."}</Text>
        {!sent ? <>
          <TextInput
            style={styles.input} placeholder="Email address" placeholderTextColor={colors.inkSoft}
            autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress"
            accessibilityLabel="Email address" value={email} onChangeText={(value) => { setEmail(value); setError(null); }}
          />
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <PrimaryButton label="Send reset link" onPress={() => { void requestReset(); }} loading={loading} disabled={loading} style={styles.button} />
        </> : <View style={styles.sentCard}><Text style={styles.sentText}>For security, this confirmation is the same whether or not the address is registered. Open the email link on this device to choose a new password.</Text></View>}
        <Pressable accessibilityRole="button" onPress={() => navigation.navigate("Login")} style={styles.loginLink}><Text style={styles.loginText}>{sent ? "Return to login" : "Back to login"}</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.plum, padding: spacing.xl, paddingTop: spacing.lg },
  content: { flexGrow: 1, justifyContent: "center", paddingBottom: spacing.xl },
  back: { color: colors.gold, fontFamily: fonts.bodyMedium, fontSize: 13, marginBottom: spacing.xxl },
  title: { marginBottom: spacing.sm }, subtitle: { marginBottom: spacing.xl },
  input: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.glass, borderRadius: radii.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.sm, color: colors.ink, fontFamily: fonts.body, fontSize: 14 },
  error: { color: colors.danger, fontFamily: fonts.body, fontSize: 12, marginBottom: spacing.md }, button: { marginTop: spacing.sm },
  sentCard: { borderRadius: radii.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.glass, padding: spacing.lg },
  sentText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 20 }, loginLink: { alignSelf: "center", padding: spacing.md, marginTop: spacing.md }, loginText: { color: colors.gold, fontFamily: fonts.bodyMedium, fontSize: 13 },
});
