const admin = require('firebase-admin');
const webpush = require('web-push');

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // FIX: Replace literal \n with actual newlines
      privateKey: process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/^"|"$/g, '').trim()
        : undefined,
    }),
  });
}

const db = admin.firestore();

// VAPID keys should be stored as environment variables
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY ? process.env.VAPID_PUBLIC_KEY.trim() : '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY ? process.env.VAPID_PRIVATE_KEY.trim() : '';

if (!vapidPublicKey || !vapidPrivateKey) {
  console.error('You must set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables.');
} else {
    console.log('Backend VAPID Key prefix:', vapidPublicKey.substring(0, 10) + '...');
    webpush.setVapidDetails(
      `mailto:${process.env.FIREBASE_CLIENT_EMAIL || 'example@example.com'}`,
      vapidPublicKey,
      vapidPrivateKey
    );
}


exports.handler = async (event, context) => {
  try {
    const subscriptionsSnapshot = await db.collection('subscriptions').get();
    if (subscriptionsSnapshot.empty) {
      console.log('No subscriptions found.');
      return {
        statusCode: 200,
        body: 'No subscriptions found.',
      };
    }

    const notificationPayload = JSON.stringify({
      title: 'Office Tracker Reminder',
      body: 'Please mark if you are working from home or office today.',
      icon: 'https://office-tracker.netlify.app/icons/icon-192.png',
      data: {
        url: 'https://office-tracker.netlify.app'
      }
    });

    const sendPromises = [];
    subscriptionsSnapshot.forEach(doc => {
      const subscription = doc.data();
      sendPromises.push(
        webpush.sendNotification(subscription, notificationPayload)
          .catch(error => {
            if (error.statusCode === 410) {
              // Gone: subscription has expired or is no longer valid.
              // Delete it from the database.
              console.log('Subscription has expired, deleting:', doc.id);
              return doc.ref.delete();
            } else if (error.statusCode === 403) {
              // VAPID key mismatch: The key used to subscribe (frontend) differs from the key used to send (backend).
              console.log('Subscription invalid (VAPID mismatch), deleting:', doc.id);
              return doc.ref.delete();
            } else {
              console.error('Error sending notification to', doc.id, error);
            }
          })
      );
    });

    await Promise.all(sendPromises);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Daily reminders sent successfully.' }),
    };
  } catch (error) {
    console.error('Error sending daily reminders:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send daily reminders.' }),
    };
  }
};
