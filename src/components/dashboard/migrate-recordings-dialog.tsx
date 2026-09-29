"use client";

import * as React from "react";
import { useFirebase } from "@/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/auth-context";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SavedSpeech } from "@/lib/types";

const SAVED_SPEECHES_STORAGE_KEY = 'work-session-saved-speeches';

interface MigrateRecordingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MigrateRecordingsDialog({ open, onOpenChange }: MigrateRecordingsDialogProps) {
  const { user } = useAuth();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [isMigrating, setIsMigrating] = React.useState(false);
  const [localRecordings, setLocalRecordings] = React.useState<SavedSpeech[]>([]);
  const [migrationComplete, setMigrationComplete] = React.useState(false);
  const [migratedCount, setMigratedCount] = React.useState(0);
  const [failedCount, setFailedCount] = React.useState(0);

  React.useEffect(() => {
    if (open && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(SAVED_SPEECHES_STORAGE_KEY);
        const recordings: SavedSpeech[] = stored ? JSON.parse(stored) : [];
        setLocalRecordings(recordings);
        setMigrationComplete(false);
        setMigratedCount(0);
        setFailedCount(0);
      } catch (e) {
        console.error("Error reading localStorage:", e);
        setLocalRecordings([]);
      }
    }
  }, [open]);

  const handleMigrate = async () => {
    if (!firestore || !user || localRecordings.length === 0) return;

    setIsMigrating(true);
    let successCount = 0;
    let errorCount = 0;

    for (const recording of localRecordings) {
      try {
        // Check if videoUrl is a blob URL (these are no longer valid)
        const isBlobUrl = recording.videoUrl.startsWith('blob:');

        if (isBlobUrl) {
          // Skip blob URLs as they're no longer accessible
          console.warn(`Skipping recording "${recording.topic}" - blob URL no longer accessible`);
          errorCount++;
          continue;
        }

        // Prepare recording data for Firestore
        const recordingData: Omit<SavedSpeech, 'id'> = {
          teamId: user.teamId || '',
          ownerId: recording.ownerId || user.id,
          topic: recording.topic,
          notes: recording.notes || '',
          prepTime: recording.prepTime || 0,
          speechTime: recording.speechTime,
          mode: recording.mode,
          videoUrl: recording.videoUrl,
          date: recording.date || new Date().toISOString(),
          sharedWith: recording.sharedWith || [],
          stance: recording.stance,
          billId: recording.billId,
          storagePath: recording.storagePath,
        };

        await addDoc(collection(firestore, 'savedSpeeches'), recordingData);
        successCount++;
      } catch (error) {
        console.error(`Error migrating recording "${recording.topic}":`, error);
        errorCount++;
      }
    }

    setMigratedCount(successCount);
    setFailedCount(errorCount);
    setMigrationComplete(true);
    setIsMigrating(false);

    if (successCount > 0) {
      // Clear localStorage after successful migration
      localStorage.removeItem(SAVED_SPEECHES_STORAGE_KEY);

      toast({
        title: "Migration Complete",
        description: `Successfully migrated ${successCount} recording${successCount !== 1 ? 's' : ''} to cloud storage.`,
      });
    } else {
      toast({
        title: "Migration Failed",
        description: "No recordings could be migrated. Old recordings may have expired video data.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Migrate Local Recordings to Cloud</DialogTitle>
          <DialogDescription>
            Transfer your locally stored practice recordings to cloud storage for access from any device.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {localRecordings.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Local Recordings Found</AlertTitle>
              <AlertDescription>
                No recordings found in local storage on this device. If you have recordings on another device,
                open this dialog there to migrate them.
              </AlertDescription>
            </Alert>
          ) : !migrationComplete ? (
            <>
              <Alert>
                <Upload className="h-4 w-4" />
                <AlertTitle>Ready to Migrate</AlertTitle>
                <AlertDescription>
                  Found <strong>{localRecordings.length}</strong> recording{localRecordings.length !== 1 ? 's' : ''} in local storage.
                </AlertDescription>
              </Alert>

              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Important Note</AlertTitle>
                <AlertDescription>
                  Recordings with temporary blob URLs (created before this update) may not have accessible video data.
                  Only recordings with valid data URLs will be migrated successfully.
                </AlertDescription>
              </Alert>

              <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
                <p className="text-sm font-medium mb-2">Recordings to migrate:</p>
                <ul className="text-sm space-y-1">
                  {localRecordings.map((rec, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      <span className="truncate">{rec.topic || 'Untitled'} - {rec.mode}</span>
                      {rec.videoUrl.startsWith('blob:') && (
                        <span className="text-xs text-destructive">(expired video)</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Migration Complete</AlertTitle>
              <AlertDescription>
                <p><strong>{migratedCount}</strong> recording{migratedCount !== 1 ? 's' : ''} successfully migrated to cloud storage.</p>
                {failedCount > 0 && (
                  <p className="mt-2 text-destructive">
                    <strong>{failedCount}</strong> recording{failedCount !== 1 ? 's' : ''} could not be migrated (expired video data).
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {migrationComplete ? 'Close' : 'Cancel'}
          </Button>
          {!migrationComplete && localRecordings.length > 0 && (
            <Button onClick={handleMigrate} disabled={isMigrating}>
              {isMigrating && <Loader2 className="mr-2 animate-spin h-4 w-4" />}
              Migrate Recordings
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
