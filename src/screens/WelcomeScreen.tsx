import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, spacing, type } from "@/theme/tokens";
import { PrimaryButton } from "@/components/PrimaryButton";
import type { AuthStackParamList } from "@/navigation/RootNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "Welcome">;

export function WelcomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.center}>
        <View style={styles.orb} />
        <Text style={[type.h1, styles.title]}>Your skin, without{"\n"}the guesswork</Text>
        <Text style={[type.body, styles.sub]}>A simple routine, honest progress, no clutter.</Text>
      </View>
      <View style={styles.footer}>
        <PrimaryButton label="Get started" onPress={() => navigation.navigate("Signup")} />
        <Text style={styles.loginRow}>
          Already have an account?{" "}
          <Text style={styles.loginLink} onPress={() => navigation.navigate("Login")}>
            Log in
          </Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.plum, padding: spacing.xl, justifyContent: "space-between" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  orb: {
    width: 80, height: 80, borderRadius: 40, marginBottom: spacing.xl,
    backgroundColor: colors.rose, shadowColor: colors.gold, shadowOpacity: 0.5, shadowRadius: 30,
  },
  title: { textAlign: "center", marginBottom: spacing.sm },
  sub: { textAlign: "center" },
  footer: { paddingBottom: spacing.lg },
  loginRow: { textAlign: "center", marginTop: spacing.md, color: colors.inkSoft, fontFamily: "PlusJakartaSans_400Regular" },
  loginLink: { color: colors.gold, fontFamily: "PlusJakartaSans_700Bold" },
});
