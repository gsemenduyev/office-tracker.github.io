// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCtQSNLZPyK1cR6wHohvb5pBntRNqovPI4",
  authDomain: "office-tracker-notifications.firebaseapp.com",
  projectId: "office-tracker-notifications",
  storageBucket: "office-tracker-notifications.firebasestorage.app",
  messagingSenderId: "570998782420",
  appId: "1:570998782420:web:7219e81a6fe91c9fa5fe41",
  measurementId: "G-T5SGH7Q1ZV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
const messaging = getMessaging(app);

// VAPID key for web push
const VAPID_KEY = 'BLs0IikOkDRixQstgvaTVAPayWYLDMd26ACbkIlJYP8Lvh5xsMGgP-q8ri6bttyE3ID4m1suLIO4FHV4pBsuHQg';

// Request notification permission and get token
export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (token) {
        console.log('FCM Token:', token);
        // Here you would send the token to your backend
        return token;
      } else {
        console.log('No registration token available.');
      }
    } else {
      console.log('Notification permission denied.');
    }
  } catch (error) {
    console.error('Error getting notification permission:', error);
  }
};

// Handle foreground messages
export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log('Message received: ', payload);
      resolve(payload);
    });
  });

export { messaging };