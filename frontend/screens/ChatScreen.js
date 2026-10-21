import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { palette, typography, spacing, radii, shadows } from "../theme";
import { chatAPI } from "../services/api";

export default function ChatScreen() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);
  const pendingSubmitRef = useRef(false);
  const navigation = useNavigation();

  const loadConversation = async (conversationId) => {
    try {
      const res = await chatAPI.get(conversationId);
      const chat = res?.data?.data;
      const nextMessages = Array.isArray(chat?.messages) ? chat.messages : [];
      setMessages(nextMessages);
      return nextMessages;
    } catch (err) {
      console.error("Failed to load conversation", err);
      setError("Unable to load the selected chat.");
      return [];
    }
  };

  const loadConversations = async () => {
    setLoading(true);
    try {
      const res = await chatAPI.list();
      const items = Array.isArray(res?.data?.data) ? res.data.data : [];
      setConversations(items);

      if (!items.length) {
        setActiveId(null);
        setMessages([]);
        return;
      }

      const selectedId = activeId && items.some((item) => item.id === activeId) ? activeId : items[0].id;
      setActiveId(selectedId);
      await loadConversation(selectedId);
    } catch (err) {
      console.error("Failed to load chats", err);
      setError("Unable to load conversations right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollToEnd({ animated: true });
  }, [messages, activeId]);

  const refreshConversations = async () => {
    const res = await chatAPI.list();
    const items = Array.isArray(res?.data?.data) ? res.data.data : [];
    setConversations(items);

    if (items.length) {
      const availableId = activeId && items.some((item) => item.id === activeId) ? activeId : items[0].id;
      setActiveId(availableId);
      await loadConversation(availableId);
    } else {
      setActiveId(null);
      setMessages([]);
    }
  };

  const startNewConversation = async () => {
    if (pendingSubmitRef.current) return;

    try {
      const res = await chatAPI.create({ title: "New chat" });
      const conversation = res?.data?.data;
      if (!conversation?.id) {
        throw new Error("New conversation response missing id");
      }

      setConversations((prev) => [conversation, ...prev.filter((item) => item.id !== conversation.id)]);
      setActiveId(conversation.id);
      setMessages([]);
      setError("");
      setDraft("");
      setDrawerOpen(false);
    } catch (err) {
      console.error("Unable to create chat", err);
      setError("Unable to create a new conversation.");
    }
  };

  const ensureActiveConversation = async () => {
    if (activeId) return activeId;

    try {
      const res = await chatAPI.list();
      const fallbackList = Array.isArray(res?.data?.data) ? res.data.data : [];

      if (fallbackList.length) {
        const firstConversation = fallbackList[0];
        setActiveId(firstConversation.id);
        await loadConversation(firstConversation.id);
        return firstConversation.id;
      }

      const created = await chatAPI.create({ title: "New chat" });
      const conversation = created?.data?.data;
      if (!conversation?.id) {
        throw new Error("Could not create a conversation for this message");
      }

      setConversations((prev) => [conversation, ...prev.filter((item) => item.id !== conversation.id)]);
      setActiveId(conversation.id);
      setMessages([]);
      return conversation.id;
    } catch (err) {
      console.error("Unable to prepare active chat", err);
      setError("Unable to prepare the chat. Please try again.");
      return null;
    }
  };

  const selectConversation = async (id) => {
    setActiveId(id);
    setDrawerOpen(false);
    setError("");
    await loadConversation(id);
  };

  const handleDrawerNavigation = (target) => {
    setDrawerOpen(false);
    if (target === "Chat") {
      return;
    }
    navigation.navigate(target);
  };

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || sending || pendingSubmitRef.current) return;

    pendingSubmitRef.current = true;
    setSending(true);
    setError("");

    const conversationId = activeId || (await ensureActiveConversation());
    if (!conversationId) {
      pendingSubmitRef.current = false;
      setSending(false);
      return;
    }

    const optimisticUserMessage = {
      id: `pending-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    const thinkingMessage = {
      id: `thinking-${optimisticUserMessage.id}`,
      role: "assistant",
      content: "Thinking...",
      created_at: new Date().toISOString(),
      isTyping: true,
    };

    setMessages((prev) => [...prev, optimisticUserMessage, thinkingMessage]);
    setDraft("");

    try {
      const response = await chatAPI.send(conversationId, { content: text, role: "user" });
      const payload = response?.data?.data || {};
      const nextUserMessage = payload.user_message || optimisticUserMessage;
      const assistantMessage = payload.assistant_message;

      setMessages((prev) => {
        const withoutOptimistic = prev.filter(
          (item) => item.id !== optimisticUserMessage.id && item.id !== thinkingMessage.id
        );
        const next = [...withoutOptimistic];

        if (nextUserMessage?.id && !next.some((item) => item.id === nextUserMessage.id)) {
          next.push({ ...nextUserMessage, role: "user" });
        } else if (!next.some((item) => item.role === "user" && item.content === text)) {
          next.push({ ...optimisticUserMessage, content: text });
        }

        if (assistantMessage?.id && !next.some((item) => item.id === assistantMessage.id)) {
          next.push({ ...assistantMessage, role: "assistant" });
        } else if (!assistantMessage?.id && !next.some((item) => item.role === "assistant" && item.content === "Thinking...")) {
          next.push({
            id: `assistant-placeholder-${Date.now()}`,
            role: "assistant",
            content: "Thinking...",
            created_at: new Date().toISOString(),
            isTyping: true,
          });
        }

        return next;
      });

      if (payload.conversation?.id) {
        setConversations((prev) => prev.map((item) => (
          item.id === payload.conversation.id ? { ...item, ...payload.conversation } : item
        )));
      }

      await refreshConversations();
    } catch (err) {
      console.error("Failed to send message", err);
      setMessages((prev) => prev.filter((item) => item.id !== optimisticUserMessage.id && item.id !== thinkingMessage.id));
      setDraft(text);
      setError(err.response?.data?.error || "The message could not be sent. Please try again.");
    } finally {
      pendingSubmitRef.current = false;
      setSending(false);
    }
  };

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId]
  );

  const navItems = [
    { name: "Learn", icon: "book-outline" },
    { name: "Chat", icon: "chatbubble-outline" },
    { name: "Progress", icon: "checkmark-circle-outline" },
    { name: "Notes", icon: "document-text-outline" },
    { name: "Profile", icon: "person-outline" },
  ];

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={88}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setDrawerOpen((v) => !v)} style={styles.menuButton} accessibilityLabel="Toggle conversation history">
          <Ionicons name="menu-outline" size={26} color={palette.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{activeConversation?.title || "Smarty chat"}</Text>

        <TouchableOpacity onPress={startNewConversation} style={styles.newButton} accessibilityLabel="Start new conversation">
          <Ionicons name="add" size={22} color={palette.textPrimary} />
        </TouchableOpacity>
      </View>

      <Modal visible={drawerOpen} transparent animationType="fade" onRequestClose={() => setDrawerOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setDrawerOpen(false)} />
        <View style={styles.drawer}>
          <View style={styles.drawerSection}>
            {navItems.map((item) => (
              <TouchableOpacity
                key={item.name}
                onPress={() => handleDrawerNavigation(item.name)}
                style={[styles.drawerItem, item.name === "Chat" && styles.drawerItemActive]}
              >
                <Ionicons name={item.icon} size={20} color={item.name === "Chat" ? palette.primaryDark : palette.textPrimary} />
                <Text style={[styles.drawerLabel, item.name === "Chat" && styles.drawerLabelActive]}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.drawerDivider} />

          <Text style={styles.drawerSectionTitle}>Recent chats</Text>
          {loading ? (
            <ActivityIndicator size="small" color={palette.primary} style={{ marginTop: spacing.lg }} />
          ) : conversations.length === 0 ? (
            <View style={styles.emptyState}><Text style={styles.emptyText}>No conversations yet.</Text></View>
          ) : (
            conversations.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.conversationItem, activeId === item.id && styles.conversationItemActive]}
                onPress={() => selectConversation(item.id)}
              >
                <Text style={styles.conversationTitle} numberOfLines={1}>{item.title || "New chat"}</Text>
                <Text style={styles.conversationMeta}>{item.message_count || 0} messages</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </Modal>

      <View style={styles.content}>
        <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={styles.messagesContent} showsVerticalScrollIndicator={false}>
          {messages.length === 0 ? (
            <View style={styles.placeholderBox}>
              <Ionicons name="sparkles" size={26} color={palette.primaryDark} />
              <Text style={styles.placeholderTitle}>Ask Smarty anything</Text>
              <Text style={styles.placeholderText}>Get instant explanations, revision help, and study guidance.</Text>
            </View>
          ) : (
            messages.map((message) => (
              <View key={message.id || `${message.role}-${message.created_at}`} style={[styles.messageRow, message.role === "user" ? styles.messageRowUser : styles.messageRowAi]}>
                <View style={[styles.messageBubble, message.role === "user" ? styles.userBubble : styles.aiBubble]}>
                  <Text style={[styles.messageText, message.role === "user" ? styles.userText : styles.aiText]}>{message.content}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask a question..."
            placeholderTextColor={palette.textMuted}
            multiline
            style={styles.input}
            maxLength={1000}
            onSubmitEditing={() => { if (!sending && draft.trim()) sendMessage(); }}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!draft.trim() || sending}
            style={[styles.sendButton, (!draft.trim() || sending) && styles.sendButtonDisabled]}
            accessibilityLabel="Send message"
          >
            {sending ? (
              <ActivityIndicator size="small" color={palette.textPrimary} />
            ) : (
              <Ionicons name="send" size={18} color={palette.textPrimary} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.surfaceWarm },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    minHeight: 64,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: palette.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: palette.border,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: palette.textPrimary,
    marginHorizontal: spacing.sm,
  },
  newButton: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.primary,
  },
  content: { flex: 1 },
  messages: { flex: 1, backgroundColor: palette.surfaceWarm },
  messagesContent: { padding: spacing.lg, paddingBottom: spacing.xl },
  placeholderBox: { alignItems: "center", justifyContent: "center", flex: 1, paddingVertical: spacing["4xl"], paddingHorizontal: spacing.xl },
  placeholderTitle: { fontSize: typography.size.xl, fontWeight: typography.weight.bold, color: palette.textPrimary, marginTop: spacing.md },
  placeholderText: { color: palette.textSecondary, textAlign: "center", marginTop: spacing.sm, lineHeight: 22 },
  messageRow: { marginBottom: spacing.md, flexDirection: "row" },
  messageRowUser: { justifyContent: "flex-end" },
  messageRowAi: { justifyContent: "flex-start" },
  messageBubble: { maxWidth: "82%", paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: radii.lg },
  userBubble: { backgroundColor: palette.primary, borderBottomRightRadius: 6 },
  aiBubble: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderBottomLeftRadius: 6 },
  messageText: { fontSize: typography.size.base, lineHeight: 22 },
  userText: { color: "#fff" },
  aiText: { color: palette.textPrimary },
  errorText: { color: palette.error, fontSize: typography.size.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    backgroundColor: palette.surface,
  },
  input: {
    flex: 1,
    minHeight: 52,
    maxHeight: 120,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: palette.textPrimary,
    backgroundColor: palette.surfaceWarm,
    marginRight: spacing.sm,
  },
  sendButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.primary,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  backdrop: { flex: 1, backgroundColor: "rgba(24, 48, 27, 0.35)" },
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 300,
    backgroundColor: palette.surface,
    borderRightWidth: 1,
    borderRightColor: palette.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  drawerSection: { gap: spacing.xs },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: "transparent",
  },
  drawerItemActive: {
    backgroundColor: palette.primarySoft,
  },
  drawerLabel: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: palette.textPrimary,
  },
  drawerLabelActive: {
    color: palette.primaryDark,
  },
  drawerDivider: {
    height: 1,
    backgroundColor: palette.border,
    marginVertical: spacing.md,
  },
  drawerSectionTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.4,
    color: palette.textMuted,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
  },
  conversationItem: {
    backgroundColor: palette.surfaceAlt,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: spacing.sm,
  },
  conversationItemActive: { borderColor: palette.primary, backgroundColor: palette.primarySoft },
  conversationTitle: { fontSize: typography.size.base, fontWeight: typography.weight.semibold, color: palette.textPrimary },
  conversationMeta: { fontSize: typography.size.xs, color: palette.textMuted, marginTop: 4 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: spacing.xl },
  emptyText: { color: palette.textMuted },
});
