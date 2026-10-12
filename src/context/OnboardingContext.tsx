import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export type RoutineSlot = "AM" | "PM";

// One step of the routine while the user is still onboarding. Nothing here
// touches the database until "Save & continue" on the Routine screen.
export type DraftItem = {
  key: string;
  product_id: string | null;
  name: string;
  routine_slot: RoutineSlot;
  source: "recommended" | "manual";
};

export type RecommendedProduct = { id: string; name: string; category: string };

// The night routine skips sunscreen; the morning routine uses every pick.
const PM_CATEGORIES = ["cleanser", "serum", "moisturizer"];

type OnboardingContextValue = {
  /** true while we're still checking whether this user finished onboarding */
  checking: boolean;
  onboardingDone: boolean;
  items: DraftItem[];
  setRecommended: (products: RecommendedProduct[]) => void;
  addManual: (name: string, slot: RoutineSlot) => void;
  clearManual: () => void;
  removeItem: (key: string) => void;
  /** Saves the routine and marks onboarding complete. Returns an error message, or null on success. */
  saveRoutineAndFinish: () => Promise<string | null>;
};

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const uid = session?.user?.id ?? null;

  // Keyed by user id so a different user logging in never sees the previous
  // user's status, and token refreshes (new session object, same id) don't
  // trigger a re-check.
  const [status, setStatus] = useState<{ uid: string; done: boolean } | null>(null);
  const [recommended, setRecommendedItems] = useState<DraftItem[]>([]);
  const [manual, setManual] = useState<DraftItem[]>([]);
  const manualCounter = useRef(0);

  useEffect(() => {
    setRecommendedItems([]);
    setManual([]);
    if (!uid) return;

    let cancelled = false;
    supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", uid)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.warn("onboarding status check failed:", error.message);
        setStatus({ uid, done: !!data?.onboarding_completed });
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const checking = !!uid && status?.uid !== uid;
  const onboardingDone = !!uid && status?.uid === uid && status.done;

  const setRecommended = useCallback((products: RecommendedProduct[]) => {
    const toItem = (p: RecommendedProduct, slot: RoutineSlot): DraftItem => ({
      key: `rec-${slot}-${p.id}`,
      product_id: p.id,
      name: p.name,
      routine_slot: slot,
      source: "recommended",
    });
    // Replaces (never appends) so going back and forth can't duplicate steps.
    setRecommendedItems([
      ...products.map((p) => toItem(p, "AM")),
      ...products.filter((p) => PM_CATEGORIES.includes(p.category)).map((p) => toItem(p, "PM")),
    ]);
  }, []);

  const addManual = useCallback((name: string, slot: RoutineSlot) => {
    manualCounter.current += 1;
    setManual((prev) => [
      ...prev,
      {
        key: `man-${manualCounter.current}`,
        product_id: null,
        name,
        routine_slot: slot,
        source: "manual",
      },
    ]);
  }, []);

  const clearManual = useCallback(() => setManual([]), []);

  const removeItem = useCallback((key: string) => {
    setRecommendedItems((prev) => prev.filter((i) => i.key !== key));
    setManual((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const items = useMemo(() => [...recommended, ...manual], [recommended, manual]);

  const saveRoutineAndFinish = useCallback(async () => {
    if (!uid) return "You're signed out. Please log in again.";

    // step_order restarts at 1 inside each slot (AM / PM).
    const counters: Record<RoutineSlot, number> = { AM: 0, PM: 0 };
    const rows = items.map((it) => {
      counters[it.routine_slot] += 1;
      return {
        user_id: uid,
        product_id: it.product_id,
        // Home and Routine display custom_name, so recommended products
        // store their product name here too.
        custom_name: it.name,
        routine_slot: it.routine_slot,
        step_order: counters[it.routine_slot],
        source: it.source,
      };
    });

    // Replace-then-insert makes the whole save safe to repeat: a retry after
    // a network drop, a double tap, or coming back to this screen can never
    // leave duplicate rows.
    const del = await supabase.from("user_products").delete().eq("user_id", uid);
    if (del.error) return del.error.message;

    if (rows.length) {
      const ins = await supabase.from("user_products").insert(rows);
      if (ins.error) return ins.error.message;
    }

    const done = await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", uid)
      .select("id");
    if (done.error) return done.error.message;
    if (!done.data?.length) return "Your routine was saved but we couldn't finish setup. Please tap save again.";

    // Flipping this makes RootNavigator swap onboarding for the main tabs.
    setStatus({ uid, done: true });
    return null;
  }, [uid, items]);

  return (
    <OnboardingContext.Provider
      value={{
        checking,
        onboardingDone,
        items,
        setRecommended,
        addManual,
        clearManual,
        removeItem,
        saveRoutineAndFinish,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used inside OnboardingProvider");
  return ctx;
}