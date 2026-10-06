"use client";

import * as React from "react";
import { useFirebase } from "@/firebase";
import { useAuth } from "@/contexts/auth-context";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export default function DebugFirebasePage() {
  const { firestore, firebaseApp } = useFirebase();
  const { user } = useAuth();
  const [results, setResults] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [serverResults, setServerResults] = React.useState<any>(null);

  const runClientTests = async () => {
    if (!firestore || !user) return;

    setIsLoading(true);
    const testResults: any = {
      firebaseConfig: {
        projectId: firebaseApp?.options.projectId,
        authDomain: firebaseApp?.options.authDomain,
        apiKey: firebaseApp?.options.apiKey?.substring(0, 10) + '...',
      },
      user: {
        uid: user.uid,
        email: user.email,
        teamId: user.teamId,
        role: user.role,
      },
      queries: {},
    };

    // Test each collection
    const collections = ['workspaces', 'appointmentWindows', 'appointments', 'officerAvailability'];

    for (const collectionName of collections) {
      try {
        const snapshot = await getDocs(query(collection(firestore, collectionName), limit(5)));
        testResults.queries[collectionName] = {
          success: true,
          count: snapshot.size,
          docs: snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })),
        };
      } catch (error: any) {
        testResults.queries[collectionName] = {
          success: false,
          error: error.message,
          code: error.code,
        };
      }
    }

    // Test team-specific query
    try {
      const snapshot = await getDocs(
        query(
          collection(firestore, 'workspaces'),
          where('teamId', '==', user.teamId),
          limit(5)
        )
      );
      testResults.queries.workspaces_team = {
        success: true,
        count: snapshot.size,
        docs: snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })),
      };
    } catch (error: any) {
      testResults.queries.workspaces_team = {
        success: false,
        error: error.message,
        code: error.code,
      };
    }

    setResults(testResults);
    setIsLoading(false);
  };

  const fetchServerResults = async () => {
    try {
      const response = await fetch('/api/debug/appointments');
      const data = await response.json();
      setServerResults(data);
    } catch (error: any) {
      setServerResults({ error: error.message });
    }
  };

  React.useEffect(() => {
    fetchServerResults();
  }, []);

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold font-headline">Firebase Debug</h1>
        <p className="text-muted-foreground">
          Diagnostic information for Firebase connection and permissions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client-Side Tests</CardTitle>
          <CardDescription>
            Tests run from the browser using the client Firebase SDK
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runClientTests} disabled={isLoading || !user}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Tests...
              </>
            ) : (
              'Run Client Tests'
            )}
          </Button>

          {results && (
            <pre className="mt-4 p-4 bg-muted rounded-lg text-xs overflow-auto max-h-96">
              {JSON.stringify(results, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Server-Side Tests</CardTitle>
          <CardDescription>
            Tests run from the server using Firebase Admin SDK
          </CardDescription>
        </CardHeader>
        <CardContent>
          {serverResults ? (
            <pre className="p-4 bg-muted rounded-lg text-xs overflow-auto max-h-96">
              {JSON.stringify(serverResults, null, 2)}
            </pre>
          ) : (
            <div className="flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading server results...
            </div>
          )}
        </CardContent>
      </Card>

      <Alert>
        <AlertDescription>
          <strong>What to look for:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
            <li>Check if projectId matches: debate-dashboard</li>
            <li>Compare client vs server query results</li>
            <li>Look for permission denied errors in client queries</li>
            <li>Verify user teamId is set correctly</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
