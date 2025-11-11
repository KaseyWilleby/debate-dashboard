
'use client';

import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { useAuthFirebase } from '@/firebase/provider';

// Return type for useUser() - specific to user auth state
export interface UserHookResult {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

/**
 * Hook specifically for accessing the authenticated user's state.
 * This provides the User object, loading status, and any auth errors.
 * @returns {UserHookResult} Object with user, isUserLoading, userError.
 */
export const useUser = (): UserHookResult => {
  const auth = useAuthFirebase();
  const [userState, setUserState] = useState<UserHookResult>({
    user: auth.currentUser,
    isUserLoading: true,
    userError: null,
  });

  useEffect(() => {
    // Set initial state immediately in case there's a cached user
    setUserState({
      user: auth.currentUser,
      isUserLoading: !auth.currentUser, // if no cached user, we are loading
      userError: null,
    });

    const unsubscribe = auth.onAuthStateChanged(
      (firebaseUser) => {
        setUserState({ user: firebaseUser, isUserLoading: false, userError: null });
      },
      (error) => {
        console.error("useUser: onAuthStateChanged error:", error);
        setUserState({ user: null, isUserLoading: false, userError: error });
      }
    );
    
    return () => unsubscribe();
  }, [auth]);

  return userState;
};
