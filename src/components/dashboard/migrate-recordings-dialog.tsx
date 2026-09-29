"use client";

import * as React from "react";
import { useFirebase } from "@/firebase";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/contexts/auth-context";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SavedSpeech } from "@/lib/types";

// Helper function to convert data URL to blob
const dataURLtoBlob = (dataURL: string): Blob => {
  const parts = dataURL.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'video/webm';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

const SAVED_SPEECHES_STORAGE_KEY = 'work-session-saved-speeches';

interface MigrateRecordingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MigrateRecordingsDialog({ open, onOpenChange }: MigrateRecordingsDialogProps) {
  const { user } = useAuth();
  const { firestore, storage } = useFirebase();
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
    if (!firestore || !storage || !user || localRecordings.length === 0) return;

    setIsMigrating(true);
    let successCount = 0;
    let errorCount = 0;

    for (const recording of localRecordings) {
      try {
        // Check if videoUrl is a blob URL (these are truly expired and cannot be recovered)
        const isBlobUrl = recording.videoUrl.startsWith('blob:');
        const isDataUrl = recording.videoUrl.startsWith('data:');

        if (isBlobUrl) {
          // Skip blob URLs as they're no longer accessible
          console.warn(`Skipping recording "${recording.topic}" - blob URL no longer accessible`);
          errorCount++;
          continue;
        }

        let videoUrl = recording.videoUrl;
        let storagePath = recording.storagePath;

        // If it's a data URL, convert to blob and upload to Storage
        if (isDataUrl) {
          try {
            console.log(`Migrating data URL for "${recording.topic}" to cloud storage...`);

            // Convert data URL to blob
            const blob = dataURLtoBlob(recording.videoUrl);

            // Upload to Firebase Storage
            const timestamp = Date.now();
            const fileName = `recordings/${user.id}/migrated-${timestamp}.webm`;
            const storageRef = ref(storage, fileName);

            await uploadBytes(storageRef, blob);
            videoUrl = await getDownloadURL(storageRef);
            storagePath = fileName;

            console.log(`Successfully uploaded "${recording.topic}" to cloud storage`);
          } catch (uploadError) {
            console.error(`Error uploading video for "${recording.topic}":`, uploadError);
            errorCount++;
            continue;
          }
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
          videoUrl: videoUrl,
          storagePath: storagePath,
          date: recording.date || new Date().toISOString(),
          sharedWith: recording.sharedWith || [],
          stance: recording.stance,
          billId: recording.billId,
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

    // Always clear localStorage after migration attempt to avoid repeated prompts
    localStorage.removeItem(SAVED_SPEECHES_STORAGE_KEY);

    if (successCount > 0) {
      toast({
        title: "Migration Complete",
        description: `Successfully migrated ${successCount} recording${successCount !== 1 ? 's' : ''} to cloud storage.`,
      });
    } else if (errorCount > 0) {
      toast({
        title: "Unable to Migrate Videos",
        description: "The video data has expired and cannot be recovered. Local storage has been cleared.",
        variant: "destructive",
      });
    }
  };

  const handleClearExpired = () => {
    localStorage.removeItem(SAVED_SPEECHES_STORAGE_KEY);
    toast({
      title: "Storage Cleared",
      description: "Expired local recordings have been removed.",
    });
    onOpenChange(false);
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

              {localRecordings.some(rec => rec.videoUrl.startsWith('blob:')) && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Some Videos Cannot Be Recovered</AlertTitle>
                  <AlertDescription>
                    <p className="mb-2">
                      Recordings with blob URLs have expired and cannot be recovered. Recordings with data URLs will be migrated to cloud storage.
                    </p>
                  </AlertDescription>
                </Alert>
              )}
              {localRecordings.some(rec => rec.videoUrl.startsWith('data:')) && (
                <Alert>
                  <Upload className="h-4 w-4" />
                  <AlertTitle>Uploading Videos to Cloud Storage</AlertTitle>
                  <AlertDescription>
                    Your videos will be uploaded to Firebase Storage and will be accessible from any device forever!
                  </AlertDescription>
                </Alert>
              )}

              <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
                <p className="text-sm font-medium mb-2">Recordings to migrate:</p>
                <ul className="text-sm space-y-1">
                  {localRecordings.map((rec, i) => {
                    const isBlob = rec.videoUrl.startsWith('blob:');
                    const isData = rec.videoUrl.startsWith('data:');
                    return (
                      <li key={i} className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isBlob ? 'bg-destructive' : 'bg-green-600'}`} />
                        <span className="truncate">{rec.topic || 'Untitled'} - {rec.mode}</span>
                        {isBlob && (
                          <span className="text-xs text-destructive">(expired - cannot recover)</span>
                        )}
                        {isData && (
                          <span className="text-xs text-green-600">(will upload to cloud)</span>
                        )}
                      </li>
                    );
                  })}
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

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!migrationComplete && localRecordings.length > 0 && localRecordings.every(rec => rec.videoUrl.startsWith('blob:')) ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleClearExpired}>
                Clear Expired Data
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {migrationComplete ? 'Close' : 'Cancel'}
              </Button>
              {!migrationComplete && localRecordings.length > 0 && (
                <Button onClick={handleMigrate} disabled={isMigrating}>
                  {isMigrating && <Loader2 className="mr-2 animate-spin h-4 w-4" />}
                  Migrate Recordings
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
