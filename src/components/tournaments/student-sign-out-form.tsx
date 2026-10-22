'use client';

import * as React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Camera, CheckCircle, XCircle, AlertTriangle, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Tournament, TournamentPickup, PickupCode } from '@/lib/types';
import { normalizePickupCode } from '@/lib/pickup-utils';

interface StudentSignOutFormProps {
  tournament: Tournament;
}

export function StudentSignOutForm({ tournament }: StudentSignOutFormProps) {
  const { user } = useAuth();
  const { firestore, storage } = useFirebase();
  const { toast } = useToast();

  const [pickupPersonName, setPickupPersonName] = React.useState('');
  const [pickupCode, setPickupCode] = React.useState('');
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [verificationStatus, setVerificationStatus] = React.useState<'pending' | 'verified' | 'unverified'>('pending');

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = React.useState(false);
  const streamRef = React.useRef<MediaStream | null>(null);

  // Check if student already signed out
  const pickupsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !tournament) return null;
    return query(
      collection(firestore, 'tournamentPickups'),
      where('tournamentId', '==', tournament.id),
      where('studentId', '==', user.id)
    );
  }, [firestore, user, tournament]);

  const { data: existingPickups } = useCollection<TournamentPickup>(pickupsQuery);
  const alreadySignedOut = existingPickups && existingPickups.length > 0;

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: 'Camera Error',
        description: 'Unable to access camera. Please check permissions.',
        variant: 'destructive',
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      canvas.toBlob(blob => {
        if (blob) {
          const file = new File([blob], 'pickup-photo.jpg', { type: 'image/jpeg' });
          setPhotoFile(file);
          setPhotoPreview(URL.createObjectURL(blob));
          stopCamera();
        }
      }, 'image/jpeg', 0.8);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firestore || !storage || !user) return;

    if (!pickupPersonName.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter the name of who is picking you up.',
        variant: 'destructive',
      });
      return;
    }

    if (!photoFile) {
      toast({
        title: 'Photo Required',
        description: 'Please take a photo with the person picking you up.',
        variant: 'destructive',
      });
      return;
    }

    if (!pickupCode.trim()) {
      toast({
        title: 'Code Required',
        description: 'Please enter the pickup code.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Verify pickup code
      const normalizedCode = normalizePickupCode(pickupCode);
      const codesRef = collection(firestore, 'pickupCodes');
      const codeQuery = query(
        codesRef,
        where('tournamentId', '==', tournament.id),
        where('studentId', '==', user.id),
        where('code', '==', normalizedCode),
        where('active', '==', true)
      );

      const codeSnapshot = await getDocs(codeQuery);
      const codeVerified = !codeSnapshot.empty && !codeSnapshot.docs[0].data().used;

      // Upload photo
      const timestamp = Date.now();
      const photoPath = `tournament-pickups/${tournament.id}/${user.id}/${timestamp}.jpg`;
      const storageRef = ref(storage, photoPath);
      await uploadBytes(storageRef, photoFile);
      const photoUrl = await getDownloadURL(storageRef);

      // Create pickup record
      const pickupData: Omit<TournamentPickup, 'id'> = {
        tournamentId: tournament.id,
        studentId: user.id,
        studentName: user.name,
        pickupPersonName: pickupPersonName.trim(),
        pickupPhotoUrl: photoUrl,
        pickupCode: normalizedCode,
        codeVerified,
        verificationStatus: codeVerified ? 'verified' : 'unverified',
        pickedUpAt: new Date().toISOString(),
        notes: '',
      };

      await addDoc(collection(firestore, 'tournamentPickups'), pickupData);

      setVerificationStatus(codeVerified ? 'verified' : 'unverified');

      toast({
        title: codeVerified ? 'Sign Out Complete' : 'Sign Out Recorded',
        description: codeVerified
          ? 'You have been successfully signed out.'
          : 'Sign out recorded but code verification failed. A coach will review.',
        variant: codeVerified ? 'default' : 'destructive',
      });

      // Reset form
      setPickupPersonName('');
      setPickupCode('');
      setPhotoFile(null);
      setPhotoPreview('');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete sign out. Please try again or see a coach.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  React.useEffect(() => {
    return () => {
      stopCamera();
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  if (alreadySignedOut) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-6 w-6" />
            Already Signed Out
          </CardTitle>
          <CardDescription>
            You have already signed out from this tournament. Have a safe trip home!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Tournament Sign Out</CardTitle>
        <CardDescription>
          Complete this form to safely sign out from {tournament.name}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Pickup Person Name */}
          <div className="space-y-2">
            <Label htmlFor="pickupPerson">Who is picking you up?</Label>
            <Input
              id="pickupPerson"
              value={pickupPersonName}
              onChange={(e) => setPickupPersonName(e.target.value)}
              placeholder="Enter their full name"
              required
            />
          </div>

          {/* Photo Capture */}
          <div className="space-y-2">
            <Label>Photo with Pickup Person</Label>
            <p className="text-sm text-muted-foreground">
              Take a photo together or upload one
            </p>

            {!photoPreview && !cameraActive && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={startCamera}
                  className="flex-1"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Use Camera
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  className="flex-1"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Photo
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            )}

            {cameraActive && (
              <div className="space-y-2">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded-lg border"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={capturePhoto}
                    className="flex-1"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Capture Photo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={stopCamera}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {photoPreview && (
              <div className="space-y-2">
                <img
                  src={photoPreview}
                  alt="Pickup photo"
                  className="w-full rounded-lg border"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview('');
                  }}
                >
                  Retake Photo
                </Button>
              </div>
            )}
          </div>

          {/* Pickup Code */}
          <div className="space-y-2">
            <Label htmlFor="pickupCode">Pickup Code</Label>
            <Input
              id="pickupCode"
              value={pickupCode}
              onChange={(e) => setPickupCode(e.target.value.toUpperCase())}
              placeholder="XXX-XXX"
              required
              className="text-lg font-mono tracking-wider"
              maxLength={7}
            />
            <p className="text-sm text-muted-foreground">
              Enter the code provided by your parent or guardian
            </p>
          </div>

          {/* Alert */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Important:</strong> Make sure you're with the person picking you up before submitting.
              The photo will be reviewed by coaches.
            </AlertDescription>
          </Alert>

          {/* Submit */}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing Out...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Complete Sign Out
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
