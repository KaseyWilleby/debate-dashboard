"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Gavel, Building2 } from "lucide-react";
import { UserRole, Team, Invoice } from "@/lib/types";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function LoginPage() {
  const { login, signUp, user, isLoading: authLoading } = useAuth();
  const { firestore } = useFirebase();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect to appropriate dashboard if user is already logged in
  useEffect(() => {
    if (!authLoading && user) {
      // Check superadmin FIRST before checking teamId
      if (user.role === 'superadmin') {
        router.push('/superadmin/dashboard');
      } else if (user.teamId) {
        // Check if user is approved
        if (!user.approved) {
          // Redirect to pending approval page
          router.push(`/${user.teamId}/dashboard/pending-approval`);
        } else {
          // Regular approved users go to their team dashboard
          router.push(`/${user.teamId}/dashboard/welcome`);
        }
      } else {
        // User doesn't have a teamId - this shouldn't happen for regular users
        console.error('User missing teamId:', user.id, user.email);
        setError('Your account is not properly configured. Please contact your coach or administrator.');
      }
    }
  }, [user, authLoading, router]);

  // Login form state
  const [loginEmailOrUsername, setLoginEmailOrUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Fetch all active teams for school selection
  const teamsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'teams'), where('isActive', '==', true));
  }, [firestore]);
  const { data: teams } = useCollection<Team>(teamsQuery);

  // Signup form state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupEmailConfirm, setSignupEmailConfirm] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupRole, setSignupRole] = useState<UserRole>("novice");
  const [signupStudentId, setSignupStudentId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  // School registration state
  const [schoolName, setSchoolName] = useState("");
  const [schoolSlug, setSchoolSlug] = useState("");
  const [schoolAddress, setSchoolAddress] = useState("");
  const [headCoachEmail, setHeadCoachEmail] = useState("");
  const [headCoachPassword, setHeadCoachPassword] = useState("");
  const [headCoachPasswordConfirm, setHeadCoachPasswordConfirm] = useState("");
  const [headCoachName, setHeadCoachName] = useState("");
  const [alternateCoachEmail, setAlternateCoachEmail] = useState("");

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

  // Helper function to generate slug from school name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  };

  // Helper function to validate school email
  const isSchoolEmail = (email: string): boolean => {
    const lowerEmail = email.toLowerCase();

    // Check for .edu domain
    if (lowerEmail.endsWith('.edu')) {
      return true;
    }

    // Check for .k12 domains
    if (lowerEmail.includes('.k12.')) {
      return true;
    }

    // Check for common school district patterns
    const schoolPatterns = [
      /\.sch\./,  // .sch. in domain
      /\.school\./,  // .school. in domain
      /@.*isd\./,  // Independent School District
      /@.*usd\./,  // Unified School District
      /\.academy$/,  // .academy domains
      /\.school$/,  // .school domains
    ];

    return schoolPatterns.some(pattern => pattern.test(lowerEmail));
  };

  // Check if email is from common personal providers
  const isPersonalEmail = (email: string): boolean => {
    const lowerEmail = email.toLowerCase();
    const personalDomains = [
      '@gmail.com',
      '@yahoo.com',
      '@hotmail.com',
      '@outlook.com',
      '@aol.com',
      '@icloud.com',
      '@protonmail.com',
      '@mail.com',
    ];

    return personalDomains.some(domain => lowerEmail.endsWith(domain));
  };

  // Auto-generate slug when school name changes
  useEffect(() => {
    if (schoolName) {
      setSchoolSlug(generateSlug(schoolName));
    }
  }, [schoolName]);

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

    // Validate school selection
    if (!selectedTeamId) {
      setError("Please select a school");
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
        teamId: selectedTeamId,
      });
    } catch (err: any) {
      setError(err.message || "Failed to sign up");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Validate school fields
    if (!schoolName || !schoolSlug || !schoolAddress) {
      setError("Please fill in all school information");
      setIsLoading(false);
      return;
    }

    // Validate head coach fields
    if (!headCoachName || !headCoachEmail) {
      setError("Please provide head coach name and email");
      setIsLoading(false);
      return;
    }

    // Validate head coach email is from school domain
    if (isPersonalEmail(headCoachEmail)) {
      setError("Please use your school email address, not a personal email (Gmail, Yahoo, etc.)");
      setIsLoading(false);
      return;
    }

    if (!isSchoolEmail(headCoachEmail)) {
      setError("Please use a school or educational institution email address (.edu, .k12, school district domain, etc.)");
      setIsLoading(false);
      return;
    }

    // Validate alternate coach email if provided
    if (alternateCoachEmail) {
      if (isPersonalEmail(alternateCoachEmail)) {
        setError("Alternate coach email must be a school email address, not a personal email");
        setIsLoading(false);
        return;
      }
      if (!isSchoolEmail(alternateCoachEmail)) {
        setError("Alternate coach email must be from a school or educational institution");
        setIsLoading(false);
        return;
      }
    }

    // Validate password length
    if (headCoachPassword.length < 6) {
      setError("Password must be at least 6 characters");
      setIsLoading(false);
      return;
    }

    // Validate password confirmation
    if (headCoachPassword !== headCoachPasswordConfirm) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(schoolSlug)) {
      setError("Subdomain can only contain lowercase letters, numbers, and hyphens");
      setIsLoading(false);
      return;
    }

    try {
      if (!firestore) {
        throw new Error("Firestore not initialized");
      }

      // Check if slug is already taken
      const teamsRef = collection(firestore, 'teams');
      const slugQuery = query(teamsRef, where('slug', '==', schoolSlug));
      const existingTeams = await getDocs(slugQuery);

      if (!existingTeams.empty) {
        setError("This subdomain is already taken. Please choose a different one.");
        setIsLoading(false);
        return;
      }

      // Generate invoice number
      const now = new Date();
      const year = now.getFullYear();
      const invoicesRef = collection(firestore, 'invoices');
      const yearInvoices = await getDocs(query(invoicesRef, where('invoiceNumber', '>=', `INV-${year}-`), where('invoiceNumber', '<', `INV-${year + 1}-`)));
      const invoiceCount = yearInvoices.size + 1;
      const invoiceNumber = `INV-${year}-${String(invoiceCount).padStart(3, '0')}`;

      // Calculate academic year (Sept-Aug)
      const currentMonth = now.getMonth(); // 0-11
      const academicYearStart = currentMonth >= 8 ? year : year - 1; // If Sept or later, current year; else previous year
      const academicYearEnd = academicYearStart + 1;
      const billingPeriod = `${academicYearStart}-${academicYearEnd} Academic Year`;

      // Create invoice due 30 days from now
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Create new team document
      const { addDoc } = await import('firebase/firestore');
      const newTeamRef = await addDoc(collection(firestore, 'teams'), {
        name: schoolName,
        slug: schoolSlug,
        displayName: schoolName,
        address: schoolAddress,
        createdAt: new Date().toISOString(),
        isActive: true,
        headCoachEmail: headCoachEmail,
        alternateCoachEmail: alternateCoachEmail || undefined,
        approved: false, // Requires superadmin approval
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        subscriptionStatus: 'trial',
      });

      // Create invoice for annual subscription
      const invoiceData: Omit<Invoice, 'id'> = {
        teamId: newTeamRef.id,
        invoiceNumber: invoiceNumber,
        amount: 250, // $250 annual subscription
        dueDate: dueDate.toISOString(),
        createdAt: now.toISOString(),
        status: 'pending',
        description: 'Annual Subscription - Debate Dashboard',
        billingPeriod: billingPeriod,
        payeeName: 'Kasey Willeby',
        payeeAddress: '19714 Redroot Dr. Houston TX 77084',
      };

      const invoiceRef = await addDoc(collection(firestore, 'invoices'), invoiceData);

      // Update team with invoice reference
      const { updateDoc, doc } = await import('firebase/firestore');
      await updateDoc(doc(firestore, 'teams', newTeamRef.id), {
        currentInvoiceId: invoiceRef.id,
      });

      // Create head coach account
      await signUp({
        email: headCoachEmail,
        password: headCoachPassword,
        name: headCoachName,
        role: 'coach',
        teamId: newTeamRef.id,
      });

      // Success message
      setError("School registered successfully! An invoice has been generated. Please wait for admin approval.");
    } catch (err: any) {
      setError(err.message || "Failed to register school");
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
              <TabsTrigger value="register-school">Register School</TabsTrigger>
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
                  <Label htmlFor="signup-school" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    School / Team
                  </Label>
                  <Select value={selectedTeamId} onValueChange={setSelectedTeamId} required>
                    <SelectTrigger id="signup-school">
                      <SelectValue placeholder="Select your school" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams?.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Don't see your school? Use the "Register School" tab.
                  </p>
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
                      <SelectItem value="coach">Coach</SelectItem>
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

            <TabsContent value="register-school">
              <form onSubmit={handleRegisterSchool} className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-3 mb-4">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Register your school to get started with a 30-day free trial.
                  </p>
                  <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                    <li>Must use official school/district email addresses</li>
                    <li>Registration requires admin approval</li>
                    <li>Trial begins after approval</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">School Information</h3>
                  <div className="space-y-2">
                    <Label htmlFor="school-name">School Name *</Label>
                    <Input
                      id="school-name"
                      type="text"
                      placeholder="e.g., Cypress Woods High School"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="school-slug">Subdomain (auto-generated) *</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="school-slug"
                        type="text"
                        placeholder="e.g., cypress-woods"
                        value={schoolSlug}
                        onChange={(e) => setSchoolSlug(e.target.value)}
                        pattern="[a-z0-9-]+"
                        required
                      />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">.app</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This will be your school's unique URL
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="school-address">School Address *</Label>
                    <Input
                      id="school-address"
                      type="text"
                      placeholder="123 Main St, City, State 12345"
                      value={schoolAddress}
                      onChange={(e) => setSchoolAddress(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t">
                  <h3 className="font-semibold text-sm">Head Coach Information</h3>
                  <div className="space-y-2">
                    <Label htmlFor="head-coach-name">Head Coach Name *</Label>
                    <Input
                      id="head-coach-name"
                      type="text"
                      placeholder="Coach Name"
                      value={headCoachName}
                      onChange={(e) => setHeadCoachName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="head-coach-email">Head Coach Email *</Label>
                    <Input
                      id="head-coach-email"
                      type="email"
                      placeholder="headcoach@school.edu"
                      value={headCoachEmail}
                      onChange={(e) => setHeadCoachEmail(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Must be a school/district email (.edu, .k12, etc.) - not a personal email
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="head-coach-password">Password (min. 6 characters) *</Label>
                    <Input
                      id="head-coach-password"
                      type="password"
                      placeholder="••••••••"
                      value={headCoachPassword}
                      onChange={(e) => setHeadCoachPassword(e.target.value)}
                      minLength={6}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="head-coach-password-confirm">Confirm Password *</Label>
                    <Input
                      id="head-coach-password-confirm"
                      type="password"
                      placeholder="••••••••"
                      value={headCoachPasswordConfirm}
                      onChange={(e) => setHeadCoachPasswordConfirm(e.target.value)}
                      minLength={6}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="alternate-coach-email">Alternate Coach Email (Optional)</Label>
                    <Input
                      id="alternate-coach-email"
                      type="email"
                      placeholder="assistant@school.edu"
                      value={alternateCoachEmail}
                      onChange={(e) => setAlternateCoachEmail(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Must be a school email if provided
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="text-sm text-destructive">{error}</div>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Registering school..." : "Register School"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
