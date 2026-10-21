# GlowTrack — Frontend (Expo + TypeScript)

Wired to the Supabase backend from `schema.sql`, styled in the editorial dark
system (midnight plum, dusty rose, champagne gold). Covers the full flow from
your Figma file, screens 01-13.

## What's built and wired to Supabase
- **Auth** — Welcome, Signup, Login. Real signup/login, session persists between app launches.
- **Onboarding** — Skin Questions (with a submit confirmation), Goal Selection,
  evidence-gated RAG product recommendations, and explicit manual product entry.
- **Main app (5-tab nav, matching screen 08)** — Home (real streak + routine data),
  Routine (AM/PM tabs + reminders), Check-in (writes to `skin_check_ins`), Progress
  (real 28-day heatmap from `check_ins`), Ask AI (UI built, backend described below),
  Dermatologist (external booking links), Profile (real sign-out).
- **Smart routing** — `RootNavigator` checks the real `skin_profiles` table to decide
  whether a logged-in user sees onboarding or the main app, not just whether they're logged in.

## What's intentionally still a next step
- The AI Adviser, Chatbot, and personalized product recommendations use the
  `skincare-assistant` Supabase Edge Function. Apply the reviewed schema migrations,
  configure the function's server-side Ollama connection, and ingest the private PDFs
  before source-backed answers are available. Recommendations are withheld when
  evidence retrieval is unavailable; there is no rule-based recommendation fallback.
- expo-image-picker for the progress photo upload button.
- expo-blur for true frosted-glass cards (GlassCard currently uses a flat translucent
  fill, which looks very close but isn't true blur).

## Running it
1. If `.env` does not exist, copy `.env.example` to `.env`; if it already exists,
   preserve it and verify its values without sharing them.
2. `npm run typecheck`
3. `npx expo start` — scan the QR code with Expo Go on your phone

### Authentication dashboard setup

- For password recovery, allow the app callback `glowtrack://auth/reset-password`
  in Supabase Dashboard → Authentication → URL Configuration → Redirect URLs.
- For Google sign-in, enable Google in Authentication → Providers and allow
  `glowtrack://auth/callback`. In Google Cloud, authorize the Supabase callback
  URI shown by the provider setup (`https://<project-ref>.supabase.co/auth/v1/callback`).
  Keep the Google client secret in Supabase's provider configuration; never put it
  in Expo environment variables or app code.
- A stable custom-scheme callback requires a development or production build.
  Expo Go can use a temporary `exp://` redirect that changes with the current
  session, so it is not a dependable target for configured OAuth callbacks.
- When local Supabase is selected, `localhost`/`127.0.0.1` only points to the
  device itself. Use `http://10.0.2.2:54321` from the Android emulator, or the
  Windows PC's LAN IPv4 address on a physical phone; the phone and PC must share
  a network and Windows Firewall must permit the local Supabase API port.

## Skincare RAG setup

The source PDFs remain in the private `Skincare-Documents` Storage bucket. The
ingestion worker extracts page text locally, chunks and hashes it, embeds each
chunk with Ollama's `nomic-embed-text`, and calls a service-role-only RPC that
replaces a document's chunk rows transactionally. Re-running it skips unchanged
PDFs. Scanned PDFs without extractable text are reported as failures; no page
numbers or citations are fabricated. `nomic-embed-text` produces 768-element
vectors, so the new RAG table and retrieval RPC use `vector(768)`. This differs
from the previous draft's 1536 dimensions; the live project has
no RAG tables or document vectors, and its separate `products.embedding` column
is not altered by this migration.

1. For local development, install Ollama, pull the models, and start its local
   service. The default settings are `AI_PROVIDER=ollama`,
   `OLLAMA_BASE_URL=http://localhost:11434`, `OLLAMA_CHAT_MODEL=llama3.2`, and
   `OLLAMA_EMBEDDING_MODEL=nomic-embed-text`. The function and worker validate
   embeddings against 768 dimensions before searching or writing any chunks.

   ```powershell
   ollama pull llama3.2
   ollama pull nomic-embed-text
   ollama show nomic-embed-text
   python scripts/ingest_skincare_documents.py --verify-ollama
   ```

   `ollama show` should report embedding length 768. The verification command
   measures an actual vector from the local API without reading Storage or
   requiring a Supabase key. Ingestion repeats the same check before it reads
   Storage or changes database rows. The Edge Function also checks every query
   vector before vector search.
2. The Supabase Edge Function cannot reach your Windows PC through
   `http://localhost:11434` when deployed to hosted Supabase. For app integration
   testing, run a **local Supabase stack** and `supabase functions serve` on the
   same development PC, then point Expo's `EXPO_PUBLIC_SUPABASE_URL` at the local
   Supabase API. The function runtime is containerized on common CLI setups; set
   `OLLAMA_BASE_URL=http://host.docker.internal:11434` in its local env file if
   the runtime cannot reach the Windows host through `localhost`. Because the
   Ollama API has no built-in authentication, allow that host access only on a
   private local network with a restrictive Windows Firewall rule; never use a
   public tunnel, router port-forward, or `0.0.0.0` listener exposed to the
   internet. Keep the Ollama service bound to loopback whenever host access is
   sufficient.

   To reach the app from a phone, the phone must also reach the local Supabase
   API over your private Wi-Fi; allow only the required development ports on the
   private firewall profile. No Expo public variable should contain Ollama or
   provider credentials.

   Start the local Supabase stack and its function runtime in separate
   PowerShell windows. Keep the Ollama settings in the ignored local env file:

   ```powershell
   supabase start
   @'
   AI_PROVIDER=ollama
   OLLAMA_BASE_URL=http://host.docker.internal:11434
   OLLAMA_CHAT_MODEL=llama3.2
   OLLAMA_EMBEDDING_MODEL=nomic-embed-text
   '@ | Set-Content -Encoding ascii .env.ollama.local
   supabase functions serve skincare-assistant --env-file .env.ollama.local
   ```

   In another window, use `supabase status` to get the local publishable key,
   set `EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` and
   `EXPO_PUBLIC_SUPABASE_ANON_KEY=<local-publishable-key>` in the app's local
   `.env`, then run `npx expo start`. Use a local test account. `supabase start`
   operates on the local stack; it does not link or push to the hosted project.
   A phone instead of the same-PC app needs the PC's private LAN address for
   Expo and Supabase, plus narrowly scoped private-firewall rules.
3. The existing remote project has an unresolved migration baseline: the remote
   ledger is empty while the live schema already contains application tables.
   Do not run `supabase db push` until every older migration is reconciled. Once
   the baseline is resolved, use `supabase db push --linked --dry-run` and
   confirm the preview contains only the intended repair/RAG migrations before
   applying. Do not mark a migration applied unless its complete schema and data
   effects are already present. The routine repairs restore the missing routine
   schema and `custom_category`; the RAG migration creates the new 768-dimension
   tables, policies, HNSW index, RPCs, and chat conversation key. No existing
   profile or product embedding is rewritten.
4. Run PDF ingestion on the development PC with Ollama reachable at
   `OLLAMA_BASE_URL`. The worker uses `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` as its target. Optional
   `SKINCARE_SOURCE_SUPABASE_URL` and `SKINCARE_SOURCE_SERVICE_ROLE_KEY` let a
   local worker read a private source bucket from one project and write only to
   the local target. For local development, the target URL must be localhost;
   the worker refuses non-local targets unless `SKINCARE_ALLOW_REMOTE_INGEST=1`
   is explicitly set. Use a secure local secret manager for service-role keys;
   never put them in Expo configuration, commit them, or paste them into chat.

   ```powershell
   python -m pip install -r requirements-rag.txt
   python scripts/ingest_skincare_documents.py
   ```

5. A remotely deployed function requires an Ollama service in a private
   environment reachable by that function, such as a self-hosted Edge Function
   and Ollama service in the same private network. Hosted Supabase Edge Functions
   cannot route to your PC's localhost. Do not expose the unauthenticated Ollama
   API directly to the public internet. Until private connectivity is designed,
   keep the Ollama-backed function local. Remote deployment and remote ingestion
   have not been performed.
6. Confirm the worker reports successful/unchanged documents and check the
   `skincare_documents` status and `skincare_document_chunks` count before trying
   the AI screens. If extraction fails because a PDF is image-only, add a
   reviewed OCR step before indexing that document.

If this migration has already been applied in another environment with
1536-dimensional chunks, do not edit or cast those vectors in place. Create a
new versioned 768-dimensional destination, re-embed from the original PDFs, and
verify its document/chunk counts and retrieval results before switching the
RPC; keep the old table and vectors until the new index is verified and backed
up. The currently connected project has no RAG tables or chunks, so its
existing RAG vectors are not at risk. The separate products vector column is
left unchanged.

The Edge Function sends the signed-in user's profile context, question, and
retrieved passages to the configured Ollama chat model. Chat rows remain scoped by the existing
`chat_messages` user policy. Retrieved PDF passages are treated as untrusted
evidence, and returned citation IDs are matched against retrieved chunks. Product
suggestions are limited to catalog rows surviving server-side suitability filters;
the model cannot create catalog IDs. The app still requires an explicit button
press before adding a suggestion to a routine.

## Verification

Run `npm run typecheck` after setup. Review Edge Function logs for deployment or
provider errors without logging user questions or extracted PDF text. Test that
one authenticated account cannot read another account's profile, products, or
conversation; test no-evidence behavior, citations, invalid model product IDs,
provider outages, and a repeat ingestion of an unchanged PDF before production use.

## Validated
Installed and type-checked for real (`npx tsc --noEmit` passes clean across all
19 source files) — not just written to look correct.
