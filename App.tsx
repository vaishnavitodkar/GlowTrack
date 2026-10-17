import React from "react";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { useFonts, DMSerifDisplay_400Regular } from "@expo-google-fonts/dm-serif-display";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { AuthProvider } from "@/context/AuthContext";
import { RootNavigator } from "@/navigation/RootNavigator";
import { colors } from "@/theme/tokens";

export default function App() {
  const [fontsLoaded] = useFonts({
    DMSerifDisplay_400Regular,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.plum }} />;
  }

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </AuthProvider>
  );
}
