
"use client";

import { User as FirebaseUser } from "firebase/auth";
import { User as AppUser, UserRole } from "@/lib/types";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useUser as useFirebaseUserHook } from "@/firebase/auth/use-user";
import { initiateEmailSignIn, initiateEmailSignUp, initiateSignOut } from "@/firebase/non-blocking-login";
import { Loader2 } from "lucide-react";
import { useDoc } from "@/firebase/firestore/use-doc";
import { doc, collection } from "firebase/firestore";
import { useFirebase } from "@/firebase/provider";
import { useCollection } from "@/firebase/firestore/use-collection";


interface AuthContextType {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  login: (credentials: { email: string; password?: string }) => Promise<void>;
  logout: () => void;
  signUp: (credentials: { email: string; password?: string, name: string, role: UserRole }) => Promise<void>;
  allUsers: AppUser[];
}

const AuthContext = React.createContext<AuthContextType | null>(null);

function AllUsersFetcher({ children, onData }: { children: React.ReactNode, onData: (users: AppUser[], isLoading: boolean) => void }) {
    const { firestore } = useFirebase();
    const usersCollectionRef = React.useMemo(
        () => (firestore ? collection(firestore, 'users') : null),
        [firestore]
    );
    const { data: allUsersData, isLoading: areUsersLoading } = useCollection<AppUser>(usersCollectionRef);

    React.useEffect(() => {
        onData(allUsersData || [], areUsersLoading);
    }, [allUsersData, areUsersLoading, onData]);
    
    return <>{children}</>;
}


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: firebaseUser, isUserLoading: isFirebaseUserLoading } = useFirebaseUserHook();
  const { firestore, auth } = useFirebase();
  const router = useRouter();

  // State to hold the application-specific user profile
  const [appUser, setAppUser] = React.useState<AppUser | null>(null);
  
  const [allUsers, setAllUsers] = React.useState<AppUser[]>([]);
  const [areUsersLoading, setAreUsersLoading] = React.useState(false);

  const userDocRef = React.useMemo(
    () => (firestore && firebaseUser ? doc(firestore, "users", firebaseUser.uid) : null),
    [firestore, firebaseUser]
  );
  
  // useDoc fetches the user profile from Firestore
  const { data: fetchedUser, isLoading: isAppUserLoading } = useDoc<AppUser>(userDocRef);

  // When fetchedUser changes, update our appUser state
  React.useEffect(() => {
    if (fetchedUser) {
      setAppUser(fetchedUser);
    } else if (!isAppUserLoading && firebaseUser === null) {
      // If auth is done and there's no firebase user, clear app user
      setAppUser(null);
    }
  }, [fetchedUser, isAppUserLoading, firebaseUser]);
  
  const handleAllUsersData = React.useCallback((users: AppUser[], isLoading: boolean) => {
    setAllUsers(users);
    setAreUsersLoading(isLoading);
  }, []);
  
  const isLoading = isFirebaseUserLoading || (!!firebaseUser && isAppUserLoading) || (appUser?.role === 'admin' && areUsersLoading);


  const login = async (credentials: { email: string; password?: string }) => {
    try {
        await initiateEmailSignIn(auth, credentials.email, credentials.password || 'password123');
        router.push('/dashboard/welcome');
    } catch (error) {
        console.error("Login failed:", error);
        throw error;
    }
  };

  const logout = async () => {
    try {
        await initiateSignOut(auth);
        setAppUser(null); // Clear user profile on logout
        router.push('/');
    } catch (error) {
        console.error("Logout failed:", error);
    }
  };
  
  const signUp = async (credentials: { email: string; password?: string, name: string, role: UserRole }) => {
    try {
        await initiateEmailSignUp(auth, firestore, credentials.email, credentials.password || 'password123', credentials.name, credentials.role);
        router.push('/dashboard/welcome');
    } catch (error) {
        console.error("Sign up failed:", error);
        throw error;
    }
  };

  const value = {
    user: appUser,
    firebaseUser,
    isLoading,
    login,
    logout,
    signUp,
    allUsers
  };
  
  const providerContent = appUser?.role === 'admin' 
    ? <AllUsersFetcher onData={handleAllUsersData}>{children}</AllUsersFetcher>
    : children;

  return (
    <AuthContext.Provider value={value}>
      {providerContent}
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
