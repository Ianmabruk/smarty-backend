import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { palette, typography, spacing, radii, shadows } from "../theme";
import Input from "../components/Input";
import Button from "../components/Button";
import { GradientHero } from "../components/Layout";
import { authAPI } from "../services/api";
import { saveToken } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();

  const validate = () => {
    if (!name || !email || !password || !confirm) return "Please fill in all fields";
    if (password.length < 6) return "Password must be at least 6 characters";
    if (password !== confirm) return "Passwords do not match";
    return "";
  };

  const handleRegister = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    setLoading(true);
    try {
      const res = await authAPI.register({ name, email, password });
      const { token, user } = res.data.data;
      await saveToken(token);
      login(user);
    } catch (err) {
      if (err.code === "ERR_NETWORK" || !err.response) {
        setError("Network error: check your Wi‑Fi and backend URL.");
      } else {
        setError(err.response?.data?.error || "Registration failed");
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
          <Text style={styles.headline}>Create your account</Text>
          <Text style={styles.sub}>Join thousands of students leveling up their grades.</Text>
        </GradientHero>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Sign up</Text>

          <Input label="Full name" value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" />
          <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@school.edu" autoComplete="email" keyboardType="email-address" autoCapitalize="none" />
          <Input label="Password" value={password} onChangeText={setPassword} placeholder="Min 6 characters" secureTextEntry autoCapitalize="none" />
          <Input label="Confirm password" value={confirm} onChangeText={setConfirm} placeholder="Repeat password" secureTextEntry autoCapitalize="none" />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Button onPress={handleRegister} loading={loading} fullWidth style={{ marginTop: spacing.sm }}>
            Create Account
          </Button>

          <TouchableOpacity onPress={() => navigation.navigate("Login")} style={styles.linkWrap}>
            <Text style={styles.link}>Already have an account? <Text style={styles.linkBold}>Sign In</Text></Text>
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
    fontSize: typography.size["3xl"], fontWeight: typography.weight.extrabold,
    color: palette.textPrimary, lineHeight: typography.lineHeight.tight * typography.size["3xl"],
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