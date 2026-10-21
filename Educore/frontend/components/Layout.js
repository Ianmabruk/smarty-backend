import React from "react";
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { palette, typography, spacing, radii, shadows } from "../theme";

export function GradientHero({ children, style }) {
  return (
    <View style={[styles.hero, style]}>
      <View style={styles.bg1} />
      <View style={styles.bg2} />
      <View style={styles.bg3} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

export function FloatingComposer({
  value,
  onChangeText,
  onSend,
  onVoice,
  placeholder = "Ask Smarty anything...",
  disabled = false,
}) {
  return (
    <View style={styles.composer}>
      <TouchableOpacity
        style={[styles.micBtn, disabled && styles.micDisabled]}
        onPress={onVoice}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Ionicons name="mic" size={22} color={disabled ? palette.textMuted : "#fff"} />
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderColor={palette.textMuted}
        multiline
        editable={!disabled}
      />
      <TouchableOpacity
        style={[styles.sendBtn, !value.trim() && styles.sendDisabled]}
        onPress={onSend}
        disabled={!value.trim() || disabled}
        activeOpacity={0.7}
      >
        <Ionicons name="send" size={18} color={value.trim() ? "#fff" : palette.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

export function MessageRow({ isUser, children, time }) {
  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAI]}>
      {!isUser && (
        <View style={styles.aiAvatar}>
          <Ionicons name="sparkles" size={16} color="#fff" />
        </View>
      )}
      <View style={styles.bubbleWrap}>{children}</View>
      {isUser && (
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>U</Text>
        </View>
      )}
    </View>
  );
}

export function SuggestedChip({ label, icon, onPress }) {
  return (
    <TouchableOpacity style={styles.sugg} onPress={onPress} activeOpacity={0.7}>
      {icon ? <Ionicons name={icon} size={13} color={palette.primary} style={{ marginRight: 4 }} /> : null}
      <Text style={styles.suggText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  hero: {
    position: "relative",
    overflow: "hidden",
    paddingVertical: spacing["4xl"],
    paddingHorizontal: spacing.lg,
    backgroundColor: palette.surfaceWarm,
  },
  bg1: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: radii.full,
    backgroundColor: palette.primarySoft,
    opacity: 0.6,
  },
  bg2: {
    position: "absolute",
    bottom: -100,
    left: -80,
    width: 300,
    height: 300,
    borderRadius: radii.full,
    backgroundColor: palette.accentSoft,
    opacity: 0.5,
  },
  bg3: {
    position: "absolute",
    top: 120,
    left: "35%",
    width: 160,
    height: 160,
    borderRadius: radii.full,
    backgroundColor: palette.primarySoft,
    opacity: 0.4,
  },
  content: { position: "relative", zIndex: 2 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: palette.surface,
    borderRadius: radii.xl,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.lg,
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.primary,
  },
  micDisabled: { backgroundColor: palette.border },
  input: {
    flex: 1,
    fontSize: typography.size.base,
    color: palette.textPrimary,
    maxHeight: 120,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.primary,
  },
  sendDisabled: { backgroundColor: palette.border },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  rowUser: { justifyContent: "flex-end" },
  rowAI: { justifyContent: "flex-start" },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: palette.textSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  userAvatarText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: typography.weight.bold,
  },
  bubbleWrap: { maxWidth: "85%" },
  sugg: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    ...shadows.sm,
  },
  suggText: {
    fontSize: typography.size.sm,
    color: palette.primary,
    fontWeight: typography.weight.medium,
  },
});