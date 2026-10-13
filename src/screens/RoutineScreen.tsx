import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, AppState, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Notifications from "expo-notifications";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts, radii, spacing, type } from "@/theme/tokens";
import { PrimaryButton } from "@/components/PrimaryButton";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { getLocalDateKey } from "@/lib/localDate";

type Slot = "AM" | "PM";
type RoutineProduct = {
  id: string;
  product_id: string | null;
  custom_name: string | null;
  usage_instructions: string | null;
  routine_slot: Slot;
  step_order: number;
  source: string | null;
  products: { name: string; category: string; description: string | null }[] | { name: string; category: string; description: string | null } | null;
};
type ReminderPreferences = {
  am_enabled: boolean;
  am_time: string;
  pm_enabled: boolean;
  pm_time: string;
};

const DEFAULT_PREFERENCES: ReminderPreferences = {
  am_enabled: false,
  am_time: "08:00:00",
  pm_enabled: false,
  pm_time: "21:30:00",
};
const OWNED_SOURCES = ["manual", "recommendation_accepted"];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function parseTime(value: string) {
  const [hour = "8", minute = "0"] = value.split(":");
  const date = new Date();
  date.setHours(Number(hour), Number(minute), 0, 0);
  return date;
}

function formatTime(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:00`;
}

async function cancelGlowTrackReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.content.data?.glowTrackReminder === "am" || item.content.data?.glowTrackReminder === "pm")
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier))
  );
}

async function scheduleReminder(slot: "am" | "pm", value: string) {
  const [hour, minute] = value.split(":").map(Number);
  const trigger: Notifications.NotificationTriggerInput = Platform.OS === "android"
    ? { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute }
    : {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        repeats: true,
        hour,
        minute,
      };

  await Notifications.scheduleNotificationAsync({
    content: {
      title: slot === "am" ? "Your morning skincare routine" : "Your evening skincare routine",
      body: "Take a moment for your skincare routine.",
      data: { glowTrackReminder: slot },
    },
    trigger,
  });
}

export function RoutineScreen({ navigation, onComplete }: any) {
  const { session } = useAuth();
  const [tab, setTab] = useState<Slot>("AM");
  const [products, setProducts] = useState<RoutineProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [picker, setPicker] = useState<"am" | "pm" | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!session?.user) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const today = getLocalDateKey();
    const [productResult, preferenceResult, completionResult] = await Promise.all([
      supabase
        .from("user_products")
        .select("id, product_id, custom_name, usage_instructions, routine_slot, step_order, source, products(name, category, description)")
        .eq("user_id", session.user.id)
        .or("source.is.null,source.in.(manual,recommendation_accepted)")
        .order("step_order"),
      supabase
        .from("reminder_preferences")
        .select("am_enabled, am_time, pm_enabled, pm_time")
        .eq("user_id", session.user.id)
        .maybeSingle(),
      supabase
        .from("routine_step_completions")
        .select("user_product_id")
        .eq("user_id", session.user.id)
        .eq("completion_date", today),
    ]);
    if (productResult.error) setLoadError(`Couldn't load your products: ${productResult.error.message}`);
    setProducts((productResult.data ?? []) as unknown as RoutineProduct[]);
    if (completionResult.error) {
      setLoadError((current) => current ?? `Couldn't load today's completion status: ${completionResult.error.message}`);
    }
    setCompleted(new Set((completionResult.data ?? []).map((row) => row.user_product_id)));
    if (preferenceResult.error && preferenceResult.error.code !== "PGRST116") {
      setLoadError((current) => current ?? `Couldn't load reminder settings: ${preferenceResult.error.message}`);
    } else if (preferenceResult.data) {
      setPreferences({ ...DEFAULT_PREFERENCES, ...preferenceResult.data });
    }
    setLoading(false);
  }, [session?.user]);

  useFocusEffect(useCallback(() => {
    void load();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void load();
    });
    return () => subscription.remove();
  }, [load]));

  const displayedProducts = products.filter((product) => product.routine_slot === tab);
  const getCatalogProduct = (product: RoutineProduct) => Array.isArray(product.products) ? product.products[0] : product.products;
  const categories = new Set(displayedProducts.map((product) => getCatalogProduct(product)?.category).filter(Boolean));
  const requiredCategories = tab === "AM"
    ? ["cleanser", "serum", "moisturizer", "sunscreen"]
    : ["cleanser", "treatment", "moisturizer"];
  const missing = requiredCategories.filter((category) => !categories.has(category));

  const toggleCompletion = async (product: RoutineProduct) => {
    if (!session?.user || pending.has(product.id)) return;
    const wasComplete = completed.has(product.id);
    const next = new Set(completed);
    wasComplete ? next.delete(product.id) : next.add(product.id);
    setCompleted(next);
    setPending((current) => new Set(current).add(product.id));
    try {
      const today = getLocalDateKey();
      const { error } = await supabase.rpc("set_routine_step_completion", {
        p_user_product_id: product.id,
        p_completion_date: today,
        p_completed: !wasComplete,
      });
      if (error) throw error;
    } catch (error) {
      setCompleted((current) => {
        const reverted = new Set(current);
        wasComplete ? reverted.add(product.id) : reverted.delete(product.id);
        return reverted;
      });
      Alert.alert("Couldn't save completion", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setPending((current) => { const nextPending = new Set(current); nextPending.delete(product.id); return nextPending; });
    }
  };

  const updatePreference = (key: keyof ReminderPreferences, value: boolean | string) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  };

  const saveReminders = async () => {
    if (!session?.user || saving) return;
    setSaving(true);
    try {
      if (preferences.am_enabled || preferences.pm_enabled) {
        let permission = await Notifications.getPermissionsAsync();
        if (!permission.granted && permission.canAskAgain) {
          permission = await Notifications.requestPermissionsAsync();
        }
        if (!permission.granted) {
          const disabledPreferences = { ...preferences, am_enabled: false, pm_enabled: false };
          const { error } = await supabase.from("reminder_preferences").upsert({
            user_id: session.user.id,
            ...disabledPreferences,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });
          if (error) throw error;
          await cancelGlowTrackReminders();
          setPreferences(disabledPreferences);
          Alert.alert(
            "Notifications are off",
            "GlowTrack reminders need notification permission. Enable notifications for GlowTrack in your device settings, then turn reminders on here again.",
            [
              { text: "Not now", style: "cancel" },
              { text: "Open settings", onPress: () => { void Linking.openSettings(); } },
            ]
          );
          return;
        }
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("skincare-reminders", {
            name: "Skincare reminders",
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }
      }

      const payload = {
        user_id: session.user.id,
        ...preferences,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("reminder_preferences").upsert(payload, { onConflict: "user_id" });
      if (error) throw error;

      // Replace only GlowTrack's own reminders, so updates never stack duplicates.
      await cancelGlowTrackReminders();
      if (preferences.am_enabled) await scheduleReminder("am", preferences.am_time);
      if (preferences.pm_enabled) await scheduleReminder("pm", preferences.pm_time);
      Alert.alert("Saved", "Your reminder preferences have been saved.");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown error";
      Alert.alert("Couldn't save reminders", `${detail}\nYour routine and product data are unchanged.`);
    } finally {
      setSaving(false);
    }
  };

  const finish = () => {
    if (onComplete) onComplete();
    else if (navigation?.getState?.()?.routeNames?.includes("Home")) navigation.navigate("Home");
  };

  const openRecommendations = () => {
    const names: string[] = navigation?.getState?.()?.routeNames ?? [];
    if (names.includes("Recommendations")) navigation.navigate("Recommendations");
    else if (names.includes("ProductRecommendation")) navigation.navigate("ProductRecommendation");
    else Alert.alert("Recommendations unavailable", "Open recommendations from your product shelf.");
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={type.label}>Your plan</Text>
        <Text style={[type.h1, styles.title]}>A routine you'll keep</Text>

        <View style={styles.tabs}>
          {(["AM", "PM"] as const).map((value) => (
            <Pressable key={value} style={[styles.tab, tab === value && styles.tabOn]} onPress={() => setTab(value)}>
              <Text style={[styles.tabLabel, tab === value && styles.tabLabelOn]}>{value} routine</Text>
            </Pressable>
          ))}
        </View>

        {loading ? <Text style={styles.note}>Loading your products…</Text> : null}
        {loadError ? <Text accessibilityRole="alert" style={styles.error}>{loadError}</Text> : null}
        {!loading && displayedProducts.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.note}>No products have been added to your {tab} routine yet.</Text>
            <PrimaryButton label="Recommend Products" variant="ghost" onPress={openRecommendations} style={{ marginTop: spacing.sm }} />
          </View>
        ) : displayedProducts.map((product, index) => (
          <View key={product.id} style={styles.step}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: completed.has(product.id), disabled: pending.has(product.id) }}
              accessibilityLabel={`Mark ${product.custom_name || getCatalogProduct(product)?.name || "routine step"} ${completed.has(product.id) ? "incomplete" : "complete"}`}
              disabled={pending.has(product.id)}
              onPress={() => { void toggleCompletion(product); }}
              style={[styles.checkbox, completed.has(product.id) && styles.checkboxDone]}
            >
              {pending.has(product.id) ? <ActivityIndicator size="small" color={colors.gold} /> : completed.has(product.id) ? <Text style={styles.checkmark}>✓</Text> : null}
            </Pressable>
            <View style={styles.stepCopy}>
              <Text style={[styles.stepLabel, completed.has(product.id) && styles.stepLabelDone]}>{product.custom_name || getCatalogProduct(product)?.name || "Skincare product"}</Text>
              {getCatalogProduct(product)?.category ? <Text style={styles.category}>{getCatalogProduct(product)?.category}</Text> : null}
              {product.usage_instructions || getCatalogProduct(product)?.description ? <Text style={styles.note}>{product.usage_instructions || getCatalogProduct(product)?.description}</Text> : null}
            </View>
          </View>
        ))}
        {!loading && displayedProducts.length > 0 && missing.length > 0 ? (
          <Text style={styles.note}>Missing steps: {missing.join(", ")}. Add products only if you want to.</Text>
        ) : null}
        {!loading && displayedProducts.length > 0 && missing.length > 0 ? (
          <PrimaryButton label="Recommend Products" variant="ghost" onPress={openRecommendations} style={{ marginTop: spacing.sm }} />
        ) : null}

        <Text style={[type.label, styles.reminderHeading]}>Gentle reminders</Text>
        <ReminderRow
          title="Morning routine"
          enabled={preferences.am_enabled}
          time={preferences.am_time}
          onToggle={(value) => updatePreference("am_enabled", value)}
          onTime={() => setPicker("am")}
        />
        <ReminderRow
          title="Evening routine"
          enabled={preferences.pm_enabled}
          time={preferences.pm_time}
          onToggle={(value) => updatePreference("pm_enabled", value)}
          onTime={() => setPicker("pm")}
        />
        <Text style={styles.note}>Reminders stay off until you turn them on and save your choices.</Text>
        <PrimaryButton label="Save reminder settings" onPress={saveReminders} loading={saving} style={{ marginTop: spacing.md }} />
      </ScrollView>
      <PrimaryButton label="Save & continue" onPress={finish} style={{ marginTop: spacing.sm }} />
      {picker ? (
        <>
          <DateTimePicker
            value={parseTime(picker === "am" ? preferences.am_time : preferences.pm_time)}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(_event, date) => {
              if (Platform.OS !== "ios") setPicker(null);
              if (date) updatePreference(picker === "am" ? "am_time" : "pm_time", formatTime(date));
            }}
          />
          {Platform.OS === "ios" ? (
            <Pressable onPress={() => setPicker(null)} style={styles.pickerDone}>
              <Text style={styles.time}>Done</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </SafeAreaView>
  );
}

function ReminderRow({ title, enabled, time, onToggle, onTime }: {
  title: string;
  enabled: boolean;
  time: string;
  onToggle: (value: boolean) => void;
  onTime: () => void;
}) {
  return (
    <View style={styles.reminderRow}>
      <View style={styles.reminderTop}>
        <Text style={styles.stepLabel}>{title}</Text>
        <Switch value={enabled} onValueChange={onToggle} trackColor={{ false: colors.line, true: colors.rose }} thumbColor={colors.white} />
      </View>
      <Pressable accessibilityRole="button" onPress={onTime} style={styles.timeButton}>
        <Text style={styles.note}>Reminder time</Text>
        <Text style={styles.time}>{parseTime(time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.plum, padding: spacing.xl, paddingTop: spacing.xxl },
  content: { paddingBottom: spacing.md },
  title: { marginBottom: spacing.lg },
  tabs: { flexDirection: "row", gap: spacing.xs, marginBottom: spacing.md },
  tab: { flex: 1, alignItems: "center", paddingVertical: spacing.sm, borderRadius: radii.sm, backgroundColor: colors.glass },
  tabOn: { backgroundColor: colors.rose },
  tabLabel: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.inkSoft },
  tabLabelOn: { color: colors.white },
  step: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.line },
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: colors.inkSoft, alignItems: "center", justifyContent: "center" },
  checkboxDone: { backgroundColor: colors.gold, borderColor: colors.gold },
  checkmark: { color: colors.plum, fontFamily: fonts.bodyBold, fontSize: 16 },
  stepCopy: { flex: 1 },
  stepLabel: { fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  stepLabelDone: { color: colors.inkSoft, textDecorationLine: "line-through" },
  category: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.gold, textTransform: "uppercase", marginTop: 2 },
  note: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft, lineHeight: 18 },
  error: { fontFamily: fonts.body, fontSize: 12, color: colors.danger, marginVertical: spacing.sm },
  empty: { padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.glass },
  reminderHeading: { marginTop: spacing.xl, marginBottom: spacing.xs },
  reminderRow: { paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.line },
  reminderTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  timeButton: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.xs },
  time: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.gold },
  pickerDone: { alignItems: "flex-end", paddingVertical: spacing.sm },
});
