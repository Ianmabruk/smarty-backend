import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { palette, typography, spacing, radii, shadows } from "../theme";

export function EmptyState({ icon, title, description, action, actionLabel }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon || "sparkles"} size={40} color={palette.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel ? (
        <TouchableOpacity style={styles.button} onPress={action}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default EmptyState;

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing["3xl"],
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.sm,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: radii.full,
    backgroundColor: palette.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.semibold,
    color: palette.textPrimary,
    textAlign: "center",
  },
  description: {
    fontSize: typography.size.base,
    color: palette.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: typography.lineHeight.normal * typography.size.base,
  },
  button: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing["2xl"],
    backgroundColor: palette.primary,
    borderRadius: radii.lg,
    ...shadows.primary,
  },
  buttonText: {
    color: "#fff",
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
  },
});