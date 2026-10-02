"use client";

import * as React from "react";
import { useAuth } from "@/contexts/auth-context";
import { useFirebase } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AppointmentsTestPage() {
  const { user } = useAuth();
  const { firestore } = useFirebase();
  const [testResults, setTestResults] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const runTest = async () => {
    if (!firestore) {
      setTestResults(prev => [...prev, "❌ Firestore not initialized"]);
      return;
    }

    setIsLoading(true);
    setTestResults([]);

    try {
      // Test 1: Read workspaces
      setTestResults(prev => [...prev, "Testing workspaces collection..."]);
      const workspacesSnap = await getDocs(collection(firestore, 'workspaces'));
      setTestResults(prev => [...prev, `✅ Workspaces: Found ${workspacesSnap.size} documents`]);
    } catch (error: any) {
      setTestResults(prev => [...prev, `❌ Workspaces error: ${error.message}`]);
    }

    try {
      // Test 2: Read appointmentWindows
      setTestResults(prev => [...prev, "Testing appointmentWindows collection..."]);
      const windowsSnap = await getDocs(collection(firestore, 'appointmentWindows'));
      setTestResults(prev => [...prev, `✅ AppointmentWindows: Found ${windowsSnap.size} documents`]);
    } catch (error: any) {
      setTestResults(prev => [...prev, `❌ AppointmentWindows error: ${error.message}`]);
    }

    try {
      // Test 3: Read appointments
      setTestResults(prev => [...prev, "Testing appointments collection..."]);
      const appointmentsSnap = await getDocs(collection(firestore, 'appointments'));
      setTestResults(prev => [...prev, `✅ Appointments: Found ${appointmentsSnap.size} documents`]);
    } catch (error: any) {
      setTestResults(prev => [...prev, `❌ Appointments error: ${error.message}`]);
    }

    try {
      // Test 4: Read officerAvailability
      setTestResults(prev => [...prev, "Testing officerAvailability collection..."]);
      const availSnap = await getDocs(collection(firestore, 'officerAvailability'));
      setTestResults(prev => [...prev, `✅ OfficerAvailability: Found ${availSnap.size} documents`]);
    } catch (error: any) {
      setTestResults(prev => [...prev, `❌ OfficerAvailability error: ${error.message}`]);
    }

    setIsLoading(false);
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold font-headline">Appointments Permissions Test</h1>
        <p className="text-muted-foreground">
          Testing Firestore permissions for appointment collections
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm">
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Role:</strong> {user?.role}</p>
            <p><strong>Team ID:</strong> {user?.teamId}</p>
            <p><strong>User ID:</strong> {user?.id}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permission Tests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={runTest} disabled={isLoading || !firestore}>
            {isLoading ? "Running Tests..." : "Run Permission Tests"}
          </Button>

          {testResults.length > 0 && (
            <div className="space-y-1 text-sm font-mono bg-muted p-4 rounded">
              {testResults.map((result, i) => (
                <div key={i}>{result}</div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
