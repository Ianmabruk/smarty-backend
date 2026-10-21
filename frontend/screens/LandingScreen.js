import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { palette, typography, spacing, radii, shadows } from "../theme";
import Button from "../components/Button";

export default function LandingScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>S</Text>
        </View>
      </View>

      <View style={styles.ctaStack}>
        <Button onPress={() => navigation.navigate("Register")} fullWidth style={styles.primaryButton}>
          Get Started
        </Button>

        <Button onPress={() => navigation.navigate("Register")} variant="secondary" fullWidth style={styles.secondaryButton}>
          Sign Up
        </Button>

        <TouchableOpacity onPress={() => navigation.navigate("Login")} style={styles.loginLink}>
          <Text style={styles.loginText}>Already have an account? <Text style={styles.loginAccent}>Log in</Text></Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.primary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing["4xl"],
    justifyContent: "center",
    alignItems: "center",
  },
  logoWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoBadge: {
    width: 180,
    height: 180,
    borderRadius: 56,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.32)",
    alignItems: "center",
    justifyContent: "center",
    ...shadows.lg,
  },
  logoText: {
    color: "#fff",
    fontSize: 106,
    fontWeight: typography.weight.extrabold,
    lineHeight: 110,
    textAlign: "center",
    includeFontPadding: false,
    textShadowColor: "rgba(24,48,27,0.18)",
    textShadowOffset: { width: 0, height: 6 },
    textShadowRadius: 10,
  },
  ctaStack: {
    width: "100%",
    maxWidth: 420,
    paddingBottom: spacing.md,
  },
  primaryButton: {
    marginBottom: spacing.md,
    borderRadius: radii.xl,
  },
  secondaryButton: {
    marginBottom: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: "rgba(255,255,255,0.74)",
  },
  loginLink: {
    alignItems: "center",
    justifyContent: "center",
  },
  loginText: {
    fontSize: typography.size.base,
    color: palette.textPrimary,
    fontWeight: typography.weight.medium,
  },
  loginAccent: {
    color: palette.primaryDark,
    fontWeight: typography.weight.bold,
  },
});
