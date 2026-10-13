import React, { useEffect, useState } from "react";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/tokens";

import { WelcomeScreen } from "@/screens/WelcomeScreen";
import { AuthScreen } from "@/screens/AuthScreen";
import { SkinQuestionsScreen } from "@/screens/SkinQuestionsScreen";
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

export type AuthStackParamList = {
  Welcome: undefined;
  Signup: undefined;
  Login: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const OnboardingStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();
const MainTabs = createBottomTabNavigator();

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.plum, card: colors.dusk, border: colors.line },
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="Signup" component={AuthScreen} />
      <AuthStack.Screen name="Login" component={AuthScreen} />
    </AuthStack.Navigator>
  );
}

function OnboardingNavigator({ onComplete }: { onComplete: () => void }) {
  // Full pre-Home flow, matching screens 03-07 of the Figma file.
  // Dermatologist is reachable from the AI Advisor tab later, not here.
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name="SkinQuestions" component={SkinQuestionsScreen} />
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
  // Five primary destinations, matching the existing screen 08 design.
  return (
    <MainTabs.Navigator screenOptions={{ headerShown: false, tabBarStyle: { backgroundColor: colors.dusk, borderTopColor: colors.line } }}>
      <MainTabs.Screen name="Home" component={HomeScreen} />
      <MainTabs.Screen name="Routine" component={RoutineScreen} />
      <MainTabs.Screen name="Progress" component={ProgressScreen} />
      <MainTabs.Screen name="AskAI" component={AskAIOptionsScreen} options={{ title: "Ask AI" }} />
      <MainTabs.Screen name="Profile" component={ProfileScreen} />
    </MainTabs.Navigator>
  );
}

function MainNavigator() {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="Tabs" component={MainTabsNavigator} />
      <AppStack.Screen name="CheckIn" component={CheckInScreen} />
      <AppStack.Screen name="Dermatologist" component={DermatologistScreen} />
      <AppStack.Screen name="Recommendations" component={ProductRecommendationScreen} />
      <AppStack.Screen name="AIAdvisor" component={AIAdvisorScreen} />
      <AppStack.Screen name="AIChat" component={AIChatbotScreen} />
    </AppStack.Navigator>
  );
}

export function RootNavigator() {
  const { session, loading } = useAuth();
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    if (!session?.user) {
      setCheckingProfile(false);
      return;
    }
    // Onboarding counts as "done" once a goal has been chosen (last step of
    // the quiz flow before Routine). Re-checked every time session changes.
    setCheckingProfile(true);
    supabase
      .from("skin_profiles")
      .select("goal")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        setOnboardingDone(!!data?.goal);
        setCheckingProfile(false);
      });
  }, [session?.user]);

  if (loading || checkingProfile) return null; // swap for a splash/loading screen

  return (
    <NavigationContainer theme={navTheme}>
      {!session ? <AuthNavigator /> : onboardingDone ? <MainNavigator /> : <OnboardingNavigator onComplete={() => setOnboardingDone(true)} />}
    </NavigationContainer>
  );
}
