/**
 * Check deployed Firestore rules using REST API
 */

const admin = require('firebase-admin');
require('dotenv').config({ path: '.env' });

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

async function checkDeployedRules() {
  console.log('🔍 Checking deployed Firestore rules...\n');

  try {
    // Get an access token
    const credential = admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    });

    const accessToken = await credential.getAccessToken();
    const projectId = process.env.FIREBASE_PROJECT_ID;

    // Use fetch to call the Firestore REST API
    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:listCollectionIds`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    console.log('Collections in Firestore:', data);

    // Now try to test the rules by attempting to read without auth
    console.log('\n🔍 Testing rules by attempting unauthorized access...\n');

    const testResponse = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/appointments`,
      {
        method: 'GET',
      }
    );

    if (testResponse.ok) {
      console.log('✅ Appointments collection is publicly readable (rules allow anonymous access)');
      const appointments = await testResponse.json();
      console.log('Response:', appointments);
    } else {
      console.log('❌ Appointments collection is NOT publicly readable');
      console.log('Status:', testResponse.status);
      const error = await testResponse.text();
      console.log('Error:', error);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  process.exit(0);
}

checkDeployedRules();
