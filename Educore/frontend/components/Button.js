import React from "react";
import { TouchableOpacity, Text, View, ActivityIndicator, StyleSheet } from "react-native";
import { palette, typography, spacing, radii, shadows } from "../theme";

export default function Button({
  children,
  variant = "primary",
  size = "lg",
  disabled = false,
  loading = false,
  onPress,
  style,
  icon,
  fullWidth = false,
}) {
  const sizes = {
    sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, fontSize: typography.size.sm },
    md: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, fontSize: typography.size.base },
    lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing["2xl"], fontSize: typography.size.lg },
  };

  const variants = {
    primary: { bg: palette.primaryDark, fg: "#fff", border: null },
    secondary: { bg: palette.surface, fg: palette.textPrimary, border: palette.border },
    ghost: { bg: "transparent", fg: palette.primaryDark, border: null },
    danger: { bg: palette.error, fg: "#fff", border: null },
  };

  const v = variants[variant] || variants.primary;
  const s = sizes[size] || sizes.lg;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        {
          backgroundColor: v.bg,
          borderRadius: 18,
          paddingVertical: s.paddingVertical,
          paddingHorizontal: s.paddingHorizontal,
          borderWidth: v.border ? 1 : 0,
          borderColor: v.border,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: spacing.sm,
          opacity: disabled ? 0.5 : 1,
          ...(variant === "primary" && !disabled ? { ...shadows.primary, shadowOpacity: 0.22 } : shadows.sm),
        },
        fullWidth && { width: "100%" },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.fg} />
      ) : (
        <>
          {icon}
          <Text style={{ color: v.fg, fontSize: s.fontSize, fontWeight: typography.weight.semibold }}>
            {children}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}