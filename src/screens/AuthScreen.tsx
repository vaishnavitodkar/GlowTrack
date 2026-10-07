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
  const { signUp, signIn } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!email || !password) {
      Alert.alert("Missing info", "Please fill in email and password.");
      return;
    }
    setLoading(true);
    const errorMessage =
      mode === "Signup" ? await signUp(email, password, fullName) : await signIn(email, password);
    setLoading(false);
    // On success, AuthContext's session listener automatically switches the
    // app into the onboarding/main navigator — no manual navigation needed here.
    if (errorMessage) Alert.alert("Couldn't continue", errorMessage);
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
});
