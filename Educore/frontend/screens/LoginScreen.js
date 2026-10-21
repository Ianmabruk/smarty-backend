import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { palette, typography, spacing, radii, shadows } from "../theme";
import Input from "../components/Input";
import Button from "../components/Button";
import { GradientHero, SuggestedChip } from "../components/Layout";
import { authAPI } from "../services/api";
import { saveToken } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await authAPI.login({ email, password });
      const { token, user } = res.data.data;
      await saveToken(token);
      login(user);
    } catch (err) {
      if (err.code === "ERR_NETWORK" || !err.response) {
        setError("Network error: check your Wi‑Fi and backend URL.");
      } else {
        setError(err.response?.data?.error || "Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={60}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <GradientHero style={styles.hero}>
          <View style={styles.brandRow}>
            <View style={styles.logoMark}>
              <Text style={styles.logoText}>{"S"}</Text>
            </View>
            <Text style={styles.brand}>Smarty</Text>
          </View>
          <Text style={styles.headline}>Your next breakthrough{"\n"}starts here.</Text>
          <Text style={styles.sub}>
            Study with your AI tutor, grounded in your curriculum.
          </Text>
        </GradientHero>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Sign in to continue</Text>

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@school.edu"
            autoComplete="email"
            keyboardType="email-address"
            autoCapitalize="none"
            error={error && !email ? "Email is required" : undefined}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            autoCapitalize="none"
            error={error && !password ? "Password is required" : undefined}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Button onPress={handleLogin} loading={loading} fullWidth style={{ marginTop: spacing.sm }}>
            Sign In
          </Button>

          <TouchableOpacity onPress={() => navigation.navigate("Register")} style={styles.linkWrap}>
            <Text style={styles.link}>Don't have an account? <Text style={styles.linkBold}>Sign Up</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: palette.surfaceWarm },
  container: { padding: spacing.lg, paddingTop: spacing["3xl"] },
  hero: { paddingVertical: spacing["4xl"], marginBottom: spacing["3xl"] },
  brandRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.lg },
  logoMark: {
    width: 44, height: 44, borderRadius: radii.md,
    backgroundColor: palette.primary, alignItems: "center", justifyContent: "center",
    marginRight: spacing.sm, ...shadows.primary,
  },
  logoText: { color: "#fff", fontSize: 24, fontWeight: typography.weight.bold },
  brand: { fontSize: typography.size["3xl"], fontWeight: typography.weight.extrabold, color: palette.textPrimary },
  headline: {
    fontSize: typography.size["4xl"], fontWeight: typography.weight.extrabold,
    color: palette.textPrimary, lineHeight: typography.lineHeight.tight * typography.size["4xl"],
    marginTop: spacing.lg,
  },
  sub: {
    fontSize: typography.size.base, color: palette.textSecondary,
    marginTop: spacing.md, lineHeight: typography.lineHeight.normal * typography.size.base,
  },
  form: {
    backgroundColor: palette.surface, borderRadius: radii.xl, padding: spacing["2xl"],
    borderWidth: 1, borderColor: palette.border, ...shadows.md,
  },
  formTitle: {
    fontSize: typography.size.xl, fontWeight: typography.weight.bold,
    color: palette.textPrimary, marginBottom: spacing.lg,
  },
  errorText: {
    color: palette.error, fontSize: typography.size.sm, marginTop: spacing.xs, marginBottom: spacing.sm,
  },
  linkWrap: { alignItems: "center", marginTop: spacing.lg },
  link: { fontSize: typography.size.base, color: palette.textSecondary },
  linkBold: { color: palette.primary, fontWeight: typography.weight.semibold },
});