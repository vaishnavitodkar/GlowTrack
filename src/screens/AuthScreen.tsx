import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, spacing, radii, type, fonts } from "@/theme/tokens";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAuth } from "@/context/AuthContext";
import type { AuthStackParamList } from "@/navigation/RootNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "Signup" | "Login">;

export function AuthScreen({ route, navigation }: Props) {
  const mode = route.name; // "Signup" | "Login"
  const { signUp, signIn, signInWithGoogle } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<{ kind: "cancelled" | "error"; message: string } | null>(null);

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
    try {
      const errorMessage = mode === "Signup"
        ? await signUp(email.trim(), password, fullName.trim())
        : await signIn(email.trim(), password);
      if (errorMessage) {
        Alert.alert("Couldn't continue", errorMessage);
        return;
      }
      if (mode === "Signup") {
        Alert.alert(
          "Check your email",
          "If email confirmation is enabled in your Supabase project, confirm your address before logging in. If you've disabled it for testing, you should be in the app already."
        );
      }
    } catch {
      Alert.alert("Couldn't continue", "We couldn't reach the sign-in service. Check your connection and try again.");
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={[type.h1, styles.title]}>
        {mode === "Signup" ? "Create your account" : "Welcome back"}
      </Text>
      <Text style={[type.body, styles.sub]}>
        {mode === "Signup"
          ? "Your routine, products and progress — all in one calm place."
          : "Log in to pick up where you left off."}
      </Text>

      {mode === "Signup" && (
        <TextInput
          style={styles.input}
          placeholder="Full name"
          placeholderTextColor={colors.inkSoft}
          value={fullName}
          onChangeText={setFullName}
        />
      )}
      <TextInput
        style={styles.input}
        placeholder="Email address"
        placeholderTextColor={colors.inkSoft}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={colors.inkSoft}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.plum, padding: spacing.xl, paddingTop: spacing.xxl },
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
  forgotLink: { alignSelf: "flex-end", minHeight: 40, justifyContent: "center", paddingHorizontal: spacing.xs },
  forgotText: { color: colors.gold, fontFamily: fonts.bodyMedium, fontSize: 12 },
});
