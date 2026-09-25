"use client";

import * as React from "react";
import { useAuth } from "@/contexts/auth-context";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { doc, updateDoc, collection } from "firebase/firestore";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings, Save } from "lucide-react";
import { Team } from "@/lib/types";
import { Separator } from "@/components/ui/separator";

export default function TeamOptionsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const params = useParams();
  const teamSlug = params?.teamSlug as string;
  const [isSaving, setIsSaving] = React.useState(false);

  // Fetch team data
  const teamsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'teams');
  }, [firestore, user]);
  const { data: teams } = useCollection<Team>(teamsQuery);
  const teamData = teams?.find(t => t.slug === teamSlug);

  // Permission states
  const [allowStudentDocketUpload, setAllowStudentDocketUpload] = React.useState(false);
  const [allowStudentBillCreation, setAllowStudentBillCreation] = React.useState(false);
  const [allowStudentVideoRecording, setAllowStudentVideoRecording] = React.useState(true);
  const [allowStudentAnalytics, setAllowStudentAnalytics] = React.useState(true);
  const [allowNoviceDebateEvents, setAllowNoviceDebateEvents] = React.useState(true);
  const [allowVarsityDebateEvents, setAllowVarsityDebateEvents] = React.useState(true);

  // Load current settings when team data is available
  React.useEffect(() => {
    if (teamData?.settings) {
      setAllowStudentDocketUpload(teamData.settings.allowStudentDocketUpload ?? false);
      setAllowStudentBillCreation(teamData.settings.allowStudentBillCreation ?? false);
      setAllowStudentVideoRecording(teamData.settings.allowStudentVideoRecording ?? true);
      setAllowStudentAnalytics(teamData.settings.allowStudentAnalytics ?? true);
      setAllowNoviceDebateEvents(teamData.settings.allowNoviceDebateEvents ?? true);
      setAllowVarsityDebateEvents(teamData.settings.allowVarsityDebateEvents ?? true);
    }
  }, [teamData]);

  const handleSaveSettings = async () => {
    if (!firestore || !teamData) return;

    setIsSaving(true);
    try {
      const teamRef = doc(firestore, 'teams', teamData.id);
      await updateDoc(teamRef, {
        'settings.allowStudentDocketUpload': allowStudentDocketUpload,
        'settings.allowStudentBillCreation': allowStudentBillCreation,
        'settings.allowStudentVideoRecording': allowStudentVideoRecording,
        'settings.allowStudentAnalytics': allowStudentAnalytics,
        'settings.allowNoviceDebateEvents': allowNoviceDebateEvents,
        'settings.allowVarsityDebateEvents': allowVarsityDebateEvents,
      });

      toast({
        title: "Settings Saved",
        description: "Team options have been updated successfully.",
      });
    } catch (error) {
      console.error("Error saving team settings:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save team settings. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Access control
  const isCoachOrAdmin = user?.role === 'coach' || user?.role === 'superadmin';

  if (!isCoachOrAdmin && !isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center h-96">
        <h3 className="text-xl font-semibold font-headline">Access Denied</h3>
        <p className="text-muted-foreground mt-2">
          You must be a coach or administrator to access team options.
        </p>
      </div>
    );
  }

  if (isAuthLoading || !teamData) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Team Options</h1>
        <p className="text-muted-foreground">
          Configure permissions and feature access for your team members.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Student Permissions
          </CardTitle>
          <CardDescription>
            Control what features students (Varsity and Novice) can access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="student-docket-upload">Allow Student Docket Upload</Label>
                <p className="text-sm text-muted-foreground">
                  Students can upload Congress dockets via PDF
                </p>
              </div>
              <Switch
                id="student-docket-upload"
                checked={allowStudentDocketUpload}
                onCheckedChange={setAllowStudentDocketUpload}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="student-bill-creation">Allow Student Bill Creation</Label>
                <p className="text-sm text-muted-foreground">
                  Students can create custom bills and resolutions
                </p>
              </div>
              <Switch
                id="student-bill-creation"
                checked={allowStudentBillCreation}
                onCheckedChange={setAllowStudentBillCreation}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="student-video-recording">Allow Student Video Recording</Label>
                <p className="text-sm text-muted-foreground">
                  Students can record practice speeches and rounds
                </p>
              </div>
              <Switch
                id="student-video-recording"
                checked={allowStudentVideoRecording}
                onCheckedChange={setAllowStudentVideoRecording}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="student-analytics">Allow Student Analytics Access</Label>
                <p className="text-sm text-muted-foreground">
                  Students can view their performance analytics and statistics
                </p>
              </div>
              <Switch
                id="student-analytics"
                checked={allowStudentAnalytics}
                onCheckedChange={setAllowStudentAnalytics}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="novice-debate-events">Allow Novice Debate Events Access</Label>
                <p className="text-sm text-muted-foreground">
                  Novice students can access debate practice events
                </p>
              </div>
              <Switch
                id="novice-debate-events"
                checked={allowNoviceDebateEvents}
                onCheckedChange={setAllowNoviceDebateEvents}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="varsity-debate-events">Allow Varsity Debate Events Access</Label>
                <p className="text-sm text-muted-foreground">
                  Varsity students can access debate practice events
                </p>
              </div>
              <Switch
                id="varsity-debate-events"
                checked={allowVarsityDebateEvents}
                onCheckedChange={setAllowVarsityDebateEvents}
              />
            </div>
          </div>

          <div className="pt-4">
            <Button onClick={handleSaveSettings} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
