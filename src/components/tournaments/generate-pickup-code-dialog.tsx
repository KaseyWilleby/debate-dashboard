'use client';

import * as React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, query, where, updateDoc, doc } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, Copy, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { PickupCode, Tournament, User } from '@/lib/types';
import { generatePickupCode, getCodeExpirationTime } from '@/lib/pickup-utils';
import { format } from 'date-fns';

interface GeneratePickupCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament: Tournament | null;
  studentId?: string; // If provided, generate for specific student (parent view)
}

export function GeneratePickupCodeDialog({
  open,
  onOpenChange,
  tournament,
  studentId,
}: GeneratePickupCodeDialogProps) {
  const { user } = useAuth();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [selectedStudentId, setSelectedStudentId] = React.useState<string>(studentId || '');
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generatedCode, setGeneratedCode] = React.useState<string>('');
  const [copied, setCopied] = React.useState(false);

  // Fetch active pickup codes for this tournament
  const pickupCodesQuery = useMemoFirebase(() => {
    if (!firestore || !tournament || !user) return null;
    return query(
      collection(firestore, 'pickupCodes'),
      where('tournamentId', '==', tournament.id),
      where('active', '==', true)
    );
  }, [firestore, tournament, user]);

  const { data: pickupCodes, isLoading: codesLoading } = useCollection<PickupCode>(pickupCodesQuery);

  // Get students registered for this tournament
  const registeredStudents = React.useMemo(() => {
    if (!tournament) return [];
    const students: { id: string; name: string }[] = [];

    tournament.entries.forEach(entry => {
      students.push({ id: entry.id, name: entry.name });
    });

    return students;
  }, [tournament]);

  // Find existing code for selected student
  const existingCode = React.useMemo(() => {
    if (!selectedStudentId || !pickupCodes) return null;
    return pickupCodes.find(
      code => code.studentId === selectedStudentId && !code.used
    );
  }, [selectedStudentId, pickupCodes]);

  React.useEffect(() => {
    if (studentId) {
      setSelectedStudentId(studentId);
    }
  }, [studentId]);

  const handleGenerateCode = async () => {
    if (!firestore || !user || !tournament || !selectedStudentId) return;

    const student = registeredStudents.find(s => s.id === selectedStudentId);
    if (!student) return;

    setIsGenerating(true);

    try {
      const code = generatePickupCode();
      const expiresAt = getCodeExpirationTime(tournament.date);

      const pickupCodeData: Omit<PickupCode, 'id'> = {
        code,
        tournamentId: tournament.id,
        studentId: selectedStudentId,
        studentName: student.name,
        generatedBy: user.id,
        generatedByName: user.name,
        generatedAt: new Date().toISOString(),
        expiresAt,
        used: false,
        active: true,
      };

      await addDoc(collection(firestore, 'pickupCodes'), pickupCodeData);

      setGeneratedCode(code);
      toast({
        title: 'Pickup Code Generated',
        description: `Code ${code} created for ${student.name}`,
      });
    } catch (error) {
      console.error('Error generating pickup code:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate pickup code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeactivateCode = async (codeId: string) => {
    if (!firestore) return;

    try {
      await updateDoc(doc(firestore, 'pickupCodes', codeId), {
        active: false,
      });

      toast({
        title: 'Code Deactivated',
        description: 'The pickup code has been deactivated.',
      });
    } catch (error) {
      console.error('Error deactivating code:', error);
      toast({
        title: 'Error',
        description: 'Failed to deactivate code.',
        variant: 'destructive',
      });
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast({
      title: 'Code Copied',
      description: 'Pickup code copied to clipboard',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  if (!tournament) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Generate Pickup Code
          </DialogTitle>
          <DialogDescription>
            Create a secure code for safe student pickup at {tournament.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student Selection (only if not pre-selected) */}
          {!studentId && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Student</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
              >
                <option value="">Choose a student...</option>
                {registeredStudents.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Existing Code Display */}
          {existingCode && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Active Code:</span>
                    <Badge variant="outline" className="bg-white">
                      {existingCode.used ? 'Used' : 'Valid'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-md bg-white px-4 py-3 text-center text-2xl font-bold tracking-wider">
                      {existingCode.code}
                    </code>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleCopyCode(existingCode.code)}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Generated {format(new Date(existingCode.generatedAt), 'MMM d, h:mm a')}
                    <br />
                    Expires {format(new Date(existingCode.expiresAt), 'MMM d, h:mm a')}
                  </p>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleDeactivateCode(existingCode.id)}
                    >
                      Deactivate Code
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* New Code Display */}
          {generatedCode && !existingCode && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="text-center">
                    <p className="text-sm font-medium text-blue-900 mb-2">Your Pickup Code</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded-md bg-white px-4 py-3 text-center text-3xl font-bold tracking-wider text-blue-600">
                        {generatedCode}
                      </code>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleCopyCode(generatedCode)}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Important:</strong> Share this code only with the person who will pick up the student.
              The student will need to enter this code when signing out.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {!existingCode && (
            <Button
              onClick={handleGenerateCode}
              disabled={!selectedStudentId || isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Generate Code
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
