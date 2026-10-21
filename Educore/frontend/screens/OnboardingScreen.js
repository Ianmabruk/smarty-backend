import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { palette, typography, spacing, radii, shadows } from "../theme";
import Input from "../components/Input";
import Button from "../components/Button";
import { usersAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

const educationOptions = ["Primary", "Secondary", "College", "Adult learning", "Other"];

export default function OnboardingScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const [age, setAge] = useState(String(user?.age || ""));
  const [educationGroup, setEducationGroup] = useState(user?.education_group || "Secondary");
  const [gradeLevel, setGradeLevel] = useState(user?.grade_level || "");
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    const ageValue = Number(age);
    if (!age || Number.isNaN(ageValue) || ageValue < 5 || ageValue > 100) {
      Alert.alert("Age required", "Please enter a valid age between 5 and 100.");
      return;
    }

    setLoading(true);
    try {
      const res = await usersAPI.updateProfile({
        age: ageValue,
        education_group: educationGroup,
        grade_level: gradeLevel || "Not specified",
        onboarding_completed: true,
      });

      updateUser(res.data.data);
      navigation.replace("AppTabs");
    } catch (err) {
      Alert.alert("Unable to save profile", err?.response?.data?.error || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <Ionicons name="person-circle-outline" size={56} color={palette.primary} />
        <Text style={styles.title}>Let’s personalize your learning</Text>
        <Text style={styles.subtitle}>This helps Smarty adapt explanations and study plans to your age and education level.</Text>
      </View>

      <View style={styles.card}>
        <Input
          label="Age"
          value={age}
          onChangeText={setAge}
          placeholder="Enter your age"
          keyboardType="number-pad"
        />

        <Text style={styles.label}>Education level</Text>
        <View style={styles.optionGrid}>
          {educationOptions.map((option) => (
            <Button
              key={option}
              variant={educationGroup === option ? "primary" : "secondary"}
              size="sm"
              onPress={() => setEducationGroup(option)}
              style={styles.optionButton}
            >
              {option}
            </Button>
          ))}
        </View>

        <Input
          label="Current grade or learning stage"
          value={gradeLevel}
          onChangeText={setGradeLevel}
          placeholder="Example: Grade 8, Year 11, beginner"
        />

        <Button onPress={handleContinue} loading={loading} fullWidth style={{ marginTop: spacing.lg }}>
          Continue to Smarty
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.surfaceWarm },
  content: { padding: spacing.lg, paddingTop: spacing["4xl"] },
  hero: {
    backgroundColor: palette.surface,
    borderRadius: radii.xl,
    padding: spacing["3xl"],
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: "center",
    ...shadows.md,
  },
  title: { fontSize: typography.size["3xl"], fontWeight: typography.weight.bold, color: palette.textPrimary, marginTop: spacing.md, textAlign: "center" },
  subtitle: { fontSize: typography.size.base, color: palette.textSecondary, textAlign: "center", marginTop: spacing.sm, lineHeight: 24 },
  card: {
    marginTop: spacing.xl,
    backgroundColor: palette.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.md,
  },
  label: { fontSize: typography.size.base, color: palette.textPrimary, fontWeight: typography.weight.semibold, marginBottom: spacing.sm, marginTop: spacing.lg },
  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  optionButton: { marginBottom: spacing.sm },
});
