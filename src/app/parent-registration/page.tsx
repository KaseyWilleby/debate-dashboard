'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, UserPlus, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Team, School, User } from '@/lib/types';

export default function ParentRegistrationPage() {
  const router = useRouter();
  const { auth, firestore } = useFirebase();
  const { toast } = useToast();

  const [step, setStep] = React.useState<'team-code' | 'account-info' | 'link-students'>('team-code');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Step 1: Team Code
  const [teamCode, setTeamCode] = React.useState('');
  const [verifiedTeam, setVerifiedTeam] = React.useState<Team | null>(null);

  // Step 2: Account Info
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [phoneNumber, setPhoneNumber] = React.useState('');

  // Step 3: Link Students
  const [selectedSchoolId, setSelectedSchoolId] = React.useState('');
  const [selectedStudentIds, setSelectedStudentIds] = React.useState<string[]>([]);
  const [createdParentId, setCreatedParentId] = React.useState<string | null>(null);

  // Fetch schools for the verified team
  const schoolsQuery = useMemoFirebase(() => {
    if (!firestore || !verifiedTeam) return null;
    return query(
      collection(firestore, 'schools'),
      where('teamId', '==', verifiedTeam.id)
    );
  }, [firestore, verifiedTeam]);

  const { data: schools } = useCollection<School>(schoolsQuery);

  // Fetch students for the selected school
  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedSchoolId) return null;
    return query(
      collection(firestore, 'users'),
      where('schoolId', '==', selectedSchoolId),
      where('role', 'in', ['varsity', 'novice'])
    );
  }, [firestore, selectedSchoolId]);

  const { data: students } = useCollection<User>(studentsQuery);

  const handleVerifyTeamCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firestore) return;

    setIsSubmitting(true);

    try {
      const teamsRef = collection(firestore, 'teams');
      const teamQuery = query(teamsRef, where('code', '==', teamCode.toUpperCase()));
      const teamSnapshot = await getDocs(teamQuery);

      if (teamSnapshot.empty) {
        toast({
          title: 'Invalid Team Code',
          description: 'The team code you entered does not exist.',
          variant: 'destructive',
        });
        return;
      }

      const teamData = { id: teamSnapshot.docs[0].id, ...teamSnapshot.docs[0].data() } as Team;
      setVerifiedTeam(teamData);
      setStep('account-info');

      toast({
        title: 'Team Verified',
        description: `Successfully verified team: ${teamData.name}`,
      });
    } catch (error) {
      console.error('Error verifying team code:', error);
      toast({
        title: 'Error',
        description: 'Failed to verify team code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!auth || !firestore || !verifiedTeam) return;

    // Validation
    if (password !== confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'Passwords do not match.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Weak Password',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Create user document
      const userData: Omit<User, 'id'> = {
        name,
        email,
        role: 'parent',
        teamId: verifiedTeam.id,
        teamName: verifiedTeam.name,
        phoneNumber: phoneNumber || undefined,
        createdAt: new Date().toISOString(),
        childIds: [], // Will be populated in next step
      };

      const userRef = await addDoc(collection(firestore, 'users'), {
        ...userData,
        uid,
      });

      setCreatedParentId(userRef.id);
      setStep('link-students');

      toast({
        title: 'Account Created',
        description: 'Your parent account has been created successfully.',
      });
    } catch (error: any) {
      console.error('Error creating account:', error);

      let errorMessage = 'Failed to create account. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already in use.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      }

      toast({
        title: 'Registration Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLinkStudents = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firestore || !createdParentId || selectedStudentIds.length === 0) {
      toast({
        title: 'No Students Selected',
        description: 'Please select at least one student to link.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Update parent document with child IDs
      await updateDoc(doc(firestore, 'users', createdParentId), {
        childIds: selectedStudentIds,
        schoolId: selectedSchoolId,
      });

      // Update each student document with parent ID
      for (const studentId of selectedStudentIds) {
        await updateDoc(doc(firestore, 'users', studentId), {
          parentIds: arrayUnion(createdParentId),
        });
      }

      toast({
        title: 'Registration Complete',
        description: `Successfully linked to ${selectedStudentIds.length} student(s).`,
      });

      // Redirect to parent dashboard
      router.push('/parent-dashboard');
    } catch (error) {
      console.error('Error linking students:', error);
      toast({
        title: 'Error',
        description: 'Failed to link students. Please contact support.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  return (
    <div className="container max-w-2xl mx-auto py-12 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Parent Registration</h1>
        <p className="text-muted-foreground">
          Create an account to manage your student's tournament pickups and view their progress
        </p>
      </div>

      {/* Step 1: Team Code */}
      {step === 'team-code' && (
        <Card>
          <CardHeader>
            <CardTitle>Enter Team Code</CardTitle>
            <CardDescription>
              Enter your student's debate team code to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerifyTeamCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="teamCode">Team Code</Label>
                <Input
                  id="teamCode"
                  value={teamCode}
                  onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                  placeholder="Enter team code"
                  required
                  className="uppercase"
                />
                <p className="text-sm text-muted-foreground">
                  Ask your student or their coach for the team code
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting || !teamCode}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify Team Code
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Account Info */}
      {step === 'account-info' && verifiedTeam && (
        <Card>
          <CardHeader>
            <CardTitle>Create Your Account</CardTitle>
            <CardDescription>
              Team: {verifiedTeam.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('team-code')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create Account
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Link Students */}
      {step === 'link-students' && (
        <Card>
          <CardHeader>
            <CardTitle>Link Your Students</CardTitle>
            <CardDescription>
              Select your student(s) from the list below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLinkStudents} className="space-y-6">
              {/* School Selection */}
              <div className="space-y-2">
                <Label htmlFor="school">Select School</Label>
                <select
                  id="school"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedSchoolId}
                  onChange={(e) => {
                    setSelectedSchoolId(e.target.value);
                    setSelectedStudentIds([]);
                  }}
                  required
                >
                  <option value="">Choose a school...</option>
                  {schools?.map(school => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Student Selection */}
              {selectedSchoolId && (
                <div className="space-y-2">
                  <Label>Select Students</Label>
                  <div className="border rounded-md p-4 space-y-2 max-h-64 overflow-y-auto">
                    {students && students.length > 0 ? (
                      students.map(student => (
                        <label
                          key={student.id}
                          className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.includes(student.id)}
                            onChange={() => toggleStudentSelection(student.id)}
                            className="h-4 w-4"
                          />
                          <span>{student.name}</span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No students found at this school
                      </p>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selectedStudentIds.length} student(s) selected
                  </p>
                </div>
              )}

              {selectedStudentIds.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You will be able to view your linked students' tournament schedules,
                    generate pickup codes, and access their practice materials.
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || selectedStudentIds.length === 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Linking Students...
                  </>
                ) : (
                  <>
                    Complete Registration
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
