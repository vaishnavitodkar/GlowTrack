import React, { createContext, useContext, useEffect, useState } from "react";
import { Linking } from "react-native";
import type { Session } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import { supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  recoveryStatus: "none" | "pending" | "invalid";
  clearPasswordRecovery: () => void;
  signUp: (email: string, password: string, fullName: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signInWithGoogle: () => Promise<GoogleSignInResult>;
  signOut: () => Promise<void>;
};

export type GoogleSignInResult =
  | { status: "success" }
  | { status: "cancelled" }
  | { status: "error"; message: string };

function googleOAuthErrorMessage(message: string, redirectTo: string) {
  if (/provider.*not enabled|unsupported provider|provider.*disabled/i.test(message)) {
    return `Google sign-in isn't enabled in Supabase. Enable Google under Auth > Providers and configure its OAuth client ID and secret. Add ${redirectTo} to Auth > URL Configuration > Redirect URLs, and authorize your Supabase callback URL in Google Cloud.`;
  }
  if (/redirect.*(allow|url|valid)|url.*(allow|redirect)/i.test(message)) {
    return `Supabase rejected the OAuth redirect. Add ${redirectTo} to Auth > URL Configuration > Redirect URLs.`;
  }
  return message;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recoveryStatus, setRecoveryStatus] = useState<"none" | "pending" | "invalid">("none");

  useEffect(() => {
    let active = true;
    const handleRecoveryUrl = async (url: string | null) => {
      if (!url || !url.split(/[?#]/, 1)[0].toLowerCase().replace(/\/$/, "").endsWith("reset-password")) return;
      const { params, errorCode } = QueryParams.getQueryParams(url);
      if (errorCode || params.error || params.error_description) {
        setRecoveryStatus("invalid");
        return;
      }
      if (params.type !== "recovery" && !params.code && !params.token_hash && !params.access_token) {
        setRecoveryStatus("invalid");
        return;
      }
      setRecoveryStatus("pending");
      try {
        if (params.access_token && params.refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token: params.access_token, refresh_token: params.refresh_token });
          if (error) setRecoveryStatus("invalid");
        } else if (params.token_hash) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: params.token_hash, type: "recovery" });
          if (error) setRecoveryStatus("invalid");
        } else if (params.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(params.code);
          if (error) setRecoveryStatus("invalid");
        } else {
          setRecoveryStatus("invalid");
        }
      } catch {
        setRecoveryStatus("invalid");
      }
    };
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    const urlListener = Linking.addEventListener("url", ({ url }) => { void handleRecoveryUrl(url); });

    void Promise.all([supabase.auth.getSession(), Linking.getInitialURL()]).then(async ([{ data }, initialUrl]) => {
      if (!active) return;
      setSession(data.session);
      await handleRecoveryUrl(initialUrl);
      if (active) setLoading(false);
    }).catch(() => { if (active) setLoading(false); });

    return () => { active = false; listener.subscription.unsubscribe(); urlListener.remove(); };
  }, []);

  const clearPasswordRecovery = () => setRecoveryStatus("none");

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }, // feeds the handle_new_user() trigger
    });
    return error?.message ?? null;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  };

  const signInWithGoogle = async (): Promise<GoogleSignInResult> => {
    try {
      const redirectTo = makeRedirectUri({ scheme: "glowtrack", path: "auth/callback" });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });

      if (error) {
        return { status: "error", message: googleOAuthErrorMessage(error.message, redirectTo) };
      }
      if (!data.url) {
        return {
          status: "error",
          message: "Supabase did not return a Google sign-in link. Check that the Google provider is enabled in Supabase Auth.",
        };
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === "cancel" || result.type === "dismiss") return { status: "cancelled" };
      if (result.type !== "success") {
        return { status: "error", message: "Google sign-in did not complete. Please try again." };
      }

      const { params, errorCode } = QueryParams.getQueryParams(result.url);
      if (errorCode || params.error || params.error_description) {
        const message = params.error_description ?? params.error ?? errorCode ?? "Google sign-in was declined.";
        return {
          status: "error",
          message: googleOAuthErrorMessage(message, redirectTo),
        };
      }
      if (params.code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code);
        if (exchangeError) return { status: "error", message: googleOAuthErrorMessage(exchangeError.message, redirectTo) };
        return { status: "success" };
      }
      if (!params.access_token || !params.refresh_token) {
        return {
          status: "error",
          message: `Google returned without a session. Check the Supabase OAuth provider and the ${redirectTo} redirect allowlist.`,
        };
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
      if (sessionError) return { status: "error", message: sessionError.message };
      return { status: "success" };
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Google sign-in could not be completed. Please try again.",
      };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, loading, recoveryStatus, clearPasswordRecovery, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
