import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { palette, typography, spacing, radii, shadows } from "../theme";
import { useAuth } from "../context/AuthContext";
import SectionHeader from "../components/SectionHeader";
import ListItem from "../components/ListItem";

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  const menuItems = [
    { id: "1", title: "Account settings", subtitle: "Manage your profile and preferences", icon: "person-outline", onPress: () => {} },
    { id: "2", title: "Notifications", subtitle: "Choose what you hear from Smarty", icon: "notifications-outline", onPress: () => {} },
    { id: "3", title: "Accessibility", subtitle: "Text size, voice, and display options", icon: "contrast-outline", onPress: () => {} },
    { id: "4", title: "Help & support", subtitle: "Get help using Smarty", icon: "help-circle-outline", onPress: () => {} },
    { id: "5", title: "Privacy policy", subtitle: "How we protect your data", icon: "shield-checkmark-outline", onPress: () => {} },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarText}>{(user?.name || "?").charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user?.name || "User"}</Text>
        <Text style={styles.email}>{user?.email || ""}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role || "student"}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <SectionHeader title="Account" />
        <View style={styles.menu}>
          {menuItems.map((item) => (
            <ListItem
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              icon={item.icon}
              iconColor={palette.primary}
              onPress={item.onPress}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={18} color={palette.error} style={{ marginRight: 6 }} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Smarty v1.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.surfaceWarm },
  header: {
    backgroundColor: palette.surface,
    padding: spacing["3xl"],
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  avatarWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: palette.primarySoft,
    alignItems: "center", justifyContent: "center",
    marginBottom: spacing.md,
  },
  avatarText: { color: palette.primaryDark, fontSize: 28, fontWeight: "700" },
  name: { fontSize: typography.size["2xl"], fontWeight: typography.weight.bold, color: palette.textPrimary },
  email: { fontSize: typography.size.base, color: palette.textSecondary, marginTop: 2 },
  roleBadge: {
    marginTop: spacing.md, paddingVertical: spacing.xs, paddingHorizontal: spacing.lg,
    backgroundColor: palette.primarySoft, borderRadius: radii.full,
  },
  roleText: { fontSize: typography.size.sm, color: palette.primaryDark, fontWeight: typography.weight.semibold },
  content: { padding: spacing.lg, paddingTop: spacing["2xl"] },
  menu: { marginBottom: spacing.xl },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    padding: spacing.lg, backgroundColor: palette.error + "12", borderRadius: radii.lg,
    borderWidth: 1, borderColor: palette.error + "30",
  },
  logoutText: { color: palette.error, fontSize: typography.size.base, fontWeight: typography.weight.semibold },
  version: { textAlign: "center", color: palette.textMuted, fontSize: typography.size.sm, marginTop: spacing.xl },
});