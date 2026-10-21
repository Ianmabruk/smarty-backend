import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { palette, typography, spacing, radii, shadows } from "../theme";

export default function Card({
  children,
  style,
  padding = "lg",
  elevated = true,
  bordered = false,
}) {
  const paddings = {
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.lg,
    xl: spacing.xl,
  };

  return (
    <View
      style={[
        {
          backgroundColor: palette.surface,
          borderRadius: radii.lg,
          padding: paddings[padding],
          borderWidth: bordered ? 1 : 0,
          borderColor: palette.border,
        },
        elevated ? shadows.sm : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <View style={styles.header}>
      <View style={styles.titleCol}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  titleCol: { flex: 1 },
  title: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: palette.textPrimary,
  },
  subtitle: {
    fontSize: typography.size.sm,
    color: palette.textMuted,
    marginTop: 2,
  },
  action: { marginLeft: spacing.md },
});