
"use client";

import { User as FirebaseUser } from "firebase/auth";
import { User as AppUser, UserRole } from "@/lib/types";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useUser as useFirebaseUserHook } from "@/firebase/auth/use-user";
import { initiateEmailSignIn, initiateEmailSignUp, initiateSignOut } from "@/firebase/non-blocking-login";
import { useDoc } from "@/firebase/firestore/use-doc";
import { doc } from "firebase/firestore";
import { useFirebase, useMemoFirebase } from "@/firebase";

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  login: (credentials: { email: string; password?: string }) => Promise<void>;
  logout: () => void;
  signUp: (credentials: { email: string; password?: string, name: string, role: UserRole, studentId?: string }) => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: firebaseUser, isUserLoading: isFirebaseUserLoading } = useFirebaseUserHook();
  const { firestore, auth } = useFirebase();
  const router = useRouter();

  const [appUser, setAppUser] = React.useState<AppUser | null>(null);
  
  const userDocRef = useMemoFirebase(
    () => (firestore && firebaseUser ? doc(firestore, "users", firebaseUser.uid) : null),
    [firestore, firebaseUser]
  );
  
  const { data: fetchedUser, isLoading: isAppUserLoading } = useDoc<AppUser>(userDocRef);

  React.useEffect(() => {
    if (fetchedUser) {
      setAppUser(fetchedUser);
    } else if (!isAppUserLoading && firebaseUser === null) {
      setAppUser(null);
    }
  }, [fetchedUser, isAppUserLoading, firebaseUser]);
  
  const isLoading = isFirebaseUserLoading || (!!firebaseUser && isAppUserLoading);

  const login = async (credentials: { email: string; password?: string }) => {
    if(!auth) return;
    try {
        await initiateEmailSignIn(auth, credentials.email, credentials.password || 'password123');
        router.push('/dashboard/welcome');
    } catch (error) {
        console.error("Login failed:", error);
        throw error;
    }
  };

  const logout = async () => {
    if(!auth) return;
    try {
        await initiateSignOut(auth);
        setAppUser(null);
        router.push('/');
    } catch (error) {
        console.error("Logout failed:", error);
    }
  };
  
  const signUp = async (credentials: { email: string; password?: string, name: string, role: UserRole, studentId?: string }) => {
    if(!auth || !firestore) return;
    try {
        await initiateEmailSignUp(auth, firestore, credentials.email, credentials.password || 'password123', credentials.name, credentials.role, credentials.studentId);
        router.push('/dashboard/welcome');
    } catch (error) {
        console.error("Sign up failed:", error);
        throw error;
    }
  };

  const value: AuthContextType = {
    user: appUser,
    firebaseUser,
    isLoading,
    login,
    logout,
    signUp,
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
