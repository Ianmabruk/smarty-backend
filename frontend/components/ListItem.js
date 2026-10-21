import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { palette, typography, spacing, radii, shadows } from "../theme";

export default function ListItem({
  title,
  subtitle,
  left,
  right,
  onPress,
  icon,
  iconColor = palette.primary,
  badge,
  selected = false,
  style,
}) {
  return (
    <TouchableOpacity
      style={[styles.row, selected && styles.rowSelected, style]}
      onPress={onPress}
      activeOpacity={0.6}
      disabled={!onPress}
    >
      {left ? (
        <View style={styles.left}>{left}</View>
      ) : icon ? (
        <View style={[styles.iconWrap, { backgroundColor: iconColor + "18" }]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
      ) : null}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      {right || (onPress ? <Ionicons name="chevron-forward" size={18} color={palette.textMuted} /> : null)}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.surface,
    padding: spacing.lg,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.sm,
  },
  rowSelected: {
    borderColor: palette.primary,
    backgroundColor: palette.primarySoft,
  },
  left: { marginRight: spacing.md },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  content: { flex: 1 },
  title: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: palette.textPrimary,
  },
  subtitle: {
    fontSize: typography.size.sm,
    color: palette.textSecondary,
    marginTop: 2,
  },
  badge: {
    backgroundColor: palette.primarySoft,
    borderRadius: radii.full,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    marginRight: spacing.sm,
  },
  badgeText: {
    fontSize: typography.size.xs,
    color: palette.primaryDark,
    fontWeight: typography.weight.semibold,
  },
});