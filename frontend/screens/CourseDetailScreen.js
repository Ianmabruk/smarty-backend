import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { palette, typography, spacing, radii, shadows } from "../theme";
import SectionHeader from "../components/SectionHeader";
import EmptyState from "../components/EmptyState";
import ListItem from "../components/ListItem";
import { coursesAPI, lessonsAPI, quizzesAPI } from "../services/api";

export default function CourseDetailScreen({ navigation, route }) {
  const { id } = route.params;
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [courseRes, lessonsRes, quizzesRes] = await Promise.all([
          coursesAPI.get(id),
          lessonsAPI.list(id),
          quizzesAPI.list(id),
        ]);
        setCourse(courseRes.data.data);
        setLessons(lessonsRes.data.data);
        setQuizzes(quizzesRes.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color={palette.primary} />;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={[styles.iconWrap, { backgroundColor: palette.primarySoft }]}>
          <Text style={styles.iconText}>{course.title.charAt(0)}</Text>
        </View>
        <Text style={styles.title}>{course.title}</Text>
        <Text style={styles.level}>Level: {course.level}</Text>
        {course.description ? <Text style={styles.desc}>{course.description}</Text> : null}
      </View>

      <View style={styles.content}>
        <SectionHeader title="Lessons" subtitle={`${lessons.length} total`} />
        {lessons.length === 0 ? (
          <EmptyState icon="document-outline" title="No lessons yet" description="Check back soon for new content." />
        ) : (
          lessons.map((l) => (
            <ListItem
              key={l.id}
              title={`Lesson ${l.order}: ${l.title}`}
              subtitle={l.content ? l.content.slice(0, 60) + "..." : undefined}
              icon="book-outline"
              iconColor={palette.primary}
              onPress={() => navigation.navigate("Lesson", { id: l.id, title: l.title })}
            />
          ))
        )}

        <SectionHeader title="Quizzes" subtitle={`${quizzes.length} total`} style={{ marginTop: spacing.xl }} />
        {quizzes.length === 0 ? (
          <EmptyState icon="checkbox-outline" title="No quizzes yet" description="Test your knowledge once quizzes are available." />
        ) : (
          quizzes.map((q) => (
            <ListItem
              key={q.id}
              title={q.title}
              subtitle={`${q.questions.length} questions`}
              icon="clipboard-outline"
              iconColor={palette.accent}
              badge={`${q.questions.length}Q`}
              onPress={() => navigation.navigate("Quiz", { id: q.id, title: q.title })}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.surfaceWarm },
  hero: {
    backgroundColor: palette.surface, padding: spacing["2xl"], alignItems: "center",
    borderBottomWidth: 1, borderBottomColor: palette.border,
  },
  iconWrap: {
    width: 64, height: 64, borderRadius: radii.lg,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.lg,
  },
  iconText: { color: palette.primaryDark, fontSize: 28, fontWeight: typography.weight.bold },
  title: { fontSize: typography.size["3xl"], fontWeight: typography.weight.bold, color: palette.textPrimary, textAlign: "center" },
  level: { fontSize: typography.size.sm, color: palette.textMuted, marginTop: spacing.xs },
  desc: { fontSize: typography.size.base, color: palette.textSecondary, textAlign: "center", marginTop: spacing.md, lineHeight: typography.lineHeight.normal * typography.size.base },
  content: { padding: spacing.lg },
});