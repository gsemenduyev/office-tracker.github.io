// Netlify scheduled function to send daily reminders at 10 AM Chicago time (16:00 UTC)
// Schedule: "0 16 * * *" (daily at 16:00 UTC)

const admin = require('firebase-admin');

// Service account credentials (in production, use Netlify environment variables)
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  // Handle private key newlines correctly for Netlify env vars
  privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
};

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'office-tracker-notifications'
  });
}

const db = admin.firestore();
const messaging = admin.messaging();

exports.handler = async (event, context) => {
  try {
    console.log('Daily reminder function triggered at:', new Date().toISOString());

    // Get FCM token from Firestore
    const tokenDoc = await db.collection('fcmTokens').doc('user-token').get();
    console.log('Token doc exists:', tokenDoc.exists);

    if (!tokenDoc.exists) {
      console.log('No FCM token found in Firestore');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No token found, skipping notification' })
      };
    }

    const tokenData = tokenDoc.data();
    console.log('Token data:', tokenData);
    const fcmToken = tokenData.token;
    console.log('FCM token:', fcmToken ? 'Present' : 'Missing');

    if (!fcmToken) {
      console.log('No FCM token in document');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No token in document, skipping notification' })
      };
    }

    // Send notification
    const message = {
      token: fcmToken,
      notification: {
        title: 'Office Tracker Reminder',
        body: 'Time to check your office attendance for today!'
      },
      webpush: {
        fcmOptions: {
          link: 'https://office-tracker.netlify.app'
        }
      }
    };

    console.log('Sending message...');
    const response = await messaging.send(message);
    console.log('Notification sent successfully:', response);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Daily reminder sent successfully',
        response: response
      })
    };

  } catch (error) {
    console.error('Error sending daily reminder:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to send notification',
        details: error.message,
        stack: error.stack
      })
    };
  }
};