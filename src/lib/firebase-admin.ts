import admin from 'firebase-admin';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let initialized = false;

// Initialize Firebase Admin SDK once
const initializeAdmin = () => {
  if (initialized) {
    return;
  }

  try {
    // Check if already initialized
    if (getApps().length > 0) {
      console.log('Firebase Admin already initialized');
      initialized = true;
      return;
    }

    // Initialize
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')!,
      }),
    });
    console.log('Firebase Admin initialized successfully');
    initialized = true;
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
    throw error;
  }
};

// Lazy initialization functions
export const getAdminAuth = () => {
  initializeAdmin();
  return getAuth();
};

export const getAdminDb = () => {
  initializeAdmin();
  return getFirestore();
};
