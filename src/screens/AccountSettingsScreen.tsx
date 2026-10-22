import React, { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { colors, fonts, radii, spacing, type } from "@/theme/tokens";

export function AccountSettingsScreen() {
  const { session, signOut } = useAuth();
  const [name, setName] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [gender, setGender] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const hasPasswordProvider = session?.user.app_metadata?.provider === "email" ||
    session?.user.identities?.some((identity) => identity.provider === "email");

  useFocusEffect(useCallback(() => {
    let active = true;
    void (async () => {
      if (!session?.user) { setLoading(false); return; }
      setLoading(true); setError(null);
      const { data, error: queryError } = await supabase.from("profiles")
        .select("full_name, age_group, gender").eq("id", session.user.id).maybeSingle();
      if (!active) return;
      if (queryError) setError(`Couldn't load profile details: ${queryError.message}`);
      else {
        setName(data?.full_name ?? session.user.user_metadata?.full_name ?? "");
        setAgeGroup(data?.age_group ?? "");
        setGender(data?.gender ?? "");
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [session?.user]));

  const saveProfile = async () => {
    if (!session?.user || saving) return;
    setSaving(true); setError(null);
    try {
      const { data, error: saveError } = await supabase.from("profiles")
        .update({ full_name: name.trim() || null, age_group: ageGroup.trim() || null, gender: gender.trim() || null })
        .eq("id", session.user.id).select("id").maybeSingle();
      if (saveError) throw new Error(saveError.message);
      if (!data) throw new Error("Your profile row is not available to update. No new profile data was created.");
      Alert.alert("Profile saved", "Your account details have been updated.");
    } catch (cause) {
      setError(`Couldn't save profile details: ${cause instanceof Error ? cause.message : "Check your connection and try again."}`);
    } finally { setSaving(false); }
  };

  const changePassword = async () => {
    const email = session?.user.email;
    if (!email || passwordBusy) return;
    if (!hasPasswordProvider) { setError("This account uses Google sign-in. Manage its password with Google."); return; }
    if (!currentPassword) { setError("Enter your current password to confirm this change."); return; }
    if (newPassword.length < 8) { setError("Choose a password with at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setError("The new passwords do not match."); return; }
    setPasswordBusy(true); setError(null);
    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
      if (verifyError) throw new Error("The current password could not be verified.");
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw new Error(`Couldn't change the password: ${updateError.message}`);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      Alert.alert("Password changed", "Your password has been updated.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't change the password. Check your connection and try again.");
    } finally { setPasswordBusy(false); }
  };

  const confirmSignOut = () => Alert.alert("Log out?", "You can sign back in at any time.", [
    { text: "Cancel", style: "cancel" },
    { text: "Log out", style: "destructive", onPress: () => { void signOut().catch(() => setError("Couldn't log out. Check your connection and try again.")); } },
  ]);

  return <SafeAreaView style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={type.label}>Your account</Text>
      <Text style={[type.h1, styles.title]}>Account settings</Text>
      {loading ? <Text style={styles.note}>Loading saved details…</Text> : <>
        <Text style={styles.label}>Email</Text><Text style={styles.readonly}>{session?.user.email ?? ""}</Text>
        <Text style={styles.label}>Name</Text><TextInput style={styles.input} value={name} onChangeText={setName} maxLength={100} />
        <Text style={styles.label}>Age group</Text><TextInput style={styles.input} value={ageGroup} onChangeText={setAgeGroup} maxLength={40} placeholder="Optional" placeholderTextColor={colors.inkSoft} />
        <Text style={styles.label}>Gender</Text><TextInput style={styles.input} value={gender} onChangeText={setGender} maxLength={60} placeholder="Optional" placeholderTextColor={colors.inkSoft} />
        <Pressable accessibilityRole="button" disabled={saving} onPress={() => { void saveProfile(); }} style={styles.button}><Text style={styles.buttonText}>{saving ? "Saving…" : "Save profile"}</Text></Pressable>
      </>}
      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>Password</Text>
      {hasPasswordProvider ? <>
        <TextInput style={styles.input} value={currentPassword} onChangeText={setCurrentPassword} placeholder="Current password" placeholderTextColor={colors.inkSoft} secureTextEntry autoCapitalize="none" />
        <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} placeholder="New password (8+ characters)" placeholderTextColor={colors.inkSoft} secureTextEntry autoCapitalize="none" />
        <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm new password" placeholderTextColor={colors.inkSoft} secureTextEntry autoCapitalize="none" />
        <Pressable accessibilityRole="button" disabled={passwordBusy} onPress={() => { void changePassword(); }} style={styles.button}><Text style={styles.buttonText}>{passwordBusy ? "Updating…" : "Change password"}</Text></Pressable>
      </> : <Text style={styles.note}>This account signs in with Google. Manage its password with Google.</Text>}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <Pressable accessibilityRole="button" onPress={confirmSignOut} style={[styles.button, styles.logout]}><Text style={[styles.buttonText, { color: colors.danger }]}>Log out</Text></Pressable>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.plum, paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  content: { paddingBottom: spacing.xxl }, title: { marginBottom: spacing.lg },
  label: { color: colors.inkSoft, fontFamily: fonts.bodyBold, fontSize: 11, marginBottom: spacing.xs, marginTop: spacing.md },
  readonly: { borderWidth: 1, borderColor: colors.line, borderRadius: radii.sm, padding: spacing.md, color: colors.inkSoft, fontFamily: fonts.body },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: radii.sm, padding: spacing.md, color: colors.ink, fontFamily: fonts.body, marginBottom: spacing.sm },
  button: { borderRadius: radii.md, borderWidth: 1, borderColor: colors.gold, padding: spacing.md, alignItems: "center", marginTop: spacing.sm },
  buttonText: { color: colors.gold, fontFamily: fonts.bodyBold, fontSize: 12 }, divider: { height: 1, backgroundColor: colors.line, marginVertical: spacing.xl },
  sectionTitle: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 15, marginBottom: spacing.sm },
  note: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 11, lineHeight: 16 }, error: { color: colors.danger, fontFamily: fonts.body, fontSize: 11, marginTop: spacing.md },
  logout: { borderColor: colors.line, marginTop: spacing.xl },
});
