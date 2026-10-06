/**
 * Fetch the currently deployed Firestore rules
 */

const admin = require('firebase-admin');
require('dotenv').config({ path: '.env' });

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

async function getDeployedRules() {
  console.log('🔍 Fetching deployed Firestore rules...\n');

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;

    // Use the REST API to get the deployed rules
    const { google } = require('googleapis');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    const authClient = await auth.getClient();
    const firestore = google.firestore('v1');

    const response = await firestore.projects.databases.getSecurityRules({
      auth: authClient,
      name: `projects/${projectId}/databases/(default)/documents`,
    });

    console.log('Deployed rules:');
    console.log(response.data);

  } catch (error) {
    console.error('❌ Error:', error.message);

    // Fallback: just try to query collections to verify access
    console.log('\nFallback: Testing collection access...\n');
    const db = admin.firestore();

    try {
      const appointmentsSnapshot = await db.collection('appointments').limit(1).get();
      console.log('✅ Server can access appointments collection');
      console.log(`   Found ${appointmentsSnapshot.size} document(s)`);
    } catch (e) {
      console.log('❌ Server cannot access appointments collection:', e.message);
    }
  }

  process.exit(0);
}

getDeployedRules();
