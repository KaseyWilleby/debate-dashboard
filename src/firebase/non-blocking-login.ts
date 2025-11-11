
'use client';
import {
  Auth, // Import Auth type for type hinting
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  // Assume getAuth and app are initialized elsewhere
} from 'firebase/auth';
import type { UserRole } from '@/lib/types';
import { doc, setDoc, Firestore } from 'firebase/firestore';
import { errorEmitter } from './error-emitter';
import { FirestorePermissionError } from './errors';


/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  // CRITICAL: Call signInAnonymously directly. Do NOT use 'await signInAnonymously(...)'.
  signInAnonymously(authInstance);
  // Code continues immediately. Auth state change is handled by onAuthStateChanged listener.
}

/** Initiate email/password sign-up (returns promise for error handling). */
export function initiateEmailSignUp(authInstance: Auth, firestore: Firestore, email: string, password: string, name: string, role: UserRole, studentId?: string): Promise<void> {
  return createUserWithEmailAndPassword(authInstance, email, password)
    .then(userCredential => {
        const user = userCredential.user;
        const userDocRef = doc(firestore, 'users', user.uid);

        // Check if this is Mr. Willeby's account
        const isMrWilleby = user.email?.toLowerCase() === 'kaseywilleby@gmail.com';
        const finalRole = isMrWilleby ? 'admin' : role;

        const userData: any = {
            id: user.uid,
            name: name,
            email: user.email,
            role: finalRole,
            username: name.replace(/\s+/g, '.'),
            avatarUrl: '',
            approved: finalRole === 'admin' ? true : false
        };

        // Only add studentId for non-admin users (students)
        if (finalRole !== 'admin' && studentId) {
            userData.studentId = studentId;
        }
        return setDoc(userDocRef, userData)
            .catch(error => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: userDocRef.path,
                    operation: 'create',
                    requestResourceData: userData
                }));
                throw error;
            });
    })
    .catch((error) => {
      // Re-throw the error so it can be caught by the calling code
      throw error;
    });
}

/** Initiate email/password sign-in (returns promise for error handling). */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): Promise<void> {
  return signInWithEmailAndPassword(authInstance, email, password)
    .then(() => {
      // Successfully signed in, auth state change handled by onAuthStateChanged listener
    })
    .catch((error) => {
      // Re-throw the error so it can be caught by the calling code
      throw error;
    });
}

/** Initiate sign out (non-blocking). */
export function initiateSignOut(authInstance: Auth): void {
    signOut(authInstance);
}
