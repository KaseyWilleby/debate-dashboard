"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFirebase } from "@/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/auth-context";
import { Loader2 } from "lucide-react";

export default function AdminUpdateIdsPage() {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [result, setResult] = useState<string>("");

  const updateStudentIds = async () => {
    if (!firestore || user?.role !== 'admin') {
      setResult("Error: You must be an admin to run this operation.");
      return;
    }

    setIsUpdating(true);
    setResult("Fetching users...\n");

    try {
      const usersSnapshot = await getDocs(collection(firestore, 'users'));

      if (usersSnapshot.empty) {
        setResult("No users found.");
        setIsUpdating(false);
        return;
      }

      let varsityCount = 0;
      let noviceCount = 0;
      let adminCount = 0;
      let alreadyHasId = 0;
      let resultText = "Fetching users...\n\n";

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();

        // Skip if user already has a studentId
        if (userData.studentId) {
          alreadyHasId++;
          resultText += `⏭️ ${userData.name} already has studentId: ${userData.studentId}\n`;
          continue;
        }

        // Update based on role
        if (userData.role === 'varsity') {
          await updateDoc(doc(firestore, 'users', userDoc.id), { studentId: '1' });
          varsityCount++;
          resultText += `✅ Updated ${userData.name} (varsity) with studentId: 1\n`;
        } else if (userData.role === 'novice') {
          await updateDoc(doc(firestore, 'users', userDoc.id), { studentId: '2' });
          noviceCount++;
          resultText += `✅ Updated ${userData.name} (novice) with studentId: 2\n`;
        } else if (userData.role === 'admin') {
          adminCount++;
          resultText += `⏭️ Skipped ${userData.name} (admin) - no studentId needed\n`;
        }
      }

      resultText += `\n\n📊 Summary:\n`;
      resultText += `- Updated ${varsityCount} varsity users with studentId: 1\n`;
      resultText += `- Updated ${noviceCount} novice users with studentId: 2\n`;
      resultText += `- Skipped ${adminCount} admin users\n`;
      resultText += `- ${alreadyHasId} users already had studentIds\n`;

      setResult(resultText);
    } catch (error: any) {
      setResult(`Error: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You must be an admin to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Update Student IDs</CardTitle>
          <CardDescription>
            This will update all existing varsity and novice users with student IDs.
            Varsity = 1, Novice = 2
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={updateStudentIds} disabled={isUpdating}>
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isUpdating ? "Updating..." : "Run Update"}
          </Button>

          {result && (
            <div className="bg-muted p-4 rounded-md">
              <pre className="text-sm whitespace-pre-wrap font-mono">{result}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
