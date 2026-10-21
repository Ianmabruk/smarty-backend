import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { palette, typography, spacing, radii } from "../theme";

export function Skeleton({ width = "100%", height = 16, style }) {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
  return (
    <Animated.View style={[styles.skel, { width, height, opacity }, style]} />
  );
}

export function SkeletonCard({ style }) {
  return (
    <View style={[styles.card, style]}>
      <Skeleton width={44} height={44} style={{ borderRadius: 12, marginBottom: 12 }} />
      <Skeleton width="60%" height={18} style={{ marginBottom: 6 }} />
      <Skeleton width="90%" height={12} />
    </View>
  );
}

export function SkeletonList({ count = 4, style }) {
  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} style={{ marginBottom: 12 }} />
      ))}
    </View>
  );
}

export function AIBubble({ text, isStreaming = false, style }) {
  return (
    <View style={[styles.bubble, style]}>
      <View style={styles.aiHead}>
        <View style={styles.aiDot} />
        <Text style={styles.aiLabel}>Smarty</Text>
      </View>
      <Text style={styles.aiText}>{text}</Text>
      {isStreaming ? <Text style={styles.cursor}>{"|"}</Text> : null}
    </View>
  );
}

export function UserBubble({ text, style }) {
  return (
    <View style={[styles.userBubble, style]}>
      <Text style={styles.userText}>{text}</Text>
    </View>
  );
}

export function TypingIndicator() {
  return (
    <View style={styles.bubble}>
      <View style={styles.aiHead}>
        <View style={styles.aiDot} />
        <Text style={styles.aiLabel}>Smarty is typing</Text>
      </View>
      <View style={styles.dots}>
        <View style={[styles.dot, { opacity: 0.4 }]} />
        <View style={[styles.dot, { opacity: 0.7 }]} />
        <View style={[styles.dot, { opacity: 1 }]} />
      </View>
    </View>
  );
}

export function Toast({ message, type = "success", visible }) {
  if (!visible) return null;
  const colors = {
    success: palette.success,
    error: palette.error,
    warning: palette.warning,
    info: palette.info,
  };
  const icons = {
    success: "checkmark-circle",
    error: "alert-circle",
    warning: "warning",
    info: "information-circle",
  };
  return (
    <View style={[styles.toast, { borderLeftColor: colors[type] }]}>
      <Ionicons name={icons[type]} size={18} color={colors[type]} />
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  skel: {
    backgroundColor: palette.border,
    borderRadius: radii.sm,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.border,
  },
  bubble: {
    backgroundColor: "#fff",
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.border,
    maxWidth: "90%",
    ...{ shadowColor: "#0f172a", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  },
  aiHead: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  aiDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: palette.primary,
  },
  aiLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: palette.primary,
  },
  aiText: {
    fontSize: typography.size.base,
    color: palette.textPrimary,
    lineHeight: typography.lineHeight.normal * typography.size.base,
  },
  cursor: {
    fontSize: typography.size.base,
    color: palette.primary,
    fontWeight: typography.weight.semibold,
  },
  userBubble: {
    backgroundColor: palette.primary,
    borderRadius: radii.lg,
    padding: spacing.lg,
    maxWidth: "90%",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  userText: {
    color: "#fff",
    fontSize: typography.size.base,
    lineHeight: typography.lineHeight.normal * typography.size.base,
  },
  dots: {
    flexDirection: "row",
    gap: 4,
    marginTop: spacing.sm,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radii.full,
    backgroundColor: palette.textMuted,
  },
  toast: {
    position: "absolute",
    bottom: 100,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: palette.surface,
    padding: spacing.md,
    borderRadius: radii.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
    ...{ shadowColor: "#0f172a", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  },
  toastText: {
    flex: 1,
    fontSize: typography.size.base,
    color: palette.textPrimary,
    fontWeight: typography.weight.medium,
  },
});