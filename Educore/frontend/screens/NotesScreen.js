import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { palette, typography, spacing, radii, shadows } from "../theme";
import Button from "../components/Button";
import { notesAPI } from "../services/api";

export default function NotesScreen() {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const res = await notesAPI.list();
      setNotes(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error("Failed to load notes", err);
    }
  };

  const handleCreate = async () => {
    if (!title.trim() && !content.trim()) {
      Alert.alert("Missing note", "Add a title or a few lines of notes before saving.");
      return;
    }

    setLoading(true);
    try {
      await notesAPI.create({ title: title || "Untitled note", content });
      setTitle("");
      setContent("");
      await loadNotes();
    } catch (err) {
      Alert.alert("Unable to save note", err?.response?.data?.error || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await notesAPI.delete(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      Alert.alert("Delete failed", err?.response?.data?.error || "Please try again.");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.editorCard}>
        <Text style={styles.sectionTitle}>Quick notes</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Note title"
          style={styles.titleInput}
          placeholderTextColor={palette.textMuted}
        />
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="Write your summary, key facts, or revision points..."
          style={styles.contentInput}
          multiline
          placeholderTextColor={palette.textMuted}
        />
        <Button onPress={handleCreate} loading={loading} fullWidth>
          Save note
        </Button>
      </View>

      <View style={styles.notesSection}>
        <Text style={styles.sectionTitle}>Saved notes</Text>
        {notes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={28} color={palette.primary} />
            <Text style={styles.emptyText}>No notes yet. Capture a key concept or idea here.</Text>
          </View>
        ) : (
          notes.map((note) => (
            <View key={note.id} style={styles.noteCard}>
              <View style={styles.noteHeader}>
                <Text style={styles.noteTitle}>{note.title || "Untitled note"}</Text>
                <TouchableOpacity onPress={() => handleDelete(note.id)} activeOpacity={0.7}>
                  <Ionicons name="trash-outline" size={20} color={palette.error} />
                </TouchableOpacity>
              </View>
              <Text style={styles.noteText}>{note.content || "No content saved yet."}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.surfaceWarm },
  content: { padding: spacing.lg, paddingBottom: spacing["4xl"] },
  editorCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.md,
  },
  sectionTitle: { fontSize: typography.size["2xl"], fontWeight: typography.weight.bold, color: palette.textPrimary, marginBottom: spacing.md },
  titleInput: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.size.base,
    color: palette.textPrimary,
    backgroundColor: palette.surfaceAlt,
    marginBottom: spacing.md,
  },
  contentInput: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.size.base,
    color: palette.textPrimary,
    backgroundColor: palette.surfaceAlt,
    minHeight: 140,
    textAlignVertical: "top",
    marginBottom: spacing.md,
  },
  notesSection: { marginTop: spacing["2xl"] },
  emptyCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    padding: spacing["2xl"],
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.border,
  },
  emptyText: { textAlign: "center", color: palette.textSecondary, marginTop: spacing.md },
  noteCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.sm,
  },
  noteHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  noteTitle: { fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: palette.textPrimary, flex: 1 },
  noteText: { color: palette.textSecondary, marginTop: spacing.sm, lineHeight: 22 },
});
