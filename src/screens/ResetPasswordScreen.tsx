import React, { useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radii, spacing, type } from "@/theme/tokens";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

export function ResetPasswordScreen({ navigation }: any) {
  const { session, recoveryStatus, clearPasswordRecovery, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const confirmationInput = useRef<TextInput>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updatePassword = async () => {
    if (saving) return;
    if (recoveryStatus !== "pending" || !session) { setError("This recovery link is no longer valid. Request a new link to continue."); return; }
    if (password.length < 8) { setError("Use at least 8 characters for your new password."); return; }
    if (password !== confirmPassword) { setError("Those passwords don't match yet."); return; }
    setSaving(true); setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        const expired = /session|token|expired|invalid/i.test(updateError.message);
        setError(expired ? "This recovery link has expired or was already used. Request a new link to continue." : "We couldn't update your password. Please try again.");
        return;
      }
      setPassword(""); setConfirmPassword(""); setSuccess(true);
    } catch {
      setError("We couldn't update your password. Check your connection and try again.");
    } finally { setSaving(false); }
  };

  const requestAnother = () => navigation.navigate("ForgotPassword");
  const returnToLogin = async () => { if (session) await signOut(); clearPasswordRecovery(); };

  if (success) return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}>
      <ScrollView contentContainerStyle={styles.content} keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}>
        <Text style={styles.eyebrow}>PASSWORD UPDATED</Text>
        <Text style={[type.h1, styles.title]}>You're all set</Text>
        <Text style={[type.body, styles.subtitle]}>Your password has been changed. Continue into GlowTrack or return to login.</Text>
        <PrimaryButton label="Continue to GlowTrack" onPress={clearPasswordRecovery} style={styles.button} />
        <Pressable accessibilityRole="button" onPress={() => { void returnToLogin(); }} style={styles.link}><Text style={styles.linkText}>Return to login</Text></Pressable>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  const checkingLink = recoveryStatus === "pending" && !session;
  const invalidLink = recoveryStatus === "invalid" || (recoveryStatus === "none" && !session);
  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}>
        {checkingLink ? <>
          <Text style={[type.h1, styles.title]}>Opening your secure link…</Text>
          <Text style={[type.body, styles.subtitle]}>Please wait while we validate your password recovery session.</Text>
        </> : invalidLink ? <>
          <Text style={styles.eyebrow}>LINK UNAVAILABLE</Text>
          <Text style={[type.h1, styles.title]}>Request a fresh link</Text>
          <Text style={[type.body, styles.subtitle]}>This recovery link may have expired or already been used. Request another email to set a new password.</Text>
          <PrimaryButton label="Request another email" onPress={requestAnother} style={styles.button} />
          <Pressable accessibilityRole="button" onPress={() => { void returnToLogin(); }} style={styles.link}><Text style={styles.linkText}>Return to login</Text></Pressable>
        </> : <>
          <Text style={styles.eyebrow}>SECURE YOUR ACCOUNT</Text>
          <Text style={[type.h1, styles.title]}>Choose a new password</Text>
          <Text style={[type.body, styles.subtitle]}>Use at least 8 characters, then enter it again to confirm.</Text>
          <TextInput style={styles.input} placeholder="New password" placeholderTextColor={colors.inkSoft} secureTextEntry={!showPassword} autoComplete="new-password" textContentType="newPassword" value={password} onChangeText={(value) => { setPassword(value); setError(null); }} returnKeyType="next" onSubmitEditing={() => confirmationInput.current?.focus()} />
          <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? "Hide password" : "Show password"} onPress={() => setShowPassword((value) => !value)} style={styles.visibility}><Text style={styles.visibilityText}>{showPassword ? "Hide password" : "Show password"}</Text></Pressable>
          <TextInput ref={confirmationInput} style={styles.input} placeholder="Confirm new password" placeholderTextColor={colors.inkSoft} secureTextEntry={!showConfirmation} autoComplete="new-password" textContentType="newPassword" value={confirmPassword} onChangeText={(value) => { setConfirmPassword(value); setError(null); }} returnKeyType="done" onSubmitEditing={() => { Keyboard.dismiss(); void updatePassword(); }} />
          <Pressable accessibilityRole="button" accessibilityLabel={showConfirmation ? "Hide confirmation" : "Show confirmation"} onPress={() => setShowConfirmation((value) => !value)} style={styles.visibility}><Text style={styles.visibilityText}>{showConfirmation ? "Hide confirmation" : "Show confirmation"}</Text></Pressable>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <PrimaryButton label="Update password" onPress={() => { void updatePassword(); }} loading={saving} disabled={saving} style={styles.button} />
        </>}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.plum, padding: spacing.xl, paddingTop: spacing.lg },
  keyboard: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", paddingBottom: spacing.xl },
  eyebrow: { color: colors.gold, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.4, marginBottom: spacing.sm },
  title: { marginBottom: spacing.sm }, subtitle: { marginBottom: spacing.xl },
  input: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.glass, borderRadius: radii.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.xs, color: colors.ink, fontFamily: fonts.body, fontSize: 14 },
  visibility: { alignSelf: "flex-end", minHeight: 40, justifyContent: "center", paddingHorizontal: spacing.sm, marginBottom: spacing.xs },
  visibilityText: { color: colors.gold, fontFamily: fonts.bodyMedium, fontSize: 12 }, error: { color: colors.danger, fontFamily: fonts.body, fontSize: 12, marginVertical: spacing.sm },
  button: { marginTop: spacing.md }, link: { alignSelf: "center", padding: spacing.md, marginTop: spacing.sm }, linkText: { color: colors.gold, fontFamily: fonts.bodyMedium, fontSize: 13 },
});
