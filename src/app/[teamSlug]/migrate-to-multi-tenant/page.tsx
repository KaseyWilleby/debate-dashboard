"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFirebase } from "@/firebase";
import { collection, getDocs, doc, updateDoc, setDoc, writeBatch } from "firebase/firestore";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function MigrateToMultiTenantPage() {
  const { user } = useAuth();
  const { firestore } = useFirebase();
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runMigration = async () => {
    if (!firestore) {
      setError("Firestore not initialized");
      return;
    }

    if (user?.role !== 'superadmin' && user?.email !== 'kaseywilleby@gmail.com') {
      setError("Only superadmins can run this migration");
      return;
    }

    setIsRunning(true);
    setLogs([]);
    setError(null);
    setSuccess(false);

    try {
      addLog("Starting migration to multi-tenant architecture...");

      // Step 1: Create Cypress Woods team
      addLog("Creating Cypress Woods team...");
      const cyWoodsTeam = {
        id: "cywoods",
        name: "Cypress Woods",
        slug: "cywoods",
        displayName: "Cypress Woods High School",
        createdAt: new Date().toISOString(),
        settings: {
          primaryColor: "#1e40af",
          secondaryColor: "#7c3aed",
        },
        isActive: true,
      };
      await setDoc(doc(firestore, "teams", "cywoods"), cyWoodsTeam);
      addLog("✓ Created Cypress Woods team");

      // Step 2: Update all users to have teamId
      addLog("Updating user documents...");
      const usersSnapshot = await getDocs(collection(firestore, "users"));
      let userCount = 0;
      const userBatch = writeBatch(firestore);

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();

        // Update role for kaseywilleby@gmail.com to superadmin
        const updates: any = { teamId: "cywoods" };

        if (userData.email?.toLowerCase() === 'kaseywilleby@gmail.com') {
          updates.role = 'superadmin';
          updates.approved = true;
          addLog(`  - Updating ${userData.email} to superadmin`);
        } else if (userData.role === 'admin') {
          // Convert old admin to coach
          updates.role = 'coach';
          updates.approved = true;
          addLog(`  - Converting admin ${userData.email} to coach`);
        }

        userBatch.update(doc(firestore, "users", userDoc.id), updates);
        userCount++;

        // Firestore batches are limited to 500 operations
        if (userCount % 500 === 0) {
          await userBatch.commit();
          addLog(`  - Committed batch of ${userCount} users`);
        }
      }

      if (userCount % 500 !== 0) {
        await userBatch.commit();
      }
      addLog(`✓ Updated ${userCount} users`);

      // Step 3: Update all tournaments
      addLog("Updating tournament documents...");
      const tournamentsSnapshot = await getDocs(collection(firestore, "tournaments"));
      let tournamentCount = 0;

      for (const tournamentDoc of tournamentsSnapshot.docs) {
        await updateDoc(doc(firestore, "tournaments", tournamentDoc.id), {
          teamId: "cywoods"
        });
        tournamentCount++;
      }
      addLog(`✓ Updated ${tournamentCount} tournaments`);

      // Step 4: Update all sessions
      addLog("Updating session documents...");
      const sessionsSnapshot = await getDocs(collection(firestore, "sessions"));
      let sessionCount = 0;

      for (const sessionDoc of sessionsSnapshot.docs) {
        await updateDoc(doc(firestore, "sessions", sessionDoc.id), {
          teamId: "cywoods"
        });
        sessionCount++;
      }
      addLog(`✓ Updated ${sessionCount} sessions`);

      // Step 5: Update all saved speeches
      addLog("Updating saved speech documents...");
      const speechesSnapshot = await getDocs(collection(firestore, "savedSpeeches"));
      let speechCount = 0;

      for (const speechDoc of speechesSnapshot.docs) {
        await updateDoc(doc(firestore, "savedSpeeches", speechDoc.id), {
          teamId: "cywoods"
        });
        speechCount++;
      }
      addLog(`✓ Updated ${speechCount} saved speeches`);

      // Step 6: Update all written speeches
      addLog("Updating written speech documents...");
      const writtenSpeechesSnapshot = await getDocs(collection(firestore, "writtenSpeeches"));
      let writtenSpeechCount = 0;

      for (const speechDoc of writtenSpeechesSnapshot.docs) {
        await updateDoc(doc(firestore, "writtenSpeeches", speechDoc.id), {
          teamId: "cywoods"
        });
        writtenSpeechCount++;
      }
      addLog(`✓ Updated ${writtenSpeechCount} written speeches`);

      // Step 7: Update all debate cases
      addLog("Updating debate case documents...");
      const casesSnapshot = await getDocs(collection(firestore, "debateCases"));
      let caseCount = 0;

      for (const caseDoc of casesSnapshot.docs) {
        await updateDoc(doc(firestore, "debateCases", caseDoc.id), {
          teamId: "cywoods"
        });
        caseCount++;
      }
      addLog(`✓ Updated ${caseCount} debate cases`);

      // Step 8: Update all debate topics
      addLog("Updating debate topic documents...");
      const topicsSnapshot = await getDocs(collection(firestore, "debateTopics"));
      let topicCount = 0;

      for (const topicDoc of topicsSnapshot.docs) {
        await updateDoc(doc(firestore, "debateTopics", topicDoc.id), {
          teamId: "cywoods"
        });
        topicCount++;
      }
      addLog(`✓ Updated ${topicCount} debate topics`);

      // Step 9: Update all practice rounds
      addLog("Updating practice round documents...");
      const roundsSnapshot = await getDocs(collection(firestore, "practiceRounds"));
      let roundCount = 0;

      for (const roundDoc of roundsSnapshot.docs) {
        await updateDoc(doc(firestore, "practiceRounds", roundDoc.id), {
          teamId: "cywoods"
        });
        roundCount++;
      }
      addLog(`✓ Updated ${roundCount} practice rounds`);

      // Step 10: Update all tournament results
      addLog("Updating tournament result documents...");
      const resultsSnapshot = await getDocs(collection(firestore, "tournamentResults"));
      let resultCount = 0;

      for (const resultDoc of resultsSnapshot.docs) {
        await updateDoc(doc(firestore, "tournamentResults", resultDoc.id), {
          teamId: "cywoods"
        });
        resultCount++;
      }
      addLog(`✓ Updated ${resultCount} tournament results`);

      // Step 11: Update all congress dockets
      addLog("Updating congress docket documents...");
      const docketsSnapshot = await getDocs(collection(firestore, "congressDockets"));
      let docketCount = 0;

      for (const docketDoc of docketsSnapshot.docs) {
        await updateDoc(doc(firestore, "congressDockets", docketDoc.id), {
          teamId: "cywoods"
        });
        docketCount++;
      }
      addLog(`✓ Updated ${docketCount} congress dockets`);

      addLog("✓✓✓ Migration completed successfully! ✓✓✓");
      addLog("All existing data has been migrated to the Cypress Woods team.");
      addLog("You can now access the dashboard at /cywoods/dashboard");
      setSuccess(true);

    } catch (err: any) {
      console.error("Migration error:", err);
      setError(err.message || "Migration failed");
      addLog(`✗ ERROR: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  if (user?.role !== 'superadmin' && user?.email !== 'kaseywilleby@gmail.com') {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Only superadmins can access this page</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Multi-Tenant Migration</CardTitle>
          <CardDescription>
            This will migrate all existing data to the multi-tenant architecture.
            This should only be run ONCE.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900">Warning</h3>
                <p className="text-sm text-yellow-800">
                  This migration will update ALL documents in your Firestore database.
                  Make sure you have a backup before proceeding.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">What this migration does:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>Creates a "Cypress Woods" team</li>
              <li>Updates all users with teamId: "cywoods"</li>
              <li>Updates kaseywilleby@gmail.com to superadmin role</li>
              <li>Converts old admin users to coach role</li>
              <li>Updates all tournaments, sessions, speeches, cases, topics, and results with teamId</li>
            </ul>
          </div>

          <Button
            onClick={runMigration}
            disabled={isRunning || success}
            className="w-full"
            variant={success ? "outline" : "default"}
          >
            {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {success && <CheckCircle className="mr-2 h-4 w-4 text-green-600" />}
            {isRunning ? "Running Migration..." : success ? "Migration Completed" : "Run Migration"}
          </Button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
              <strong>Error:</strong> {error}
            </div>
          )}

          {logs.length > 0 && (
            <div className="bg-gray-50 border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Migration Log:</h3>
              <div className="space-y-1 font-mono text-xs max-h-96 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className={log.includes('✓') ? 'text-green-600' : log.includes('✗') ? 'text-red-600' : 'text-gray-600'}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
