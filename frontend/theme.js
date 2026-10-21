// Smarty AI Tutor — Design Tokens
// Single source of truth for colors, typography, spacing, radii, shadows.

import { Platform } from "react-native";

export const palette = {
  // Smarty luminous green brand palette
  primary: "#B7FF35",
  primaryDark: "#286B19",
  primarySoft: "#D0FF78",
  primaryMuted: "#D2FF72",

  // Accent lime / green
  accent: "#D2FF72",
  accentSoft: "#EAFCC8",

  // Surfaces
  surface: "#FFFFFF",
  surfaceAlt: "#F4FFE8",
  surfaceWarm: "#D9FF8A",
  border: "#C8F98A",
  borderSoft: "#E8FFD0",

  // Text
  textPrimary: "#18301B",
  textSecondary: "#526644",
  textMuted: "#6E7D67",

  // States
  success: "#286B19",
  warning: "#B7FF35",
  error: "#ef4444",
  info: "#3b82f6",

  // Overlay
  overlay: "rgba(24, 48, 27, 0.42)",
  overlaySoft: "rgba(24, 48, 27, 0.18)",
};

export const gradients = {
  primary: ["#B7FF35", "#D2FF72"],
  soft: ["#F4FFE8", "#FFFFFF"],
  hero: ["#D0FF78", "#F4FFE8", "#FFFFFF"],
  warm: ["#D9FF8A", "#F4FFE8"],
};

export const typography = {
  fontFamily: {
    display: "System",
    body: "System",
    mono: "System",
  },
  size: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 20,
    "2xl": 24,
    "3xl": 30,
    "4xl": 36,
    "5xl": 44,
  },
  weight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
};

export const spacing = {
  0: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  "6xl": 64,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  full: 9999,
};

// Platform-aware shadow helper.
// On web, React Native deprecates shadow* style props in favor of boxShadow.
// This converts the native shadow spec into a CSS boxShadow string on web.
function toBoxShadow({ shadowColor, shadowOffset, shadowOpacity, shadowRadius }) {
  const r = shadowRadius || 0;
  const ox = (shadowOffset?.width || 0);
  const oy = (shadowOffset?.height || 0);
  const rgba = shadowColor || "#000";
  // Convert hex to rgba if needed
  let color = rgba;
  if (typeof rgba === "string" && rgba.startsWith("#")) {
    const hex = rgba.replace("#", "");
    const rr = parseInt(hex.substring(0, 2), 16);
    const gg = parseInt(hex.substring(2, 4), 16);
    const bb = parseInt(hex.substring(4, 6), 16);
    color = `rgba(${rr}, ${gg}, ${bb}, ${shadowOpacity || 0})`;
  } else {
    color = rgba.replace("rgba", "rgba").replace(")", `, ${shadowOpacity || 0})`);
  }
  return `${ox}px ${oy}px ${r}px ${color}`;
}

export function shadow(level) {
  const spec = shadows[level];
  if (!spec) return {};
  if (Platform.OS === "web") {
    return { boxShadow: toBoxShadow(spec) };
  }
  return spec;
}

export const shadows = {
  sm: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  lg: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 5,
  },
  primary: {
    shadowColor: "#286B19",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 5,
  },
};

export const breakpoints = {
  sm: 360,
  md: 390,
  lg: 768,
  xl: 1024,
  "2xl": 1366,
  "3xl": 1440,
};

export default {
  palette,
  gradients,
  typography,
  spacing,
  radii,
  shadows,
  breakpoints,
  shadow,
};