import { supabase } from "@/lib/supabase";

export type AssistantCitation = { chunkId: string; documentName: string; pageNumber: number };
export type AssistantMessage = {
  role: "user" | "assistant";
  content: string;
  cited_sources?: AssistantCitation[] | null;
  created_at?: string;
};
export type Recommendation = {
  product: {
    id: string; name: string; brand: string | null; category: string; price: number | null; image_url?: string | null;
    description: string | null; ingredients: string[] | null; suitable_skin_types: string[] | null;
    suitable_concerns: string[] | null; breakout_safe: boolean | null; fragrance_free: boolean | null;
    affiliate_link: string | null;
  };
  reason: string;
  precautions: string;
  sources: AssistantCitation[];
  affiliateAvailable?: boolean;
};
type AssistantResult = {
  conversationId?: string;
  messages?: AssistantMessage[];
  answer?: string;
  citations?: AssistantCitation[];
  recommendations?: Recommendation[];
  evidenceAvailable?: boolean;
};

async function invoke(body: Record<string, unknown>): Promise<AssistantResult> {
  const { data, error } = await supabase.functions.invoke("skincare-assistant", { body });
  if (!error) return data as AssistantResult;
  let detail = error.message || "The skincare service is unavailable.";
  const context = (error as { context?: unknown }).context;
  if (context instanceof Response) {
    try {
      const payload = await context.clone().json();
      if (typeof payload.error === "string") detail = payload.error;
    } catch { /* retain the SDK error */ }
  }
  throw new Error(detail);
}

export async function resumeAssistantConversation() {
  return invoke({ mode: "resume" });
}

export async function sendAssistantMessage(message: string, conversationId: string) {
  return invoke({ mode: "chat", message, conversationId });
}

export async function askSkincareAdvisor(message: string) {
  return invoke({ mode: "advisor", message });
}

export async function getPersonalizedRecommendations(message: string, budget?: number | null) {
  return invoke({ mode: "recommendations", message, ...(budget == null ? {} : { budget }) });
}
