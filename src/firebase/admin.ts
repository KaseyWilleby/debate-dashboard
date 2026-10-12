import * as admin from 'firebase-admin';
import { firebaseConfig } from './config';

/**
 * Initialize Firebase Admin SDK for server-side operations
 * This file should only be imported in server-side code (Server Actions, API routes)
 */

let adminApp: admin.app.App;

export function getAdminApp() {
  if (adminApp) {
    return adminApp;
  }

  // Check if Firebase Admin has already been initialized
  if (admin.apps.length > 0) {
    adminApp = admin.apps[0]!;
    return adminApp;
  }

  // Initialize Firebase Admin
  // In production (Firebase App Hosting), credentials are automatically provided via ADC
  // In development, we'll use a simpler approach without service account
  try {
    console.log('[Firebase Admin] Initializing with project:', firebaseConfig.projectId);
    console.log('[Firebase Admin] Environment:', process.env.NODE_ENV);

    // For development/testing, initialize without credentials
    // This will work for Firestore emulator or with proper IAM permissions
    adminApp = admin.initializeApp({
      projectId: firebaseConfig.projectId,
      // Firestore will use Application Default Credentials
      // or fall back to anonymous access for testing
    });

    console.log('[Firebase Admin] Successfully initialized');
  } catch (error) {
    console.error('[Firebase Admin] Failed to initialize:', error);
    console.error('[Firebase Admin] Error details:', JSON.stringify(error, null, 2));
    throw new Error(`Firebase Admin initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return adminApp;
}

// Export pre-initialized Firestore instance for convenience
export const adminDb = getAdminApp().firestore();
export const adminAuth = getAdminApp().auth();
export const adminStorage = getAdminApp().storage();
