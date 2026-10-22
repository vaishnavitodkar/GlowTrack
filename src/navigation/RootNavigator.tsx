import React, { useCallback, useEffect, useState } from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { colors, fonts } from "@/theme/tokens";

import { WelcomeScreen } from "@/screens/WelcomeScreen";
import { AuthScreen } from "@/screens/AuthScreen";
import { ForgotPasswordScreen } from "@/screens/ForgotPasswordScreen";
import { ResetPasswordScreen } from "@/screens/ResetPasswordScreen";
import { SkinQuestionsScreen } from "@/screens/SkinQuestionsScreen";
import { AssessmentAnalysisScreen } from "@/screens/AssessmentAnalysisScreen";
import { GoalSelectionScreen } from "@/screens/GoalSelectionScreen";
import { ProductRecommendationScreen } from "@/screens/ProductRecommendationScreen";
import { AddExistingProductsScreen } from "@/screens/AddExistingProductsScreen";
import { HomeScreen } from "@/screens/HomeScreen";
import { RoutineScreen } from "@/screens/RoutineScreen";
import { CheckInScreen } from "@/screens/CheckInScreen";
import { ProgressScreen } from "@/screens/ProgressScreen";
import { AIAdvisorScreen } from "@/screens/AIAdvisorScreen";
import { DermatologistScreen } from "@/screens/DermatologistScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { AskAIOptionsScreen } from "@/screens/AskAIOptionsScreen";
import { AIChatbotScreen } from "@/screens/AIChatbotScreen";
import { AccountSettingsScreen } from "@/screens/AccountSettingsScreen";
import { PrimaryButton } from "@/components/PrimaryButton";
import { spacing, type as textStyles } from "@/theme/tokens";

export type AuthStackParamList = {
  Welcome: undefined;
  Signup: undefined;
  Login: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const OnboardingStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();
const MainTabs = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.plum, card: colors.dusk, border: colors.line, text: colors.ink, primary: colors.rose },
};

function AuthNavigator({ initialRouteName = "Welcome" }: { initialRouteName?: keyof AuthStackParamList }) {
  return (
    <AuthStack.Navigator initialRouteName={initialRouteName} screenOptions={{ headerShown: false, animation: "fade_from_bottom" }}>
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="Signup" component={AuthScreen} />
      <AuthStack.Screen name="Login" component={AuthScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </AuthStack.Navigator>
  );
}

function OnboardingNavigator({ onComplete }: { onComplete: () => void }) {
  // Full pre-Home flow, matching screens 03-07 of the Figma file.
  // Dermatologist is reachable from the AI Advisor tab later, not here.
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name="SkinQuestions" component={SkinQuestionsScreen} />
      <OnboardingStack.Screen name="AssessmentAnalysis" component={AssessmentAnalysisScreen} />
      <OnboardingStack.Screen name="GoalSelection" component={GoalSelectionScreen} />
      <OnboardingStack.Screen name="ProductRecommendation" component={ProductRecommendationScreen} />
      <OnboardingStack.Screen name="AddExistingProducts" component={AddExistingProductsScreen} />
      <OnboardingStack.Screen name="Routine">
        {(props) => <RoutineScreen {...props} onComplete={onComplete} />}
      </OnboardingStack.Screen>
    </OnboardingStack.Navigator>
  );
}

function MainTabsNavigator() {
  const insets = useSafeAreaInsets();
  const iconFor: Record<string, string> = { Home: "⌂", Routine: "◷", Progress: "▥", AskAI: "✦", Profile: "●" };
  // Five primary destinations, matching the existing screen 08 design.
  return (
    <MainTabs.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18, lineHeight: 21 }}>{iconFor[route.name] ?? "•"}</Text>,
      tabBarActiveTintColor: colors.gold,
      tabBarInactiveTintColor: colors.inkSoft,
      tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 9, marginBottom: 2 },
      tabBarStyle: { backgroundColor: colors.dusk, borderTopColor: colors.line, height: 54 + insets.bottom, paddingTop: 5, paddingBottom: Math.max(5, insets.bottom) },
      tabBarHideOnKeyboard: true,
    })}>
      <MainTabs.Screen name="Home" component={HomeScreen} />
      <MainTabs.Screen name="Routine" component={RoutineScreen} />
      <MainTabs.Screen name="Progress" component={ProgressScreen} />
      <MainTabs.Screen name="AskAI" component={AskAIOptionsScreen} options={{ title: "Ask AI" }} />
      <MainTabs.Screen name="Profile" component={ProfileScreen} />
    </MainTabs.Navigator>
  );
}

function MainNavigator({ initialRouteName }: { initialRouteName: "Tabs" | "Products" }) {
  return (
    <AppStack.Navigator initialRouteName={initialRouteName} screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="Tabs" component={MainTabsNavigator} />
      <AppStack.Screen name="Products" component={AddExistingProductsScreen} />
      <AppStack.Screen name="Routine" component={RoutineScreen} />
      <AppStack.Screen name="CheckIn" component={CheckInScreen} />
      <AppStack.Screen name="Dermatologist" component={DermatologistScreen} />
      <AppStack.Screen name="Recommendations" component={ProductRecommendationScreen} />
      <AppStack.Screen name="AIAdvisor" component={AIAdvisorScreen} />
      <AppStack.Screen name="AIChat" component={AIChatbotScreen} />
      <AppStack.Screen name="AccountSettings" component={AccountSettingsScreen} />
    </AppStack.Navigator>
  );
}

export function RootNavigator() {
  const { session, loading, recoveryStatus } = useAuth();
  const userId = session?.user.id;
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [productsFirst, setProductsFirst] = useState(false);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    if (!userId || recoveryStatus !== "none") {
      setRoutingError(null);
      setCheckingProfile(false);
      return () => { active = false; };
    }
    // A stored assessment locks onboarding. Returning users without owned
    // products resume at their shelf; users with products land in the app.
    setCheckingProfile(true);
    void (async () => {
      const [profileResult, productsResult] = await Promise.all([
        supabase.from("skin_profiles").select("goal, skin_type").eq("user_id", userId),
        supabase.from("user_products").select("id").eq("user_id", userId).or("source.is.null,source.in.(manual,recommendation_accepted)").limit(1),
      ]);
      if (!active) return;
      if (profileResult.error || productsResult.error) {
        const error = profileResult.error ?? productsResult.error;
        setRoutingError(`Couldn't load your saved profile and products. ${error?.message ?? "Please try again."}`);
        setCheckingProfile(false);
        return;
      }
      const profiles = profileResult.data ?? [];
      const hasAssessment = profiles.some((profile) => !!profile.skin_type || !!profile.goal);
      setRoutingError(null);
      setOnboardingDone(hasAssessment);
      setProductsFirst(hasAssessment && (productsResult.data ?? []).length === 0);
      setCheckingProfile(false);
    })();
    return () => { active = false; };
  }, [userId, recoveryStatus, retryKey]);

  if (loading || checkingProfile) return (
    <SafeAreaView style={routingStyles.screen}>
      <ActivityIndicator color={colors.gold} />
      <Text style={routingStyles.loadingText}>Loading your GlowTrack profile…</Text>
    </SafeAreaView>
  );

  if (recoveryStatus !== "none") return (
    <NavigationContainer theme={navTheme}>
      <AuthNavigator initialRouteName="ResetPassword" />
    </NavigationContainer>
  );

  if (session && routingError) return (
    <SafeAreaView style={routingStyles.screen}>
      <View style={routingStyles.content}>
        <Text style={textStyles.h1}>We couldn't load your profile</Text>
        <Text style={textStyles.body}>{routingError}</Text>
        <PrimaryButton label="Retry" onPress={() => { setCheckingProfile(true); setRetryKey((value) => value + 1); }} />
      </View>
    </SafeAreaView>
  );

  return (
    <NavigationContainer theme={navTheme}>
      {!session ? <AuthNavigator /> : onboardingDone ? <MainNavigator initialRouteName={productsFirst ? "Products" : "Tabs"} /> : <OnboardingNavigator onComplete={() => setOnboardingDone(true)} />}
    </NavigationContainer>
  );
}

const routingStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.plum, justifyContent: "center", padding: spacing.xl },
  content: { gap: spacing.lg },
  loadingText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12, textAlign: "center", marginTop: spacing.md },
});
