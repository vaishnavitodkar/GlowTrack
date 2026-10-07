import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, spacing, radii, type, fonts } from "@/theme/tokens";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAuth } from "@/context/AuthContext";
import type { AuthStackParamList } from "@/navigation/RootNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "Signup" | "Login">;

export function AuthScreen({ route }: Props) {
  const mode = route.name; // "Signup" | "Login"
  const { signUp, signIn, signInWithGoogle } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const onGooglePress = async () => {
    setGoogleLoading(true);
    const errorMessage = await signInWithGoogle();
    setGoogleLoading(false);
    // null errorMessage on a cancelled sign-in is expected — don't alert for that.
    if (errorMessage) Alert.alert("Couldn't continue with Google", errorMessage);
  };

  const onSubmit = async () => {
    if (!email || !password) {
      Alert.alert("Missing info", "Please fill in email and password.");
      return;
    }
    setLoading(true);
    const errorMessage =
      mode === "Signup" ? await signUp(email, password, fullName) : await signIn(email, password);
    setLoading(false);

    if (errorMessage) {
      Alert.alert("Couldn't continue", errorMessage);
      return;
    }

    // On success with an active session, AuthContext's listener automatically
    // switches the app into onboarding/main — no manual navigation needed.
    // But if "Confirm email" is still on in Supabase, signUp succeeds with no
    // session yet, and nothing would otherwise tell the user why the screen
    // hasn't changed — so make that case visible instead of silent.
    if (mode === "Signup") {
      Alert.alert(
        "Check your email",
        "If email confirmation is enabled in your Supabase project, confirm your address before logging in. If you've disabled it for testing, you should be in the app already."
      );
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
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

      <PrimaryButton
        label={mode === "Signup" ? "Continue" : "Log in"}
        onPress={onSubmit}
        loading={loading}
        style={{ marginTop: spacing.md }}
      />

      <Text style={styles.or}>OR</Text>

      <PrimaryButton
        label="Continue with Google"
        onPress={onGooglePress}
        loading={googleLoading}
        variant="ghost"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.plum, padding: spacing.xl, paddingTop: spacing.xxl },
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
});