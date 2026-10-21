import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, TextInput, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { palette, typography, spacing, radii, shadows } from "../theme";
import { SectionHeader, Chip } from "../components/SectionHeader";
import EmptyState from "../components/EmptyState";
import StatCard from "../components/StatCard";
import { aiAPI, coursesAPI } from "../services/api";

export default function HomeScreen({ navigation }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("All");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [aiError, setAiError] = useState("");
  const levels = ["All", "Beginner", "Intermediate", "Advanced"];

  useEffect(() => {
    (async () => {
      try {
        const res = await coursesAPI.list();
        setCourses(Array.isArray(res?.data?.data) ? res.data.data : []);
      } catch (err) {
        console.error("Failed to load courses", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      const title = (c?.title || "").toLowerCase();
      const matchQuery = title.includes(query.toLowerCase());
      const matchLevel = level === "All" || (c?.level || "").toLowerCase() === level.toLowerCase();
      return matchQuery && matchLevel;
    });
  }, [courses, query, level]);

  const handleAskSmarty = async (promptText = aiPrompt) => {
    const trimmed = (promptText || "").trim();
    if (!trimmed) return;

    setAiLoading(true);
    setAiError("");
    try {
      const res = await aiAPI.explain({ topic: trimmed });
      setAiResponse(res?.data?.data?.explanation || "No answer available yet.");
      setAiPrompt("");
    } catch (err) {
      setAiError(err?.response?.data?.error || "Unable to reach Smarty right now.");
    } finally {
      setAiLoading(false);
    }
  };

  const renderCourse = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("CourseDetail", { id: item.id, title: item.title })}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrap, { backgroundColor: palette.primarySoft }]}> 
        <Text style={styles.iconText}>{(item.title || "?").charAt(0).toUpperCase()}</Text>
      </View>
      <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.cardMeta}>Level: {item.level}</Text>
      {item.description ? <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text> : null}
      <View style={styles.footer}>
        <Chip label={item.level} variant="primary" />
        <Text style={styles.arrow}>→</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.greeting}>Good morning, learner 👋</Text>
              <Text style={styles.sub}>Your next win is one lesson away.</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <StatCard label="Courses" value={courses.length || 0} icon="book-outline" color={palette.primary} />
            <StatCard label="Active" value={filtered.length || 0} icon="rocket-outline" color={palette.accent} />
          </View>
        </View>

        <View style={styles.aiPanel}>
          <View style={styles.aiHeaderRow}>
            <View>
              <Text style={styles.aiLabel}>Smarty AI tutor</Text>
              <Text style={styles.aiTitle}>Ask for a quick explanation</Text>
            </View>
            <View style={styles.aiBadge}>
              <Ionicons name="sparkles" size={16} color="#fff" />
            </View>
          </View>

          <TextInput
            style={styles.aiInput}
            value={aiPrompt}
            onChangeText={setAiPrompt}
            placeholder="Ask Smarty anything..."
            placeholderTextColor={palette.textMuted}
            multiline
            blurOnSubmit={false}
          />

          <View style={styles.suggestionRow}>
            {['Explain photosynthesis', 'Help me revise algebra', 'Summarise my notes'].map((suggestion) => (
              <TouchableOpacity key={suggestion} style={styles.suggestionPill} onPress={() => setAiPrompt(suggestion)}>
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.askButton, (!aiPrompt.trim() || aiLoading) && styles.askButtonDisabled]}
            onPress={() => handleAskSmarty()}
            disabled={!aiPrompt.trim() || aiLoading}
            activeOpacity={0.8}
          >
            {aiLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.askButtonText}>Ask Smarty</Text>}
          </TouchableOpacity>

          {aiError ? <Text style={styles.aiError}>{aiError}</Text> : null}
          {aiResponse ? <View style={styles.aiResponse}><Text style={styles.aiResponseText}>{aiResponse}</Text></View> : null}
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={palette.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.search}
            placeholder="Search courses..."
            placeholderTextColor={palette.textMuted}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        <View style={styles.filtersWrap}>
          <SectionHeader title="Explore" subtitle="Pick a path that fits your level" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContent}>
            {levels.map((l) => (
              <Chip key={l} label={l} selected={level === l} onPress={() => setLevel(l)} />
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={palette.primary} style={{ marginTop: spacing["3xl"] }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState icon="book-outline" title="No courses found" description="Try another keyword or change the study level." />
          </View>
        ) : (
          <FlatList
            data={filtered}
            renderItem={renderCourse}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.surfaceWarm },
  scrollContent: { paddingBottom: spacing["4xl"] },
  hero: {
    backgroundColor: palette.surface,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.md,
  },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  greeting: { fontSize: typography.size["2xl"], fontWeight: typography.weight.bold, color: palette.textPrimary },
  sub: { fontSize: typography.size.base, color: palette.textSecondary, marginTop: 2 },
  statsRow: { flexDirection: "row", marginTop: spacing.lg, gap: spacing.md },
  aiPanel: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: palette.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
    ...shadows.md,
  },
  aiHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  aiLabel: { fontSize: typography.size.xs, textTransform: "uppercase", letterSpacing: 0.8, color: palette.primary, fontWeight: typography.weight.semibold },
  aiTitle: { marginTop: spacing.xs, fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: palette.textPrimary },
  aiBadge: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  aiInput: {
    marginTop: spacing.md,
    minHeight: 68,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.lg,
    backgroundColor: palette.surfaceAlt,
    padding: spacing.md,
    color: palette.textPrimary,
    textAlignVertical: "top",
  },
  suggestionRow: { flexDirection: "row", flexWrap: "wrap", marginTop: spacing.md, gap: spacing.sm },
  suggestionPill: { backgroundColor: palette.primarySoft, borderRadius: radii.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  suggestionText: { color: palette.primaryDark, fontSize: typography.size.sm, fontWeight: typography.weight.medium },
  askButton: {
    marginTop: spacing.md,
    backgroundColor: palette.primary,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.primary,
  },
  askButtonDisabled: { opacity: 0.6 },
  askButtonText: { color: "#fff", fontWeight: typography.weight.semibold, fontSize: typography.size.base },
  aiError: { marginTop: spacing.md, color: palette.error, fontSize: typography.size.sm },
  aiResponse: { marginTop: spacing.md, padding: spacing.md, backgroundColor: palette.surfaceAlt, borderRadius: radii.lg, borderWidth: 1, borderColor: palette.border },
  aiResponseText: { color: palette.textSecondary, fontSize: typography.size.base, lineHeight: 22 },
  searchWrap: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    ...shadows.sm,
  },
  searchIcon: { marginRight: spacing.sm },
  search: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: typography.size.base,
    color: palette.textPrimary,
  },
  filtersWrap: { marginTop: spacing.xl, marginHorizontal: spacing.lg },
  filtersContent: { paddingVertical: spacing.sm, gap: spacing.sm },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing["4xl"] },
  columnWrapper: { justifyContent: "space-between" },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.sm,
    width: "48%",
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  iconText: { color: palette.primaryDark, fontSize: 20, fontWeight: typography.weight.bold },
  cardTitle: { fontSize: typography.size.base, fontWeight: typography.weight.semibold, color: palette.textPrimary },
  cardMeta: { fontSize: typography.size.xs, color: palette.textMuted, marginTop: 2 },
  cardDesc: { fontSize: typography.size.sm, color: palette.textSecondary, marginTop: spacing.xs, lineHeight: typography.lineHeight.normal * typography.size.sm },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.sm },
  arrow: { color: palette.primary, fontSize: 18, fontWeight: typography.weight.semibold },
  emptyWrap: { marginHorizontal: spacing.lg, marginTop: spacing.xl },
});