import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { palette, typography, spacing, radii, shadows } from "../theme";

export default function StatCard({ label, value, change, icon, color = palette.primary, style }) {
  return (
    <View style={[styles.card, style]}>
      <View style={[styles.iconWrap, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {change ? (
        <View style={[styles.change, change >= 0 ? styles.changeUp : styles.changeDown]}>
          <Ionicons
            name={change >= 0 ? "trending-up" : "trending-down"}
            size={12}
            color={change >= 0 ? palette.success : palette.error}
          />
          <Text style={[styles.changeText, { color: change >= 0 ? palette.success : palette.error }]}>
            {Math.abs(change)}%
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.sm,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  value: {
    fontSize: typography.size["2xl"],
    fontWeight: typography.weight.bold,
    color: palette.textPrimary,
  },
  label: {
    fontSize: typography.size.sm,
    color: palette.textSecondary,
    marginTop: 2,
  },
  change: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    gap: 3,
  },
  changeUp: {},
  changeDown: {},
  changeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
});