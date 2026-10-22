import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, fonts, radii, spacing } from "@/theme/tokens";
import { PrimaryButton } from "@/components/PrimaryButton";
import type { AuthStackParamList } from "@/navigation/RootNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "Welcome">;

function useFloat(duration: number, delay = 0) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [value, delay, duration]);
  return value;
}

function Sparkle({ style, duration = 1300, delay = 0 }: { style: object; duration?: number; delay?: number }) {
  const progress = useFloat(duration, delay);
  const opacity = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.2, 1, 0.2] });
  const scale = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.7, 1.15, 0.7] });
  return (
    <Animated.View style={[styles.sparkle, style, { opacity, transform: [{ scale }] }]}>
      <View style={styles.sparkleLine} />
      <View style={[styles.sparkleLine, styles.sparkleCross]} />
    </Animated.View>
  );
}

function SerumBottle() {
  return (
    <View style={styles.serum}>
      <View style={styles.serumDropper} />
      <View style={styles.serumNeck} />
      <View style={styles.serumBody}>
        <View style={styles.serumLabel}>
          <View style={styles.labelMark} />
          <View style={styles.labelLine} />
          <View style={[styles.labelLine, styles.labelShort]} />
        </View>
      </View>
      <View style={styles.serumBase} />
    </View>
  );
}

function CleanserBottle() {
  return (
    <View style={styles.cleanser}>
      <View style={styles.pumpTop} />
      <View style={styles.pumpNeck} />
      <View style={styles.cleanserBody}>
        <View style={styles.cleanserLabel}>
          <View style={styles.labelMark} />
          <View style={styles.labelLine} />
          <View style={[styles.labelLine, styles.labelShort]} />
        </View>
      </View>
      <View style={styles.cleanserBase} />
    </View>
  );
}

function CreamJar() {
  return (
    <View style={styles.jar}>
      <View style={styles.jarLid} />
      <View style={styles.jarBody}>
        <View style={styles.jarLabel}>
          <View style={styles.labelMark} />
          <View style={[styles.labelLine, styles.jarLine]} />
        </View>
      </View>
    </View>
  );
}

function LeafSprig({ style }: { style: object }) {
  return (
    <View pointerEvents="none" style={[styles.sprig, style]}>
      <View style={styles.stem} />
      <View style={[styles.leaf, styles.leafOne]} />
      <View style={[styles.leaf, styles.leafTwo]} />
      <View style={[styles.leaf, styles.leafThree]} />
    </View>
  );
}

export function WelcomeScreen({ navigation }: Props) {
  const { height } = useWindowDimensions();
  const stageHeight = Math.min(272, Math.max(196, height * 0.33));
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.88)).current;
  const messageOpacity = useRef(new Animated.Value(0)).current;
  const messageY = useRef(new Animated.Value(22)).current;
  const buttonScale = useRef(new Animated.Value(0.92)).current;
  const leftFloat = useFloat(2500);
  const rightFloat = useFloat(3100, 180);
  const jarFloat = useFloat(2200, 360);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, damping: 13, stiffness: 110, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(messageOpacity, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(messageY, { toValue: 0, damping: 18, stiffness: 115, useNativeDriver: true }),
      ]),
      Animated.spring(buttonScale, { toValue: 1, damping: 12, stiffness: 125, useNativeDriver: true }),
    ]).start();
  }, [buttonScale, logoOpacity, logoScale, messageOpacity, messageY]);

  const floatStyle = (value: Animated.Value, distance: number) => ({
    transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [distance, -distance] }) }],
  });

  return (
    <SafeAreaView style={styles.screen}>
      <View pointerEvents="none" style={styles.ambientTop} />
      <View pointerEvents="none" style={styles.ambientBottom} />

      <Animated.View style={[styles.brandRow, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <View style={styles.brandGlyph}>
          <View style={styles.glyphPetalTop} />
          <View style={styles.glyphPetalLeft} />
          <View style={styles.glyphPetalRight} />
          <View style={styles.glyphCenter} />
        </View>
        <Text style={styles.brandName}>GlowTrack</Text>
        <View style={styles.brandRule} />
        <Text style={styles.brandNote}>SKINCARE, IN BALANCE</Text>
      </Animated.View>

      <View style={[styles.heroStage, { height: stageHeight }]}>
        <View pointerEvents="none" style={styles.stageHalo} />
        <View pointerEvents="none" style={styles.bubbleOne} />
        <View pointerEvents="none" style={styles.bubbleTwo} />
        <View pointerEvents="none" style={styles.bubbleThree} />
        <LeafSprig style={styles.sprigLeft} />
        <LeafSprig style={styles.sprigRight} />

        <Animated.View style={[styles.productFloat, styles.serumPosition, floatStyle(leftFloat, 7)]}>
          <SerumBottle />
        </Animated.View>
        <Animated.View style={[styles.productFloat, styles.cleanserPosition, floatStyle(rightFloat, 9)]}>
          <CleanserBottle />
        </Animated.View>
        <Animated.View style={[styles.productFloat, styles.jarPosition, floatStyle(jarFloat, 6)]}>
          <CreamJar />
        </Animated.View>
        <Sparkle style={styles.sparkleA} duration={1500} />
        <Sparkle style={styles.sparkleB} duration={1900} delay={280} />
        <Sparkle style={styles.sparkleC} duration={1650} delay={500} />
      </View>

      <Animated.View style={[styles.copy, { opacity: messageOpacity, transform: [{ translateY: messageY }] }]}>
        <Text style={styles.eyebrow}>A MOMENT FOR YOURSELF</Text>
        <Text style={styles.title}>Your glow,{"\n"}your routine.</Text>
        <Text style={styles.subtitle}>Simple skincare. Better habits.{"\n"}A little glow every day.</Text>
      </Animated.View>

      <View style={styles.footer}>
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <PrimaryButton label="Get Started" onPress={() => navigation.navigate("Signup")} style={styles.primaryButton} />
        </Animated.View>
        <Pressable accessibilityRole="button" onPress={() => navigation.navigate("Login")} hitSlop={10} style={styles.loginAction}>
          <Text style={styles.loginText}>I already have an account</Text>
          <Text style={styles.loginArrow}>›</Text>
        </Pressable>
        <Text style={styles.footerNote}>YOUR ROUTINE, AT YOUR OWN PACE</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.plum, paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.sm, overflow: "hidden" },
  ambientTop: { position: "absolute", width: 300, height: 300, borderRadius: 150, top: -150, right: -130, backgroundColor: colors.accentTint },
  ambientBottom: { position: "absolute", width: 280, height: 280, borderRadius: 140, bottom: -160, left: -130, backgroundColor: colors.beige },
  brandRow: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  brandGlyph: { width: 29, height: 29, borderRadius: 15, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", position: "relative" },
  glyphPetalTop: { position: "absolute", width: 7, height: 11, borderRadius: 7, backgroundColor: colors.gold, top: 4 },
  glyphPetalLeft: { position: "absolute", width: 7, height: 11, borderRadius: 7, backgroundColor: colors.beige, left: 6, bottom: 5, transform: [{ rotate: "-45deg" }] },
  glyphPetalRight: { position: "absolute", width: 7, height: 11, borderRadius: 7, backgroundColor: colors.rose, right: 6, bottom: 5, transform: [{ rotate: "45deg" }] },
  glyphCenter: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.plum, zIndex: 1 },
  brandName: { color: colors.ink, fontFamily: fonts.display, fontSize: 21, letterSpacing: 0.1 },
  brandRule: { height: 14, width: 1, backgroundColor: colors.line, marginHorizontal: 2 },
  brandNote: { color: colors.inkSoft, fontFamily: fonts.bodyBold, fontSize: 8, letterSpacing: 1.2 },
  heroStage: { width: "100%", alignItems: "center", justifyContent: "center", marginTop: 4 },
  stageHalo: { position: "absolute", width: 215, height: 215, borderRadius: 108, backgroundColor: colors.accentTint, borderWidth: 1, borderColor: colors.line },
  bubbleOne: { position: "absolute", width: 15, height: 15, borderRadius: 8, backgroundColor: colors.beige, top: "21%", left: "25%" },
  bubbleTwo: { position: "absolute", width: 9, height: 9, borderRadius: 5, backgroundColor: colors.beige, top: "59%", right: "18%" },
  bubbleThree: { position: "absolute", width: 6, height: 6, borderRadius: 3, backgroundColor: colors.beige, bottom: "18%", left: "35%" },
  sprig: { position: "absolute", width: 82, height: 105, opacity: 0.76 },
  sprigLeft: { left: 0, bottom: 19, transform: [{ rotate: "-18deg" }] },
  sprigRight: { right: -2, top: 6, transform: [{ rotate: "158deg" }] },
  stem: { position: "absolute", width: 1.5, height: 88, left: 41, top: 11, backgroundColor: colors.rose, transform: [{ rotate: "-26deg" }] },
  leaf: { position: "absolute", width: 19, height: 34, borderRadius: 19, borderTopLeftRadius: 3, backgroundColor: colors.rose },
  leafOne: { left: 15, top: 16, transform: [{ rotate: "-38deg" }] },
  leafTwo: { left: 45, top: 37, transform: [{ rotate: "48deg" }, { scale: 0.85 }] },
  leafThree: { left: 19, top: 62, transform: [{ rotate: "-43deg" }, { scale: 0.72 }] },
  productFloat: { position: "absolute", alignItems: "center", justifyContent: "center" },
  serumPosition: { left: "19%", top: 12 },
  cleanserPosition: { right: "16%", top: 0 },
  jarPosition: { left: "42%", bottom: 0 },
  serum: { width: 60, height: 137, alignItems: "center", justifyContent: "flex-end", shadowColor: colors.shadow, shadowOpacity: 0.28, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 7 },
  serumDropper: { width: 17, height: 21, borderTopLeftRadius: 5, borderTopRightRadius: 5, backgroundColor: colors.beige, borderWidth: 1, borderColor: colors.line },
  serumNeck: { width: 23, height: 8, marginBottom: -1, backgroundColor: colors.beige, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  serumBody: { width: 56, height: 94, borderRadius: 15, borderBottomLeftRadius: 19, borderBottomRightRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: colors.accentTint, borderWidth: 1, borderColor: colors.line, overflow: "hidden" },
  serumBase: { position: "absolute", width: 42, height: 4, borderRadius: 3, bottom: 0, backgroundColor: colors.roseDeep },
  serumLabel: { width: 39, height: 42, backgroundColor: colors.beige, alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 5 },
  labelMark: { width: 8, height: 8, borderRadius: 5, backgroundColor: colors.rose },
  labelLine: { width: 22, height: 2, borderRadius: 2, backgroundColor: colors.inkWash },
  labelShort: { width: 14, backgroundColor: colors.inkFaint },
  cleanser: { width: 66, height: 152, alignItems: "center", justifyContent: "flex-end", shadowColor: colors.shadow, shadowOpacity: 0.22, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  pumpTop: { width: 27, height: 8, borderTopRightRadius: 6, backgroundColor: colors.beige, marginLeft: 13 },
  pumpNeck: { width: 15, height: 19, backgroundColor: colors.beige, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  cleanserBody: { width: 60, height: 112, borderRadius: 18, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.accentTint, borderWidth: 1, borderColor: colors.line },
  cleanserBase: { position: "absolute", width: 43, height: 4, borderRadius: 3, bottom: 0, backgroundColor: colors.roseDeep },
  cleanserLabel: { width: 42, height: 48, backgroundColor: colors.beige, alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 6 },
  jar: { width: 94, height: 67, alignItems: "center", justifyContent: "flex-end", shadowColor: colors.shadow, shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 5 },
  jarLid: { width: 92, height: 15, borderRadius: 6, backgroundColor: colors.beige, borderWidth: 1, borderColor: colors.line },
  jarBody: { width: 84, height: 48, marginTop: -1, borderBottomLeftRadius: 17, borderBottomRightRadius: 17, borderTopLeftRadius: 8, borderTopRightRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: colors.beige, borderWidth: 1, borderColor: colors.line },
  jarLabel: { width: 43, height: 28, backgroundColor: colors.accentTint, borderRadius: 5, alignItems: "center", justifyContent: "center", gap: 3 },
  jarLine: { width: 17 },
  sparkle: { width: 13, height: 13, position: "absolute", alignItems: "center", justifyContent: "center" },
  sparkleA: { top: "19%", left: "43%" },
  sparkleB: { top: "40%", right: "11%", transform: [{ scale: 0.7 }] },
  sparkleC: { bottom: "20%", left: "20%", transform: [{ scale: 0.8 }] },
  sparkleLine: { position: "absolute", width: 2, height: 13, borderRadius: 2, backgroundColor: colors.beige },
  sparkleCross: { transform: [{ rotate: "90deg" }] },
  copy: { alignItems: "center", paddingTop: 4 },
  eyebrow: { color: colors.gold, fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 1.7, marginBottom: 9 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 39, lineHeight: 44, textAlign: "center", letterSpacing: -0.45 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 21, textAlign: "center", marginTop: 11 },
  footer: { paddingTop: spacing.md, paddingBottom: spacing.sm, alignItems: "stretch" },
  primaryButton: { borderRadius: radii.pill, minHeight: 54, backgroundColor: colors.rose, shadowColor: colors.rose, shadowOpacity: 0.24, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  loginAction: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  loginText: { color: colors.inkSoft, fontFamily: fonts.bodyMedium, fontSize: 12 },
  loginArrow: { color: colors.gold, fontFamily: fonts.body, fontSize: 21, marginTop: -2 },
  footerNote: { color: colors.inkSoft, fontFamily: fonts.bodyBold, fontSize: 8, letterSpacing: 1.4, textAlign: "center", marginTop: 2 },
});
