import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radii, type, fonts } from "@/theme/tokens";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Pill } from "@/components/Pill";
import { useOnboarding, RoutineSlot } from "@/context/OnboardingContext";

export function AddExistingProductsScreen({ navigation }: any) {
  const { items, addManual, clearManual, removeItem } = useOnboarding();
  const [hasProducts, setHasProducts] = useState(true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [slot, setSlot] = useState<RoutineSlot>("AM");

  // Only the products the user typed in. Recommended picks are shown (and can
  // be edited) on the Routine screen.
  const mine = items.filter((i) => i.source === "manual");

  const onAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addManual(trimmed, slot);
    setName("");
    setAdding(false);
  };

  const onContinue = () => {
    // "Not yet" means no existing products, even if some were typed earlier.
    if (!hasProducts) clearManual();
    navigation.navigate("Routine");
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={type.label}>Your shelf</Text>
          <Text style={[type.h1, styles.title]}>Do you already use any products?</Text>
          <Text style={[type.body, styles.sub]}>
            Add what you have — we'll avoid duplicates and build around the essentials
          </Text>

          <View style={styles.tabs}>
            <Pressable style={[styles.tab, hasProducts && styles.tabOn]} onPress={() => setHasProducts(true)}>
              <Text style={[styles.tabLabel, hasProducts && styles.tabLabelOn]}>Yes, I do</Text>
            </Pressable>
            <Pressable style={[styles.tab, !hasProducts && styles.tabOn]} onPress={() => setHasProducts(false)}>
              <Text style={[styles.tabLabel, !hasProducts && styles.tabLabelOn]}>Not yet</Text>
            </Pressable>
          </View>

          {hasProducts && (
            <>
              <Text style={[type.label, { marginTop: spacing.md, marginBottom: spacing.sm }]}>
                Added products · {mine.length}
              </Text>

              {mine.map((p) => (
                <View key={p.key} style={styles.row}>
                  <View style={styles.rowThumb} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName}>{p.name}</Text>
                    <Text style={styles.rowSlot}>{p.routine_slot === "AM" ? "Morning" : "Evening"}</Text>
                  </View>
                  <Pressable onPress={() => removeItem(p.key)} hitSlop={10}>
                    <Text style={styles.remove}>✕</Text>
                  </Pressable>
                </View>
              ))}

              {adding ? (
                <View style={styles.form}>
                  <TextInput
                    style={styles.input}
                    placeholder="Product name, e.g. CeraVe Foaming Cleanser"
                    placeholderTextColor={colors.inkSoft}
                    value={name}
                    onChangeText={setName}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={onAdd}
                  />
                  <View style={styles.tabs}>
                    {(["AM", "PM"] as const).map((s) => (
                      <Pressable key={s} style={[styles.tab, slot === s && styles.tabOn]} onPress={() => setSlot(s)}>
                        <Text style={[styles.tabLabel, slot === s && styles.tabLabelOn]}>
                          {s === "AM" ? "Morning" : "Evening"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <PrimaryButton label="Add to my shelf" onPress={onAdd} disabled={!name.trim()} />
                  <Text style={styles.cancel} onPress={() => setAdding(false)}>
                    Cancel
                  </Text>
                </View>
              ) : (
                <Pill label="+ Add product" onPress={() => setAdding(true)} />
              )}
            </>
          )}
        </ScrollView>

        <PrimaryButton label="Build my routine" onPress={onContinue} style={{ marginTop: spacing.md }} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.plum, padding: spacing.xl, paddingTop: spacing.xxl },
  title: { marginBottom: spacing.xs },
  sub: { marginBottom: spacing.lg },
  tabs: { flexDirection: "row", gap: spacing.xs, marginBottom: spacing.sm },
  tab: { flex: 1, alignItems: "center", paddingVertical: spacing.sm, borderRadius: radii.sm, backgroundColor: colors.glass },
  tabOn: { backgroundColor: colors.rose },
  tabLabel: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.inkSoft },
  tabLabelOn: { color: colors.white },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  rowThumb: { width: 36, height: 36, borderRadius: 9, backgroundColor: colors.rose },
  rowName: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ink },
  rowSlot: { fontFamily: fonts.body, fontSize: 11, color: colors.inkSoft, marginTop: 2 },
  remove: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkSoft, paddingHorizontal: spacing.xs },
  form: { marginTop: spacing.sm },
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
  cancel: { textAlign: "center", color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12, marginTop: spacing.sm },
});