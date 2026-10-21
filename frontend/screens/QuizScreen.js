import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, TextInput } from "react-native";
import { palette, typography, spacing, radii, shadows } from "../theme";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import { quizzesAPI } from "../services/api";

export default function QuizScreen({ navigation, route }) {
  const { id, title } = route.params;
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await quizzesAPI.get(id);
        setQuiz(res.data.data);
      } catch (err) {
        Alert.alert("Error", "Failed to load quiz");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const setAnswer = (qid, val) => {
    setAnswers((prev) => ({ ...prev, [qid]: val }));
  };

  const handleSubmit = async () => {
    const formatted = Object.entries(answers).map(([qid, answer]) => ({
      question_id: Number(qid),
      answer,
    }));
    if (formatted.length === 0) {
      Alert.alert("Warning", "Please answer at least one question");
      return;
    }
    setSubmitting(true);
    try {
      const res = await quizzesAPI.submit(id, { answers: formatted });
      setResult(res.data.data);
      setSubmitted(true);
    } catch (err) {
      Alert.alert("Error", "Failed to submit quiz");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color={palette.primary} />;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{quiz.questions.length} questions</Text>
      </View>

      {quiz.questions.map((q) => (
        <View key={q.id} style={styles.question}>
          <Text style={styles.qText}>{q.text}</Text>
          {q.type === "multiple_choice" && q.options ? (
            q.options.map((opt, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.option,
                  answers[q.id] === opt && styles.optionSelected,
                ]}
                onPress={() => setAnswer(q.id, opt)}
                activeOpacity={0.7}
              >
                <View style={styles.radio}>
                  <View style={answers[q.id] === opt ? styles.radioInner : null} />
                </View>
                <Text style={styles.optionText}>{opt}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <TextInput
              style={styles.input}
              placeholder="Type your answer"
              placeholderColor={palette.textMuted}
              value={answers[q.id] || ""}
              onChangeText={(v) => setAnswer(q.id, v)}
            />
          )}
        </View>
      ))}

      {!submitted ? (
        <Button onPress={handleSubmit} loading={submitting} fullWidth style={styles.submitBtn}>
          Submit Quiz
        </Button>
      ) : (
        <View style={styles.result}>
          <Text style={styles.resultTitle}>Your Score</Text>
          <Text style={styles.scoreText}>
            {result.score} <Text style={styles.scoreOf}>/ {result.total}</Text>
          </Text>
          <Text style={styles.percentText}>
            {result.total ? Math.round((result.score / result.total) * 100) : 0}% accuracy
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.surfaceWarm },
  hero: {
    padding: spacing["2xl"], backgroundColor: palette.surface,
    borderBottomWidth: 1, borderBottomColor: palette.border,
  },
  title: { fontSize: typography.size["3xl"], fontWeight: typography.weight.bold, color: palette.textPrimary },
  subtitle: { fontSize: typography.size.base, color: palette.textSecondary, marginTop: spacing.xs },
  question: {
    backgroundColor: palette.surface, padding: spacing.lg, marginHorizontal: spacing.lg,
    marginTop: spacing.lg, borderRadius: radii.lg, borderWidth: 1, borderColor: palette.border, ...shadows.sm,
  },
  qText: { fontSize: typography.size.base, fontWeight: typography.weight.semibold, color: palette.textPrimary, marginBottom: spacing.lg },
  option: {
    flexDirection: "row", alignItems: "center", padding: spacing.md,
    backgroundColor: palette.surfaceAlt, borderRadius: radii.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: palette.border,
  },
  optionSelected: { backgroundColor: palette.primarySoft, borderColor: palette.primary },
  radio: {
    width: 20, height: 20, borderRadius: radii.full, borderWidth: 1.5,
    borderColor: palette.textMuted, alignItems: "center", justifyContent: "center", marginRight: spacing.md,
  },
  radioInner: { width: 10, height: 10, borderRadius: radii.full, backgroundColor: palette.primary },
  optionText: { fontSize: typography.size.base, color: palette.textPrimary, flex: 1 },
  input: {
    borderWidth: 1, borderColor: palette.border, borderRadius: radii.md,
    padding: spacing.md, fontSize: typography.size.base, color: palette.textPrimary,
    backgroundColor: palette.surfaceAlt, marginTop: spacing.sm,
  },
  submitBtn: { margin: spacing.lg },
  result: {
    margin: spacing.lg, padding: spacing["3xl"], backgroundColor: palette.surface,
    borderRadius: radii.xl, alignItems: "center", borderWidth: 1, borderColor: palette.border, ...shadows.md,
  },
  resultTitle: { fontSize: typography.size.lg, color: palette.textSecondary, fontWeight: typography.weight.medium },
  scoreText: { fontSize: typography.size["5xl"], fontWeight: typography.weight.extrabold, color: palette.primary, marginTop: spacing.sm },
  scoreOf: { fontSize: typography.size.lg, color: palette.textMuted, fontWeight: typography.weight.medium },
  percentText: { fontSize: typography.size.base, color: palette.textSecondary, marginTop: spacing.sm },
});