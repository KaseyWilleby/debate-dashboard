"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function SeedAppointmentsPage() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleSeed = async () => {
    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch('/api/admin/seed-appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamId: 'cywoods' }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to seed collections');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold font-headline">Seed Appointment Collections</h1>
        <p className="text-muted-foreground">
          Initialize the Firestore appointment collections with sample data
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seed Collections</CardTitle>
          <CardDescription>
            This will create the following collections in Firestore:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>workspaces - Sample workspace for appointments</li>
              <li>appointmentWindows - Sample appointment window</li>
              <li>appointments - Empty collection (placeholder)</li>
              <li>officerAvailability - Empty collection (placeholder)</li>
            </ul>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleSeed}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Seeding Collections...
              </>
            ) : (
              'Seed Appointment Collections'
            )}
          </Button>

          {result && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="font-semibold mb-2">{result.message}</div>
                <div className="text-sm space-y-1">
                  <div>✅ Workspaces: {result.collections?.workspaces?.created || 0} created (ID: {result.collections?.workspaces?.id})</div>
                  <div>✅ Appointment Windows: {result.collections?.appointmentWindows?.created || 0} created (ID: {result.collections?.appointmentWindows?.id})</div>
                  <div>✅ Appointments: {result.collections?.appointments?.created || 0} created</div>
                  <div>✅ Officer Availability: {result.collections?.officerAvailability?.created || 0} created</div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold">Error</div>
                <div className="text-sm mt-1">{error}</div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            Click the button above to initialize the appointment collections in Firestore.
            This only needs to be done once when setting up the appointments feature.
          </p>
          <p className="text-muted-foreground">
            Note: If collections already exist, this will add duplicate data. Only run this
            if you haven't already seeded the collections.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
