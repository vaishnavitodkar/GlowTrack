import React from "react";
import { View, Text, StyleSheet, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, type, fonts } from "@/theme/tokens";
import { GlassCard } from "@/components/GlassCard";
import { PrimaryButton } from "@/components/PrimaryButton";

const DOCTORS = [
  { name: "Dr. Aisha Mehta", sub: "Dermatologist · 12 yrs exp", link: "https://wa.me/yourclinicnumber" },
  { name: "Dr. Rohan Shah", sub: "Cosmetic dermatologist", link: "https://wa.me/yourclinicnumber" },
];

export function DermatologistScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <Text style={type.label}>Expert care</Text>
      <Text style={[type.h1, styles.title]}>Talk to a dermatologist</Text>
      <Text style={[type.body, styles.sub]}>
        For concerns that need a trained eye, connect with a verified specialist.
      </Text>

      {DOCTORS.map((d) => (
        <GlassCard key={d.name} style={{ marginBottom: spacing.sm }}>
          <Text style={styles.name}>{d.name}</Text>
          <Text style={styles.sub2}>{d.sub}</Text>
          <PrimaryButton
            label="Book consult"
            variant="ghost"
            onPress={() => Linking.openURL(d.link)}
            style={{ marginTop: spacing.sm }}
          />
        </GlassCard>
      ))}

      <Text style={styles.footnote}>
        Consultations happen outside GlowTrack with our licensed partner. That's intentional — we're not a
        medical provider.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.plum, padding: spacing.xl, paddingTop: spacing.xxl },
  title: { marginBottom: spacing.xs },
  sub: { marginBottom: spacing.lg },
  name: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  sub2: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  footnote: { fontFamily: fonts.body, fontSize: 11, color: colors.inkSoft, marginTop: "auto", lineHeight: 16 },
});
