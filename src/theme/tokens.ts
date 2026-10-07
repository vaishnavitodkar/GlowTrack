// Design tokens — matches the editorial dark system from the Figma design
// direction doc (midnight plum base, dusty rose + champagne gold accents).
// Keep every screen's colors/spacing/fonts pulled from here, never hardcoded,
// so the whole app stays consistent and themeable from one place.

export const colors = {
  plum: "#15101F",       // app background
  dusk: "#201A2E",       // card / screen surface
  rose: "#CE8C96",       // primary actions
  roseDeep: "#A85F6C",
  gold: "#E3C58A",       // streaks, selected states, highlights
  goldDeep: "#B8974F",
  ink: "#F3EEF2",        // primary text
  inkSoft: "#A79CB0",    // secondary text
  line: "rgba(255,255,255,0.08)",
  glass: "rgba(255,255,255,0.045)",
  white: "#FFFFFF",
  danger: "#E08585",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  pill: 999,
};

export const fonts = {
  display: "DMSerifDisplay_400Regular", // headings
  body: "PlusJakartaSans_400Regular",   // body text
  bodyMedium: "PlusJakartaSans_500Medium",
  bodySemiBold: "PlusJakartaSans_600SemiBold",
  bodyBold: "PlusJakartaSans_700Bold",
};

export const type = {
  h1: { fontFamily: fonts.display, fontSize: 28, color: colors.ink },
  h2: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  body: { fontFamily: fonts.body, fontSize: 14, color: colors.inkSoft, lineHeight: 20 },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.gold,
    letterSpacing: 0.6,
    textTransform: "uppercase" as const,
  },
};
