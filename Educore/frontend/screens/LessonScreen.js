import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import { palette, typography, spacing, radii, shadows } from "../theme";
import Button from "../components/Button";
import { AIBubble, UserBubble, SuggestedChip, GradientHero } from "../components/Layout";
import { lessonsAPI, aiAPI } from "../services/api";

export default function LessonScreen({ navigation, route }) {
  const { id, title } = route.params;
  const [lesson, setLesson] = useState(null);
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(true);
  const [explaining, setExplaining] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await lessonsAPI.get(id);
        setLesson(res.data.data);
      } catch (err) {
        Alert.alert("Error", "Failed to load lesson");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleExplain = async () => {
    setExplaining(true);
    try {
      const res = await aiAPI.explain({ lesson_id: id });
      setExplanation(res.data.data.explanation);
    } catch (err) {
      Alert.alert("Error", "Could not generate explanation");
    } finally {
      setExplaining(false);
    }
  };

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color={palette.primary} />;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <GradientHero style={styles.hero}>
        <Text style={styles.title}>{lesson.title}</Text>
      </GradientHero>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>Lesson content</Text>
        <Text style={styles.body}>{lesson.content}</Text>

        <Button onPress={handleExplain} loading={explaining} icon={<Text>✨</Text>}>
          Explain with AI
        </Button>

        {explanation ? (
          <View style={styles.aiSection}>
            <Text style={styles.sectionLabel}>AI explanation</Text>
            <AIBubble text={explanation} />
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>Need a different angle?</Text>
        <View style={styles.suggRow}>
          <SuggestedChip label="Simplify" icon="arrow-down-circle" onPress={handleExplain} />
          <SuggestedChip label="Give examples" icon="bulb-outline" onPress={handleExplain} />
          <SuggestedChip label="Summarize" icon="contract" onPress={handleExplain} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.surfaceWarm },
  hero: { paddingVertical: spacing["3xl"], paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  title: {
    fontSize: typography.size["3xl"], fontWeight: typography.weight.extrabold,
    color: palette.textPrimary, lineHeight: typography.lineHeight.tight * typography.size["3xl"],
  },
  content: { padding: spacing.lg, paddingTop: 0 },
  sectionLabel: {
    fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
    color: palette.textMuted, textTransform: "uppercase", marginBottom: spacing.sm, marginTop: spacing.lg,
  },
  body: {
    fontSize: typography.size.base, color: palette.textPrimary,
    lineHeight: typography.lineHeight.normal * typography.size.base,
  },
  aiSection: { marginTop: spacing.lg },
  suggRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
});