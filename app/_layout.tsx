import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, Platform } from "react-native";
import "react-native-reanimated";
import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { initSocket, disconnectSocket } from "@/services/socket";

// Notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // 🔍 App boot
  useEffect(() => {
    console.log("🚀 App opened");
    console.log("📱 Platform:", Platform.OS);
  }, []);

  // 🔍 Track route changes
  useEffect(() => {
    console.log("📍 Current route:", pathname);
  }, [pathname]);

  // 🔑 AUTH REDIRECT
  useEffect(() => {
    console.log("🔐 Auth check:", { isAuthenticated, loading });

    if (!loading) {
      if (isAuthenticated) {
        console.log("➡ Redirecting to /(tabs)/home");
        router.replace("/(tabs)/home");
      } else {
        console.log("➡ Redirecting to /login");
        router.replace("/login");
      }
    }
  }, [isAuthenticated, loading]);

  // 🔌 SOCKET LIFECYCLE
  useEffect(() => {
    if (isAuthenticated) {
      console.log("🔌 Initializing socket");
      initSocket();
    } else {
      console.log("❌ Disconnecting socket");
      disconnectSocket();
    }
  }, [isAuthenticated]);

  // 🔔 NOTIFICATION DEEP LINKING
  useEffect(() => {
    console.log("📲 Setting up notification response handler");

    // Listen for notification responses (when user taps notification)
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log("👆 Notification tapped:", response);
        
        const data = response.notification.request.content.data;
        console.log("📋 Notification data:", data);
        console.log("📋 Data type:", typeof data);
        console.log("📋 GroupId:", data?.groupId);

        // Deep link to chat if groupId is provided
        if (data && data.groupId) {
          console.log("🔗 Deep linking to chat:", data.groupId);
          
          // If user is authenticated, navigate immediately
          if (isAuthenticated) {
            console.log("✅ User authenticated, navigating to chat");
            setTimeout(() => {
              router.push(`/chat/${data.groupId}`);
            }, 500);
          } else {
            // If user is not authenticated, save the deep link and navigate after login
            console.log("⚠️ User not authenticated, will navigate after login");
            // Store the pending deep link in AsyncStorage
            AsyncStorage.setItem('pendingDeepLink', `/chat/${data.groupId}`);
          }
        } else {
          console.log("⚠️ No groupId in notification data");
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [router, isAuthenticated]);

  // ⏳ Loading screen
  if (loading) {
    console.log("⏳ Auth loading...");
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
