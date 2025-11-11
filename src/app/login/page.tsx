"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Gavel } from "lucide-react";
import { UserRole } from "@/lib/types";
import { useFirebase } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function LoginPage() {
  const { login, signUp } = useAuth();
  const { firestore } = useFirebase();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Login form state
  const [loginEmailOrUsername, setLoginEmailOrUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupEmailConfirm, setSignupEmailConfirm] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupRole, setSignupRole] = useState<UserRole>("novice");
  const [signupStudentId, setSignupStudentId] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (!firestore) {
        throw new Error("Firestore not initialized");
      }

      let email = loginEmailOrUsername;

      // Check if input is an email (contains @) or username
      if (!loginEmailOrUsername.includes('@')) {
        // It's a username, look up the email
        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where('username', '==', loginEmailOrUsername));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          throw new Error("Username not found");
        }

        // Get the email from the first matching user
        const userDoc = querySnapshot.docs[0];
        email = userDoc.data().email;

        if (!email) {
          throw new Error("User account has no email associated");
        }
      }

      await login({ email, password: loginPassword });
    } catch (err: any) {
      setError(err.message || "Failed to log in");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Validate password length
    if (signupPassword.length < 6) {
      setError("Password must be at least 6 characters");
      setIsLoading(false);
      return;
    }

    // Validate email confirmation
    if (signupEmail !== signupEmailConfirm) {
      setError("Emails do not match");
      setIsLoading(false);
      return;
    }

    // Validate password confirmation
    if (signupPassword !== signupPasswordConfirm) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      await signUp({
        email: signupEmail,
        password: signupPassword,
        name: signupName,
        role: signupRole,
        studentId: signupStudentId,
      });
    } catch (err: any) {
      setError(err.message || "Failed to sign up");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2 text-primary">
              <Gavel size={32} />
              <span className="text-2xl font-headline font-bold">Debate Dashboard</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-headline">Welcome</CardTitle>
          <CardDescription>
            Sign in to your account or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email or Username</Label>
                  <Input
                    id="login-email"
                    type="text"
                    placeholder="you@example.com or username"
                    value={loginEmailOrUsername}
                    onChange={(e) => setLoginEmailOrUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <div className="text-sm text-destructive">{error}</div>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Logging in..." : "Log In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Your Name"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-student-id">Student ID</Label>
                  <Input
                    id="signup-student-id"
                    type="text"
                    placeholder="Your Student ID Number"
                    value={signupStudentId}
                    onChange={(e) => setSignupStudentId(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email-confirm">Confirm Email</Label>
                  <Input
                    id="signup-email-confirm"
                    type="email"
                    placeholder="you@example.com"
                    value={signupEmailConfirm}
                    onChange={(e) => setSignupEmailConfirm(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password (min. 6 characters)</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password-confirm">Confirm Password</Label>
                  <Input
                    id="signup-password-confirm"
                    type="password"
                    placeholder="••••••••"
                    value={signupPasswordConfirm}
                    onChange={(e) => setSignupPasswordConfirm(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-role">Role</Label>
                  <Select value={signupRole} onValueChange={(value) => setSignupRole(value as UserRole)}>
                    <SelectTrigger id="signup-role">
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="varsity">Varsity</SelectItem>
                      <SelectItem value="novice">Novice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {error && (
                  <div className="text-sm text-destructive">{error}</div>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating account..." : "Sign Up"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
