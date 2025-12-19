// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Your Firebase config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
const messaging = getMessaging(app);

// Initialize Firestore
const db = getFirestore(app);

const VAPID_KEY = import.meta.env.VITE_VAPID_KEY;

// Request notification permission and get token
export const requestNotificationPermission = async () => {
  try {
    console.log('Requesting notification permission...');
    const permission = await Notification.requestPermission();
    console.log('Permission result:', permission);
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      console.log('Waiting for service worker to be ready...');
      
      // Use the active Service Worker (sw.js) instead of default firebase-messaging-sw.js
      const registration = await navigator.serviceWorker.ready;
      console.log('Service worker is ready:', registration);
      
      console.log('Requesting FCM token...');
      const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
      console.log('FCM Token result:', token ? 'Token received' : 'No token');
      if (token) {
        console.log('FCM Token:', token);
        // Save token to Firestore
        await saveTokenToFirestore(token);
        return token;
      } else {
        console.log('No registration token available. This is normal if the user has denied permission or if there is an issue with the service worker.');
      }
    } else {
      console.log('Notification permission denied.');
    }
  } catch (error) {
    console.error('Error getting notification permission:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
  }
};

// Save FCM token to Firestore
const saveTokenToFirestore = async (token) => {
  try {
    // Use a fixed document ID for simplicity (single user)
    await setDoc(doc(db, 'fcmTokens', 'user-token'), {
      token: token,
      timestamp: new Date()
    });
    console.log('Token saved to Firestore');
  } catch (error) {
    console.error('Error saving token to Firestore:', error);
  }
};

// Handle foreground messages
export const onMessageListener = (callback) => {
  return onMessage(messaging, (payload) => {
    console.log('Message received: ', payload);
    callback(payload);
  });
};

export { messaging, db };