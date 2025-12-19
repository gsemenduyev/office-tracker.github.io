const admin = require('firebase-admin');

// Service account credentials (in production, use Netlify environment variables)
const serviceAccount = {
  project_id: process.env.FIREBASE_PROJECT_ID,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  // Handle private key newlines correctly for Netlify env vars
  private_key: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
};

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const subscription = JSON.parse(event.body);
    // The endpoint is a unique identifier for the subscription.
    const subscriptionId = subscription.endpoint; 

    if (!subscriptionId) {
        return { statusCode: 400, body: 'Bad Request: subscription endpoint is required' };
    }

    // Use the endpoint as the document ID to avoid duplicates
    await db.collection('subscriptions').doc(subscriptionId).set(subscription);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Subscription saved successfully.' }),
    };
  } catch (error) {
    console.error('Error saving subscription:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to save subscription.' }),
    };
  }
};
