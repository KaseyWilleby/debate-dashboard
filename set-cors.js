const admin = require('firebase-admin');
const fs = require('fs');

admin.initializeApp({
  projectId: 'debate-dashboard',
});

async function setCORS() {
  try {
    const bucket = admin.storage().bucket('debate-dashboard.firebasestorage.app');

    console.log(`Setting CORS for bucket: ${bucket.name}`);

    // Read CORS configuration
    const corsConfig = JSON.parse(fs.readFileSync('cors.json', 'utf8'));

    // Set CORS configuration
    await bucket.setCorsConfiguration(corsConfig);

    console.log('✅ CORS configuration applied successfully!');
    console.log('CORS config:', JSON.stringify(corsConfig, null, 2));

  } catch (error) {
    console.error('❌ Error setting CORS:', error);
    process.exit(1);
  }
}

setCORS();
