import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

/** Safe connection details for diagnostics. Never returns the public key. */
export function getSupabaseAuthTarget() {
  try {
    const url = new URL(supabaseUrl);
    const port = url.port || (url.protocol === "https:" ? "443" : "80");
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
    return {
      host: url.hostname,
      port,
      local,
      endpoint: `${url.origin}/auth/v1/signup`,
    };
  } catch {
    return { host: "invalid-or-missing", port: "unknown", local: false, endpoint: "unavailable" };
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Missing Supabase env vars — copy .env.example to .env and fill in your project values."
  );
}

if (__DEV__) {
  const target = getSupabaseAuthTarget();
  console.info("[GlowTrack Supabase] Auth target", {
    host: target.host,
    port: target.port,
    local: target.local,
    endpoint: target.endpoint,
  });
}

// AsyncStorage keeps the user logged in between app launches.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
