import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { colors, fonts, radii, spacing, type } from "@/theme/tokens";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

const MESSAGES = ["Understanding your saved skin profile…", "Reviewing your skincare goals…", "Preparing your personalized experience…"];

export function AssessmentAnalysisScreen({ navigation, route }: any) {
  const { session } = useAuth();
  const [messageIndex, setMessageIndex] = useState(route.params?.alreadySaved ? MESSAGES.length - 1 : 0);
  const [ready, setReady] = useState(!!route.params?.alreadySaved);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [checkingProducts, setCheckingProducts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rotation = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(route.params?.alreadySaved ? 1 : 1 / MESSAGES.length)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion); }, []);
  useEffect(() => {
    if (ready || reduceMotion) { setReady(true); setMessageIndex(MESSAGES.length - 1); return; }
    const spin = Animated.loop(Animated.timing(rotation, { toValue: 1, duration: 5200, easing: Easing.linear, useNativeDriver: true }));
    const breathe = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.08, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    const glow = Animated.loop(Animated.sequence([
      Animated.timing(shimmer, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(shimmer, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    spin.start(); breathe.start(); glow.start();
    intervalRef.current = setInterval(() => setMessageIndex((current) => {
      const next = Math.min(current + 1, MESSAGES.length - 1);
      Animated.timing(progress, { toValue: (next + 1) / MESSAGES.length, duration: 500, useNativeDriver: false }).start();
      return next;
    }), 650);
    const finish = setTimeout(() => { setReady(true); setMessageIndex(MESSAGES.length - 1); progress.setValue(1); }, 2050);
    return () => { spin.stop(); breathe.stop(); glow.stop(); progress.stopAnimation(); if (intervalRef.current) clearInterval(intervalRef.current); clearTimeout(finish); };
  }, [ready, reduceMotion, rotation, pulse, shimmer, progress]);

  useFocusEffect(React.useCallback(() => {
    setError(null);
    return undefined;
  }, []));

  const viewProducts = async () => {
    if (!session?.user || checkingProducts) return;
    setCheckingProducts(true); setError(null);
    const { data, error: queryError } = await supabase.from("user_products").select("id, source").eq("user_id", session.user.id).or("source.is.null,source.in.(manual,recommendation_accepted)");
    setCheckingProducts(false);
    if (queryError) { setError(`We couldn't check your saved products. Please try again. ${queryError.message}`); return; }
    // Existing and empty collections both open the existing product manager;
    // that screen displays the real records and its add form.
    navigation.navigate("AddExistingProducts", { hasProducts: (data ?? []).length > 0 });
  };

  const rotationDegrees = rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const glowOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] });
  const progressWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.top}><Text style={styles.brand}>GLOWTRACK</Text><Text style={styles.step}>YOUR SKIN PROFILE</Text></View>
      <View style={styles.visualArea}>
        <Animated.View style={[styles.halo, { opacity: glowOpacity, transform: [{ scale: pulse }] }]} />
        <Animated.View style={[styles.flowerOuter, { transform: [{ rotate: rotationDegrees }] }]}>
          {Array.from({ length: 8 }, (_, index) => <View key={index} style={[styles.petal, { transform: [{ rotate: `${index * 45}deg` }, { translateY: -42 }] }]} />)}
        </Animated.View>
        <Animated.View style={[styles.flowerCore, { transform: [{ scale: pulse }] }]}><View style={styles.coreDot} /></Animated.View>
        <View style={styles.sparkleOne} /><View style={styles.sparkleTwo} /><View style={styles.sparkleThree} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>{ready ? "PROFILE READY" : "A MOMENT FOR YOU"}</Text>
        <Text style={[type.h1, styles.title]}>{ready ? "Your profile is ready" : "Putting your profile together"}</Text>
        <Text style={styles.body}>{ready ? "Your answers are saved. Choose evidence-based suggestions or add the products you already own." : "We're saving your answers and organizing your preferences for your GlowTrack experience."}</Text>
        <View style={styles.status}><View style={[styles.statusDot, ready && styles.statusDotReady]} /><Text accessibilityLiveRegion="polite" style={styles.statusText}>{ready ? "Your skin profile is ready!" : MESSAGES[messageIndex]}</Text></View>
        {!ready ? <View style={styles.track}><Animated.View style={[styles.trackFill, { width: progressWidth }]} /></View> : null}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      </View>
      <PrimaryButton label="View Recommended Products" onPress={() => {
        const names: string[] = navigation?.getState?.()?.routeNames ?? [];
        navigation.navigate(names.includes("ProductRecommendation") ? "ProductRecommendation" : "Recommendations");
      }} loading={!ready} disabled={!ready || checkingProducts} style={styles.cta} />
      <PrimaryButton label="Add Your Own Products" variant="ghost" onPress={() => { void viewProducts(); }} loading={checkingProducts} disabled={!ready} style={styles.secondaryCta} />
      <Text style={styles.footnote}>A personalized profile, made from the answers you shared.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.plum, paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.sm },
  top: { alignItems: "center", gap: 6 }, brand: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 2, color: colors.rose }, step: { fontFamily: fonts.body, fontSize: 9, letterSpacing: 1.5, color: colors.inkSoft },
  visualArea: { flex: 1, minHeight: 230, alignItems: "center", justifyContent: "center" }, halo: { position: "absolute", width: 210, height: 210, borderRadius: 105, backgroundColor: colors.accentTint },
  flowerOuter: { width: 150, height: 150, alignItems: "center", justifyContent: "center" }, petal: { position: "absolute", width: 35, height: 68, borderRadius: 22, backgroundColor: colors.rose, opacity: 0.92 }, flowerCore: { position: "absolute", width: 44, height: 44, borderRadius: 22, backgroundColor: colors.beige, alignItems: "center", justifyContent: "center" }, coreDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.rose },
  sparkleOne: { position: "absolute", top: "25%", left: "18%", width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accentTint }, sparkleTwo: { position: "absolute", top: "31%", right: "17%", width: 5, height: 5, borderRadius: 3, backgroundColor: colors.gold }, sparkleThree: { position: "absolute", bottom: "24%", right: "24%", width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accentTint },
  copy: { alignItems: "center", paddingBottom: spacing.md }, eyebrow: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.5, color: colors.rose, marginBottom: spacing.sm }, title: { textAlign: "center", color: colors.ink, fontSize: 29, marginBottom: spacing.sm }, body: { fontFamily: fonts.body, color: colors.inkSoft, fontSize: 13, textAlign: "center", lineHeight: 21, maxWidth: 330 },
  status: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: spacing.lg, minHeight: 20 }, statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.rose }, statusDotReady: { backgroundColor: colors.rose }, statusText: { color: colors.inkSoft, fontFamily: fonts.bodyMedium, fontSize: 11 }, track: { width: 150, height: 3, borderRadius: 2, backgroundColor: colors.beige, marginTop: spacing.md, overflow: "hidden" }, trackFill: { height: "100%", width: "100%", backgroundColor: colors.rose }, error: { color: colors.danger, fontFamily: fonts.body, fontSize: 11, textAlign: "center", marginTop: spacing.sm },
  cta: { backgroundColor: colors.rose, minHeight: 54, borderRadius: radii.md }, secondaryCta: { marginTop: spacing.xs }, footnote: { textAlign: "center", color: colors.inkSoft, fontFamily: fonts.body, fontSize: 10, marginTop: spacing.sm },
});
