import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { palette, typography, spacing, radii, shadows } from "../theme";
import SectionHeader from "../components/SectionHeader";
import StatCard from "../components/StatCard";
import EmptyState from "../components/EmptyState";
import { progressAPI } from "../services/api";

export default function ProgressScreen() {
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await progressAPI.list();
        setProgress(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const completed = progress.filter((p) => p.completed).length;
  const total = progress.length;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color={palette.primary} />;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Progress</Text>
        <Text style={styles.subtitle}>Track how far you've come.</Text>
      </View>

      <View style={styles.statsRow}>
        <StatCard label="Lessons" value={completed} icon="book-outline" color={palette.primary} />
        <StatCard label="In progress" value={total - completed} icon="time-outline" color={palette.accent} />
        <StatCard label="Completion" value={`${pct}%`} icon="trending-up" color={palette.success} />
      </View>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>

      <SectionHeader title="Recent activity" subtitle={`${progress.length} entries`} />

      {progress.length === 0 ? (
        <EmptyState icon="trophy-outline" title="No progress yet" description="Complete your first lesson to see your stats here." />
      ) : (
        progress.map((p) => (
          <View key={p.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View>
                <Text style={styles.course}>Course {p.course_id}</Text>
                {p.lesson_id ? <Text style={styles.detail}>Lesson {p.lesson_id}</Text> : null}
              </View>
              <View style={[styles.badge, p.completed ? styles.badgeDone : styles.badgePending]}>
                <Text style={[styles.badgeText, p.completed ? styles.badgeTextDone : styles.badgeTextPending]}>
                  {p.completed ? "Completed" : "In Progress"}
                </Text>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.surfaceWarm },
  header: { padding: spacing.lg, paddingTop: spacing["2xl"] },
  title: { fontSize: typography.size["3xl"], fontWeight: typography.weight.bold, color: palette.textPrimary },
  subtitle: { fontSize: typography.size.base, color: palette.textSecondary, marginTop: spacing.xs },
  statsRow: { flexDirection: "row", gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  barTrack: {
    marginHorizontal: spacing.lg, height: 10, backgroundColor: palette.border,
    borderRadius: radii.full, overflow: "hidden", marginBottom: spacing["2xl"],
  },
  barFill: { height: "100%", backgroundColor: palette.primary, borderRadius: radii.full },
  card: {
    backgroundColor: palette.surface, marginHorizontal: spacing.lg, marginBottom: spacing.md,
    padding: spacing.lg, borderRadius: radii.lg, borderWidth: 1, borderColor: palette.border, ...shadows.sm,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  course: { fontSize: typography.size.base, fontWeight: typography.weight.semibold, color: palette.textPrimary },
  detail: { fontSize: typography.size.sm, color: palette.textSecondary, marginTop: 2 },
  badge: { paddingVertical: 4, paddingHorizontal: spacing.sm, borderRadius: radii.full },
  badgeDone: { backgroundColor: palette.primarySoft },
  badgePending: { backgroundColor: palette.accentSoft },
  badgeText: { fontSize: typography.size.xs, fontWeight: typography.weight.semibold },
  badgeTextDone: { color: palette.primaryDark },
  badgeTextPending: { color: "#4d7a01" },
});