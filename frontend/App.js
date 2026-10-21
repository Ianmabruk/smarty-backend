import React from "react";
import { View, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { palette } from "./theme";
import { API_BASE } from "./services/config";

import LandingScreen from "./screens/LandingScreen";
import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";
import HomeScreen from "./screens/HomeScreen";
import CourseDetailScreen from "./screens/CourseDetailScreen";
import LessonScreen from "./screens/LessonScreen";
import QuizScreen from "./screens/QuizScreen";
import ProfileScreen from "./screens/ProfileScreen";
import ProgressScreen from "./screens/ProgressScreen";
import ChatScreen from "./screens/ChatScreen";
import NotesScreen from "./screens/NotesScreen";
import OnboardingScreen from "./screens/OnboardingScreen";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: palette.surface },
        headerTintColor: palette.textPrimary,
        headerTitleStyle: { fontWeight: "600", fontSize: 18 },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerTitle: "Educore" }}
      />
      <Stack.Screen
        name="CourseDetail"
        component={CourseDetailScreen}
        options={({ route }) => ({ headerTitle: route.params?.title || "Course" })}
      />
      <Stack.Screen
        name="Lesson"
        component={LessonScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Quiz"
        component={QuizScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === "Learn") iconName = focused ? "book" : "book-outline";
          else if (route.name === "Chat") iconName = focused ? "chatbubble" : "chatbubble-outline";
          else if (route.name === "Progress") iconName = focused ? "checkmark-circle" : "checkmark-circle-outline";
          else if (route.name === "Notes") iconName = focused ? "document-text" : "document-text-outline";
          else if (route.name === "Profile") iconName = focused ? "person" : "person-outline";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      })}
    >
      <Tab.Screen name="Learn" component={HomeStack} options={{ headerShown: false }} />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ headerTitle: "Chat" }} />
      <Tab.Screen name="Progress" component={ProgressScreen} options={{ headerTitle: "Progress" }} />
      <Tab.Screen name="Notes" component={NotesScreen} options={{ headerTitle: "Notes" }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ headerTitle: "Profile" }} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppInner />
      </NavigationContainer>
    </AuthProvider>
  );
}

function AppInner() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.primary, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>Loading...</Text>
        <Text style={{ color: "#fff", fontSize: 12, marginTop: 8, opacity: 0.8 }}>{API_BASE}</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <Stack.Navigator
        initialRouteName="Landing"
        screenOptions={{
          headerStyle: { backgroundColor: palette.surface },
          headerTintColor: palette.textPrimary,
          headerTitleStyle: { fontWeight: "600", fontSize: 18 },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="Landing" component={LandingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerTitle: "Sign In", headerBackTitle: "Back" }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ headerTitle: "Sign Up" }} />
      </Stack.Navigator>
    );
  }

  if (!user.onboarding_completed) {
    return (
      <Stack.Navigator
        initialRouteName="Onboarding"
        screenOptions={{
          headerStyle: { backgroundColor: palette.surface },
          headerTintColor: palette.textPrimary,
          headerTitleStyle: { fontWeight: "600", fontSize: 18 },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AppTabs" component={AppTabs} options={{ headerShown: false }} />
      </Stack.Navigator>
    );
  }

  return <AppTabs />;
}
