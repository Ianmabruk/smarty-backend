import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { palette, typography, spacing, radii } from "../theme";

export default function TopBar({
  title,
  subtitle,
  left,
  right,
  showBorder = true,
  style,
}) {
  return (
    <View style={[styles.bar, showBorder && styles.border, style]}>
      <View style={styles.left}>{left}</View>
      <View style={styles.center}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

export function Avatar({ name, size = 40, color = palette.primary }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color + "18" }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.42, color }]}>{initial}</Text>
    </View>
  );
}

export function IconButton({ icon, size = 22, color = palette.textSecondary, onPress, style }) {
  return (
    <TouchableOpacity style={[styles.iconBtn, style]} onPress={onPress} activeOpacity={0.6}>
      <Ionicons name={icon} size={size} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: palette.surface,
  },
  border: {
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  left: { marginRight: spacing.md },
  center: { flex: 1 },
  right: { marginLeft: spacing.md },
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
  avatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontWeight: typography.weight.bold,
  },
  iconBtn: {
    padding: spacing.sm,
    borderRadius: radii.full,
  },
});