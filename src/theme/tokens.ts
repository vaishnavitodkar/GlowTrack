// GlowTrack's warm, editorial skincare palette. Keep shared UI colors here so
// screens use the same cream, sage, and ink surfaces consistently.

export const colors = {
  plum: "#F7F5EF",       // warm ivory app background
  dusk: "#FFFEFA",       // soft card surface
  rose: "#5D6B53",       // muted sage primary actions
  roseDeep: "#485740",
  gold: "#5F7154",       // olive accents and selected states
  goldDeep: "#4E6045",
  ink: "#30332D",        // readable, warm charcoal text
  inkSoft: "#6E7067",    // secondary text
  line: "rgba(62,65,54,0.14)",
  glass: "rgba(255,255,255,0.76)",
  accentTint: "#E9EDE5",
  beige: "#F0ECE2",
  inkWash: "rgba(48,51,45,0.42)",
  inkFaint: "rgba(48,51,45,0.24)",
  shadow: "#555A4B",
  white: "#FFFFFF",
  danger: "#A8443D",
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
