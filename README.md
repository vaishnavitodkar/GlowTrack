# GlowTrack — Frontend (Expo + TypeScript)

Wired to the Supabase backend from `schema.sql`, styled in the editorial dark
system (midnight plum, dusty rose, champagne gold). Covers the full flow from
your Figma file, screens 01-13.

## What's built and wired to Supabase
- **Auth** — Welcome, Signup, Login. Real signup/login, session persists between app launches.
- **Onboarding** — Skin Questions (skin type, pattern to repeat for the rest of the quiz),
  Goal Selection (branches to the right next screen, exactly like the user journey),
  Product Recommendation (real rule-based filtering by skin type), Add Existing Products.
- **Main app (5-tab nav, matching screen 08)** — Home (real streak + routine data),
  Routine (AM/PM tabs + reminders), Check-in (writes to `skin_check_ins`), Progress
  (real 28-day heatmap from `check_ins`), Ask AI (UI built, backend described below),
  Dermatologist (external booking links), Profile (real sign-out).
- **Smart routing** — `RootNavigator` checks the real `skin_profiles` table to decide
  whether a logged-in user sees onboarding or the main app, not just whether they're logged in.

## What's intentionally still a next step
- AI Advisor is UI-only — wiring it up means a Supabase Edge Function that embeds the
  question, does a pgvector similarity search against a `knowledge_base` table, and
  calls the Claude API with the retrieved context (the RAG architecture from earlier).
- Local notification reminders — expo-notifications is installed, scheduling isn't wired up yet.
- expo-image-picker for the progress photo upload button.
- expo-blur for true frosted-glass cards (GlassCard currently uses a flat translucent
  fill, which looks very close but isn't true blur).
- "Add product" modal on the Existing Products screen (button exists, no form yet).

## Running it
1. `cp .env.example .env` and fill in your real Supabase URL + anon key
2. `npm install`
3. `npx expo start` — scan the QR code with Expo Go on your phone

## Validated
Installed and type-checked for real (`npx tsc --noEmit` passes clean across all
19 source files) — not just written to look correct.
