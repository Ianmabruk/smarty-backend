import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { palette, typography, spacing, radii } from "../theme";

export default function Input({
  label,
  error,
  hint,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  multiline = false,
  editable = true,
  style,
  inputStyle,
  leftIcon,
  rightIcon,
  ...rest
}) {
  return (
    <View style={[styles.wrap, style]}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {rest.required ? <Text style={styles.asterisk}>{" *"}</Text> : null}
        </Text>
      ) : null}
      <View style={[styles.field, error && styles.fieldError, !editable && styles.fieldDisabled]}>
        {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
        <TextInput
          style={[
            styles.input,
            multiline && styles.multiline,
            inputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={palette.textMuted}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          editable={editable}
          autoCapitalize={rest.autoCapitalize ?? "none"}
          {...rest}
        />
        {rightIcon ? <View style={styles.icon}>{rightIcon}</View> : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {hint && !error ? <Text style={styles.hintText}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: palette.textSecondary,
    marginBottom: spacing.xs,
  },
  asterisk: { color: palette.error },
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
  },
  fieldError: { borderColor: palette.error },
  fieldDisabled: { backgroundColor: palette.surfaceAlt },
  icon: { marginRight: spacing.sm },
  input: {
    flex: 1,
    fontSize: typography.size.base,
    color: palette.textPrimary,
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  multiline: { minHeight: 96, paddingTop: spacing.md, textAlignVertical: "top" },
  errorText: {
    fontSize: typography.size.xs,
    color: palette.error,
    marginTop: spacing.xs,
  },
  hintText: {
    fontSize: typography.size.xs,
    color: palette.textMuted,
    marginTop: spacing.xs,
  },
});