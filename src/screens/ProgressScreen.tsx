import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassCard } from "@/components/GlassCard";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { getIndiaDateKey } from "@/lib/localDate";
import { colors, fonts, spacing, type } from "@/theme/tokens";

type Photo = { id: string; storage_path: string; taken_at: string; signedUrl?: string };
type DayCheck = { check_in_date: string; am_completed: boolean | null; pm_completed: boolean | null };
type SkinCheck = { feeling: string; note: string | null; created_at: string };
const BUCKET = "progress-photos";
const SIGNED_URL_SECONDS = 60 * 60;

function indiaDateFromTimestamp(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const shifted = new Date(date.getTime() + 330 * 60 * 1000);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
}
function validDay(value: string, today: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && value <= today; }
function trackingDays(firstDate: string, today: string) {
  const first = Date.parse(`${firstDate}T00:00:00Z`);
  const current = Date.parse(`${today}T00:00:00Z`);
  return Math.max(1, Math.floor((current - first) / 86400000) + 1);
}
function feelingLabel(value?: string | null) {
  if (value === "better") return "Better";
  if (value === "same") return "About the same";
  if (value === "worse") return "Worse or irritated";
  return "No recent update";
}

export function ProgressScreen() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schemaNote, setSchemaNote] = useState<string | null>(null);
  const [checkIns, setCheckIns] = useState<DayCheck[]>([]);
  const [skinChecks, setSkinChecks] = useState<SkinCheck[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [assessmentDate, setAssessmentDate] = useState<string | null>(null);
  const [stepCompletions, setStepCompletions] = useState<number | null>(null);
  const [reload, setReload] = useState(0);

  const load = useCallback(async () => {
    const userId = session?.user.id;
    if (!userId) { setCheckIns([]); setSkinChecks([]); setPhotos([]); setLoading(false); return; }
    setLoading(true); setError(null); setSchemaNote(null);
    const [assessmentResult, checkResult, skinResult, photoResult, stepResult] = await Promise.all([
      supabase.from("skin_profiles").select("updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("check_ins").select("check_in_date, am_completed, pm_completed").eq("user_id", userId).order("check_in_date", { ascending: false }).limit(1000),
      supabase.from("skin_check_ins").select("feeling, note, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1000),
      supabase.from("photos").select("id, storage_path, taken_at").eq("user_id", userId).order("taken_at", { ascending: false }).limit(60),
      supabase.from("routine_step_completions").select("id, completion_date").eq("user_id", userId).order("completion_date", { ascending: false }).limit(5000),
    ]);
    const failures: string[] = [];
    if (assessmentResult.error) failures.push(`assessment date (${assessmentResult.error.message})`);
    if (checkResult.error) failures.push(`routine check-ins (${checkResult.error.message})`);
    if (skinResult.error) failures.push(`skin check-ins (${skinResult.error.message})`);
    if (photoResult.error) failures.push(`photo records (${photoResult.error.message})`);
    if (stepResult.error) {
      setStepCompletions(null);
      const missing = stepResult.error.code === "PGRST205" || stepResult.error.code === "42P01";
      setSchemaNote(missing
        ? "Step-level routine history is not available in this Supabase schema yet. Recorded daily check-ins and skin updates below still use your saved data."
        : `Step-level routine history could not be loaded: ${stepResult.error.message}`);
    } else setStepCompletions((stepResult.data ?? []).length);

    const today = getIndiaDateKey();
    const validCheckIns = (checkResult.data ?? []).filter((row) => validDay(row.check_in_date, today)) as DayCheck[];
    const validSkinChecks = (skinResult.data ?? []).filter((row) => {
      const day = indiaDateFromTimestamp(row.created_at);
      return day !== null && day <= today;
    }) as SkinCheck[];
    const validPhotos = (photoResult.data ?? []).filter((row) => {
      const day = indiaDateFromTimestamp(row.taken_at);
      return day !== null && day <= today;
    }) as Photo[];
    setAssessmentDate(assessmentResult.data?.updated_at ? indiaDateFromTimestamp(assessmentResult.data.updated_at) : null);
    setCheckIns(validCheckIns);
    setSkinChecks(validSkinChecks);
    if (failures.length) setError(`Some saved progress could not be loaded: ${failures.join("; ")}`);
    if (photoResult.error) setPhotos([]);
    else {
      const withUrls = await Promise.all(validPhotos.map(async (photo) => {
        const { data, error: signedError } = await supabase.storage.from(BUCKET).createSignedUrl(photo.storage_path, SIGNED_URL_SECONDS);
        if (signedError) { setError("Some saved progress photos could not be opened. Check the private progress-photo storage policies."); return photo; }
        return { ...photo, signedUrl: data.signedUrl };
      }));
      setPhotos(withUrls);
    }
    setLoading(false);
  }, [session?.user, reload]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const addPhoto = async () => {
    if (!session?.user || uploading) return;
    setUploading(true); setError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error("Allow GlowTrack to access your photos, then try again.");
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });
      if (picked.canceled || !picked.assets?.[0]) return;
      const asset = picked.assets[0];
      const response = await fetch(asset.uri);
      if (!response.ok) throw new Error("The selected photo could not be read from this device.");
      const blob = await response.blob();
      if (!blob.size) throw new Error("The selected photo is empty.");
      if (blob.size > 15 * 1024 * 1024) throw new Error("Choose a photo smaller than 15 MB.");
      const contentType = asset.mimeType || "image/jpeg";
      if (!contentType.startsWith("image/")) throw new Error("Choose an image file.");
      const extension = asset.fileName?.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || contentType.split("/")[1]?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
      const storagePath = `${session.user.id}/${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, blob, { contentType, upsert: false });
      if (uploadError) throw uploadError;
      const { error: rowError } = await supabase.from("photos").insert({
        user_id: session.user.id, storage_path: storagePath, taken_at: new Date().toISOString(),
      });
      if (rowError) {
        await supabase.storage.from(BUCKET).remove([storagePath]);
        throw rowError;
      }
      await load();
      Alert.alert("Photo saved", "Your progress photo is stored privately in your GlowTrack account.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't add that photo. Please try again.");
    } finally { setUploading(false); }
  };

  const today = getIndiaDateKey();
  const activityDays = [
    ...checkIns.map((row) => row.check_in_date),
    ...skinChecks.map((row) => indiaDateFromTimestamp(row.created_at)).filter((day): day is string => !!day),
    ...photos.map((row) => indiaDateFromTimestamp(row.taken_at)).filter((day): day is string => !!day),
    ...(assessmentDate ? [assessmentDate] : []),
  ].filter((day) => validDay(day, today)).sort();
  const firstActivity = activityDays[0] ?? null;
  const elapsed = firstActivity ? trackingDays(firstActivity, today) : null;
  const recordedDays = checkIns.length;
  const completedDays = checkIns.filter((row) => row.am_completed === true && row.pm_completed === true).length;
  const latestSkinCheck = skinChecks[0];
  const adherence = recordedDays ? Math.round((completedDays / recordedDays) * 100) : null;

  return <SafeAreaView style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={type.label}>Your results</Text>
      <Text style={[type.h1, styles.title]}>Your progress, in your words</Text>
      <Text style={styles.sub}>Only saved check-ins and photos appear here. Dates use India time (UTC+05:30).</Text>
      {error ? <View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => setReload((value) => value + 1)}><Text style={styles.link}>Retry  ›</Text></Pressable></View> : null}
      {schemaNote ? <Text style={styles.schemaNote}>{schemaNote}</Text> : null}
      {loading ? <View style={styles.loading}><ActivityIndicator color={colors.gold} /><Text style={styles.sub}>Loading your saved progress…</Text></View> : <>
        <View style={styles.metrics}>
          <GlassCard style={styles.metric}><Text style={styles.metricLabel}>TRACKING DURATION</Text><Text style={styles.metricValue}>{elapsed === null ? "—" : `${elapsed} ${elapsed === 1 ? "day" : "days"}`}</Text><Text style={styles.metricNote}>{firstActivity ? `Since ${firstActivity}` : "Not enough data yet"}</Text></GlassCard>
          <GlassCard style={styles.metric}><Text style={styles.metricLabel}>ROUTINE ADHERENCE</Text><Text style={styles.metricValue}>{adherence === null ? "—" : `${adherence}%`}</Text><Text style={styles.metricNote}>{recordedDays ? `${completedDays} full-routine days / ${recordedDays} recorded days` : "Not enough data yet"}</Text></GlassCard>
        </View>
        {stepCompletions !== null ? <Text style={styles.sub}>Saved routine steps completed: {stepCompletions}</Text> : null}
        <GlassCard style={styles.skinCard}>
          <Text style={styles.metricLabel}>SKIN CHANGES YOU DOCUMENTED</Text>
          {skinChecks.length ? <>
            <Text style={styles.metricValue}>{skinChecks.length} {skinChecks.length === 1 ? "check-in" : "check-ins"}</Text>
            <Text style={styles.metricNote}>Latest: {feelingLabel(latestSkinCheck?.feeling)}{latestSkinCheck?.created_at ? ` · ${indiaDateFromTimestamp(latestSkinCheck.created_at)}` : ""}</Text>
            {latestSkinCheck?.note ? <Text style={styles.skinNote}>{latestSkinCheck.note}</Text> : null}
          </> : <Text style={styles.metricNote}>Not enough data yet. Your own check-ins will appear here.</Text>}
          {assessmentDate ? <Text style={styles.metricNote}>Assessment last saved: {assessmentDate}</Text> : null}
        </GlassCard>
        <View style={styles.photoHeading}><View><Text style={type.label}>Progress photos · private</Text><Text style={styles.metricNote}>{photos.length ? `${photos.length} saved ${photos.length === 1 ? "photo" : "photos"}` : "Your photos stay in your private account storage."}</Text></View><Pressable accessibilityRole="button" onPress={() => { void addPhoto(); }} disabled={uploading} style={styles.addPhoto}><Text style={styles.addPhotoText}>{uploading ? "…" : "+ Add photo"}</Text></Pressable></View>
        {photos.length ? <View style={styles.photoGrid}>{photos.map((photo) => <View key={photo.id} style={styles.photoTile}>{photo.signedUrl ? <Image source={{ uri: photo.signedUrl }} accessibilityLabel="Your saved progress photo" style={styles.photo} /> : <View style={styles.photoUnavailable}><Text style={styles.metricNote}>Photo unavailable</Text></View>}<Text style={styles.photoDate}>{indiaDateFromTimestamp(photo.taken_at) ?? "Saved photo"}</Text></View>)}</View> : <GlassCard style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>✦</Text><Text style={styles.emptyTitle}>Your first progress photo is yours to add</Text><Text style={styles.metricNote}>Choose a photo when you are ready. GlowTrack does not create or use sample progress photos.</Text><PrimaryButton label="Choose a progress photo" variant="ghost" onPress={() => { void addPhoto(); }} loading={uploading} style={{ marginTop: spacing.md }} />
        </GlassCard>}
      </>}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.plum, paddingHorizontal: spacing.xl, paddingTop: spacing.xxl }, content: { paddingBottom: spacing.xxl }, title: { marginBottom: spacing.xs },
  sub: { fontFamily: fonts.body, color: colors.inkSoft, fontSize: 11, lineHeight: 17, marginBottom: spacing.md },
  metrics: { flexDirection: "row", gap: spacing.sm }, metric: { flex: 1, marginTop: spacing.sm }, metricLabel: { fontFamily: fonts.bodyBold, color: colors.gold, fontSize: 9, letterSpacing: 0.7 }, metricValue: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 18, marginTop: spacing.sm }, metricNote: { fontFamily: fonts.body, color: colors.inkSoft, fontSize: 10, lineHeight: 16, marginTop: spacing.xs },
  skinCard: { marginTop: spacing.md }, skinNote: { fontFamily: fonts.body, color: colors.ink, fontSize: 12, lineHeight: 18, marginTop: spacing.sm }, photoHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.xl, marginBottom: spacing.sm },
  addPhoto: { borderWidth: 1, borderColor: colors.gold, borderRadius: 18, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, addPhotoText: { color: colors.gold, fontFamily: fonts.bodyBold, fontSize: 11 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, photoTile: { width: "31%", marginBottom: spacing.sm }, photo: { width: "100%", aspectRatio: 0.8, borderRadius: 12, backgroundColor: colors.dusk }, photoUnavailable: { width: "100%", aspectRatio: 0.8, borderRadius: 12, backgroundColor: colors.dusk, justifyContent: "center", alignItems: "center", padding: spacing.xs }, photoDate: { fontFamily: fonts.body, color: colors.inkSoft, fontSize: 9, marginTop: spacing.xs },
  emptyCard: { alignItems: "center", marginTop: spacing.xs }, emptyIcon: { color: colors.gold, fontSize: 25 }, emptyTitle: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 13, textAlign: "center", marginTop: spacing.sm }, loading: { padding: spacing.xl, alignItems: "center" },
  errorBox: { borderWidth: 1, borderColor: colors.danger, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md }, error: { color: colors.danger, fontFamily: fonts.body, fontSize: 11, lineHeight: 17 }, schemaNote: { color: colors.gold, fontFamily: fonts.body, fontSize: 10, lineHeight: 16, marginBottom: spacing.sm }, link: { color: colors.gold, fontFamily: fonts.bodyBold, marginTop: spacing.sm },
});
