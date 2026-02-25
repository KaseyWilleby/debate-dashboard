'use client';
/**
 * @fileOverview Firebase Storage upload hooks and utilities
 */

import { useState, useCallback } from 'react';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject, UploadTaskSnapshot } from 'firebase/storage';
import { useFirebase } from '../index';
import type { DocumentAttachment } from '@/lib/types';

export interface UploadProgress {
  progress: number; // 0-100
  bytesTransferred: number;
  totalBytes: number;
  state: 'running' | 'paused' | 'success' | 'error';
}

export interface UseStorageUploadResult {
  uploadFile: (file: File, storagePath: string) => Promise<DocumentAttachment>;
  deleteFile: (storagePath: string) => Promise<void>;
  progress: UploadProgress | null;
  isUploading: boolean;
  error: Error | null;
}

/**
 * Hook for uploading files to Firebase Storage
 */
export function useStorageUpload(): UseStorageUploadResult {
  const { firebaseApp } = useFirebase();
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const uploadFile = useCallback(
    async (file: File, storagePath: string): Promise<DocumentAttachment> => {
      if (!firebaseApp) {
        throw new Error('Firebase app not initialized');
      }

      setIsUploading(true);
      setError(null);
      setProgress({
        progress: 0,
        bytesTransferred: 0,
        totalBytes: file.size,
        state: 'running',
      });

      try {
        const storage = getStorage(firebaseApp);
        const storageRef = ref(storage, storagePath);

        // Create upload task
        const uploadTask = uploadBytesResumable(storageRef, file);

        // Monitor upload progress
        const uploadPromise = new Promise<UploadTaskSnapshot>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progressPercent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setProgress({
                progress: progressPercent,
                bytesTransferred: snapshot.bytesTransferred,
                totalBytes: snapshot.totalBytes,
                state: 'running',
              });
            },
            (uploadError) => {
              reject(uploadError);
            },
            () => {
              resolve(uploadTask.snapshot);
            }
          );
        });

        const snapshot = await uploadPromise;

        // Get download URL
        const downloadUrl = await getDownloadURL(snapshot.ref);

        setProgress({
          progress: 100,
          bytesTransferred: file.size,
          totalBytes: file.size,
          state: 'success',
        });

        // Create document attachment object
        const attachment: DocumentAttachment = {
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type,
          size: file.size,
          storagePath,
          downloadUrl,
          uploadedBy: '', // Will be set by the caller
          uploadedAt: new Date().toISOString(),
        };

        return attachment;
      } catch (err) {
        const uploadError = err instanceof Error ? err : new Error('Upload failed');
        setError(uploadError);
        setProgress((prev) => prev ? { ...prev, state: 'error' } : null);
        throw uploadError;
      } finally {
        setIsUploading(false);
      }
    },
    [firebaseApp]
  );

  const deleteFile = useCallback(
    async (storagePath: string): Promise<void> => {
      if (!firebaseApp) {
        throw new Error('Firebase app not initialized');
      }

      try {
        const storage = getStorage(firebaseApp);
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);
      } catch (err) {
        const deleteError = err instanceof Error ? err : new Error('Delete failed');
        setError(deleteError);
        throw deleteError;
      }
    },
    [firebaseApp]
  );

  return {
    uploadFile,
    deleteFile,
    progress,
    isUploading,
    error,
  };
}
