import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

// Firebase config - Get from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyAI70wSZb_Ct0jog68LtTw33nZASaDOv-o",
  authDomain: "chatapp-84477.firebaseapp.com",
  projectId: "chatapp-84477",
  storageBucket: "chatapp-84477.firebasestorage.app",
  messagingSenderId: "86686464914",
  appId: "1:86686464914:android:77d1c6355cb38f3ff29f4b",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export const initializeFirebaseMessaging = async () => {
  try {
    console.log('🔥 Initializing Firebase Messaging...');

    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: 'BKxxx...', // Get from Firebase Console → Cloud Messaging → Server API Key
    });

    if (token) {
      console.log('🔑 FCM Token:', token);
      await AsyncStorage.setItem('fcmToken', token);
      return token;
    } else {
      console.log('⚠️ No FCM token available');
      return null;
    }
  } catch (error) {
    console.error('❌ Firebase Messaging Error:', error);
    return null;
  }
};

export const setupFirebaseNotificationListener = () => {
  try {
    console.log('📱 Setting up Firebase notification listener...');

    onMessage(messaging, (payload) => {
      console.log('📬 Message received:', payload);

      // Handle notification
      if (payload.notification) {
        Notifications.scheduleNotificationAsync({
          content: {
            title: payload.notification.title || 'New Message',
            body: payload.notification.body || '',
            data: payload.data,
          },
          trigger: null,
        });
      }
    });

    console.log('✅ Firebase notification listener set up');
  } catch (error) {
    console.error('❌ Error setting up listener:', error);
  }
};

export { messaging };
