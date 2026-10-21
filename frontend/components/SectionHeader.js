import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { palette, typography, spacing, radii } from "../theme";

export function SectionHeader({ title, subtitle, action }) {
  return (
    <View style={styles.row}>
      <View>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export default SectionHeader;

export function Chip({ label, selected = false, onPress, icon, variant = "default" }) {
  const variants = {
    default: { bg: palette.surface, fg: palette.textSecondary, border: palette.border },
    primary: { bg: palette.primarySoft, fg: palette.primaryDark, border: palette.primarySoft },
    accent: { bg: palette.accentSoft, fg: "#4d7a01", border: palette.accentSoft },
  };
  const v = variants[variant] || variants.default;
  return (
    <TouchableOpacity
      style={[styles.chip, { backgroundColor: v.bg, borderColor: v.border }, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {icon}
      <Text style={[styles.chipText, { color: v.fg }]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.size["2xl"],
    fontWeight: typography.weight.bold,
    color: palette.textPrimary,
  },
  subtitle: {
    fontSize: typography.size.sm,
    color: palette.textMuted,
    marginTop: 2,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1,
    gap: spacing.xs,
  },
  chipSelected: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  chipText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
});