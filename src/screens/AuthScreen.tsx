import React, { useRef, useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert, ScrollView, Pressable, KeyboardAvoidingView, Keyboard, Platform } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, spacing, radii, type, fonts } from "@/theme/tokens";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAuth } from "@/context/AuthContext";
import type { AuthStackParamList } from "@/navigation/RootNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "Signup" | "Login">;

export function AuthScreen({ route, navigation }: Props) {
  const mode = route.name; // "Signup" | "Login"
  const { signUp, resendSignupConfirmation, signIn, signInWithGoogle } = useAuth();
  const insets = useSafeAreaInsets();
  const emailInput = useRef<TextInput>(null);
  const passwordInput = useRef<TextInput>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<{ kind: "cancelled" | "error"; message: string } | null>(null);
  const [confirmationPending, setConfirmationPending] = useState(false);

  const onGooglePress = async () => {
    if (googleLoading || loading) return;
    setGoogleStatus(null);
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.status === "success") {
        Alert.alert("Signed in", "You're signed in with Google.");
      } else if (result.status === "cancelled") {
        setGoogleStatus({ kind: "cancelled", message: "Sign-in cancelled. You can try again whenever you're ready." });
      } else {
        setGoogleStatus({ kind: "error", message: result.message });
      }
    } catch (error) {
      setGoogleStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Google sign-in could not be completed. Please try again.",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const onSubmit = async () => {
    if (!email || !password) {
      Alert.alert("Missing info", "Please fill in email and password.");
      return;
    }
    setLoading(true);
    setConfirmationPending(false);
    try {
      if (mode === "Signup") {
        const result = await signUp(email.trim(), password, fullName.trim());
        if (result.status === "error") { Alert.alert("Couldn't create your account", result.message); return; }
        if (result.status === "confirmation_required") setConfirmationPending(true);
      } else {
        const errorMessage = await signIn(email.trim(), password);
        if (errorMessage) Alert.alert("Couldn't continue", errorMessage);
      }
    } catch {
      Alert.alert("Couldn't continue", "We couldn't reach the sign-in service. Check your connection and try again.");
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}>
      <Text style={[type.h1, styles.title]}>
        {mode === "Signup" ? "Create your account" : "Welcome back"}
      </Text>
      <Text style={[type.body, styles.sub]}>
        {mode === "Signup"
          ? "Your routine, products and progress — all in one calm place."
          : "Log in to pick up where you left off."}
      </Text>

      {confirmationPending ? <View style={styles.confirmation}>
        <Text style={styles.confirmationTitle}>Check your inbox</Text>
        <Text style={styles.googleStatus}>Supabase requires email confirmation for this account. Use the link sent to {email.trim()} to finish signing up.</Text>
        <Pressable accessibilityRole="button" disabled={loading} onPress={async () => {
          setLoading(true);
          try {
            const error = await resendSignupConfirmation(email.trim());
            Alert.alert(error ? "Couldn't resend the email" : "Email sent", error ?? "A new confirmation link is on its way.");
          } catch {
            Alert.alert("Couldn't resend the email", "Check your connection and try again.");
          } finally { setLoading(false); }
        }} style={styles.forgotLink}><Text style={styles.forgotText}>Resend confirmation email</Text></Pressable>
      </View> : null}

      {mode === "Signup" && (
        <TextInput
          style={styles.input}
          placeholder="Full name"
          placeholderTextColor={colors.inkSoft}
          value={fullName}
          onChangeText={setFullName}
          returnKeyType="next"
          onSubmitEditing={() => emailInput.current?.focus()}
        />
      )}
      <TextInput
        ref={emailInput}
        style={styles.input}
        placeholder="Email address"
        placeholderTextColor={colors.inkSoft}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        returnKeyType="next"
        onSubmitEditing={() => passwordInput.current?.focus()}
      />
      <TextInput
        ref={passwordInput}
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={colors.inkSoft}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        returnKeyType="done"
        onSubmitEditing={() => { Keyboard.dismiss(); void onSubmit(); }}
      />

      {mode === "Login" ? (
        <Pressable accessibilityRole="button" onPress={() => navigation.navigate("ForgotPassword")} style={styles.forgotLink}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </Pressable>
      ) : null}

      <PrimaryButton
        label={mode === "Signup" ? "Continue" : "Log in"}
        onPress={onSubmit}
        loading={loading || googleLoading}
        style={{ marginTop: spacing.md }}
      />

      <Text style={styles.or}>OR</Text>

      <PrimaryButton
        label="Continue with Google"
        onPress={onGooglePress}
        loading={googleLoading || loading}
        variant="ghost"
      />
      {googleStatus ? (
        <Text accessibilityRole={googleStatus.kind === "error" ? "alert" : undefined} style={[styles.googleStatus, googleStatus.kind === "error" && styles.googleError]}>
          {googleStatus.message}
        </Text>
      ) : null}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.plum, padding: spacing.xl, paddingTop: spacing.xxl },
  keyboard: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", paddingBottom: spacing.lg },
  title: { marginBottom: spacing.xs },
  sub: { marginBottom: spacing.xl },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.glass,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  or: { textAlign: "center", color: colors.inkSoft, fontFamily: fonts.body, fontSize: 11, marginVertical: spacing.sm },
  googleStatus: { textAlign: "center", color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12, lineHeight: 18, marginTop: spacing.sm },
  googleError: { color: colors.danger },
  confirmation: { padding: spacing.md, marginBottom: spacing.md, borderRadius: radii.md, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.line },
  confirmationTitle: { color: colors.gold, fontFamily: fonts.bodyBold, fontSize: 14, marginBottom: spacing.xs },
  forgotLink: { alignSelf: "flex-end", minHeight: 40, justifyContent: "center", paddingHorizontal: spacing.xs },
  forgotText: { color: colors.gold, fontFamily: fonts.bodyMedium, fontSize: 12 },
});
