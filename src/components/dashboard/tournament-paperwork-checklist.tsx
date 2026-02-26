'use client';

import * as React from 'react';
import type { Tournament, ChecklistItem, DocumentAttachment, ChecklistItemType } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/auth-context';
import { useStorageUpload } from '@/firebase/storage/use-storage-upload';
import { FileText, Upload, Download, Trash2, CheckCircle, Circle, File } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TournamentPaperworkChecklistProps {
  tournament: Tournament;
  onUpdate: (tournament: Tournament) => void;
}

const DEFAULT_CHECKLIST_ITEMS: Omit<ChecklistItem, 'id' | 'attachmentIds'>[] = [
  { type: 'travel-request', label: 'Travel Request Form', completed: false, required: true, isOvernightOnly: false },
  { type: 'purchase-order', label: 'Purchase Order', completed: false, required: true, isOvernightOnly: false },
  { type: 'transfer-form', label: 'Transfer Form', completed: false, required: false, isOvernightOnly: false },
  { type: 'payment-received', label: 'Payment Received', completed: false, required: true, isOvernightOnly: false },
  { type: 'attendance-form', label: 'Attendance Form', completed: false, required: true, isOvernightOnly: false },
  { type: 'travel-card-request', label: 'Travel Card Request', completed: false, required: true, isOvernightOnly: true },
  { type: 'hotel-information', label: 'Hotel Information', completed: false, required: true, isOvernightOnly: true },
  { type: 'overnight-forms', label: 'Overnight Forms', completed: false, required: true, isOvernightOnly: true },
];

export default function TournamentPaperworkChecklist({
  tournament,
  onUpdate,
}: TournamentPaperworkChecklistProps) {
  const { user } = useAuth();
  const { uploadFile, deleteFile, progress, isUploading } = useStorageUpload();
  const [selectedItem, setSelectedItem] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Initialize checklist if it doesn't exist
  const checklist = tournament.paperwork?.checklist ||
    DEFAULT_CHECKLIST_ITEMS.map(item => ({
      ...item,
      id: crypto.randomUUID(),
      attachmentIds: [],
    }));

  const documents = tournament.paperwork?.documents || [];

  const handleChecklistToggle = (itemId: string) => {
    const updatedChecklist = checklist.map(item => {
      if (item.id === itemId) {
        const newCompleted = !item.completed;
        const updatedItem: ChecklistItem = {
          ...item,
          completed: newCompleted,
        };

        // Only set completedAt and completedBy if checking, remove them if unchecking
        if (newCompleted) {
          updatedItem.completedAt = new Date().toISOString();
          updatedItem.completedBy = user?.id;
        } else {
          // Remove the optional fields by not including them
          delete updatedItem.completedAt;
          delete updatedItem.completedBy;
        }

        return updatedItem;
      }
      return item;
    });

    onUpdate({
      ...tournament,
      paperwork: {
        checklist: updatedChecklist,
        documents,
      },
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>, itemId: string) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      // Generate storage path
      const storagePath = `tournaments/${tournament.id}/paperwork/${Date.now()}_${file.name}`;

      // Upload file
      const attachment = await uploadFile(file, storagePath);
      attachment.uploadedBy = user.id;
      attachment.checklistItemId = itemId;

      // Update tournament with new attachment
      const updatedDocuments = [...documents, attachment];
      const updatedChecklist = checklist.map(item =>
        item.id === itemId
          ? { ...item, attachmentIds: [...item.attachmentIds, attachment.id] }
          : item
      );

      onUpdate({
        ...tournament,
        paperwork: {
          checklist: updatedChecklist,
          documents: updatedDocuments,
        },
      });

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('File upload failed:', error);
      alert('Failed to upload file. Please try again.');
    }
  };

  const handleFileDelete = async (documentId: string, itemId: string) => {
    const doc = documents.find(d => d.id === documentId);
    if (!doc) return;

    if (!confirm(`Are you sure you want to delete ${doc.name}?`)) return;

    try {
      // Delete from storage
      await deleteFile(doc.storagePath);

      // Update tournament
      const updatedDocuments = documents.filter(d => d.id !== documentId);
      const updatedChecklist = checklist.map(item =>
        item.id === itemId
          ? { ...item, attachmentIds: item.attachmentIds.filter(id => id !== documentId) }
          : item
      );

      onUpdate({
        ...tournament,
        paperwork: {
          checklist: updatedChecklist,
          documents: updatedDocuments,
        },
      });
    } catch (error) {
      console.error('File delete failed:', error);
      alert('Failed to delete file. Please try again.');
    }
  };

  const completedCount = checklist.filter(item => item.completed).length;
  const totalCount = checklist.length;
  const progressPercent = (completedCount / totalCount) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="font-headline">Tournament Paperwork</CardTitle>
            <CardDescription>
              Track all paperwork and documents for this tournament
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold font-headline">
              {completedCount}/{totalCount}
            </div>
            <p className="text-sm text-muted-foreground">completed</p>
          </div>
        </div>
        <Progress value={progressPercent} className="mt-4" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {checklist.map((item) => {
            const itemDocuments = documents.filter(doc => item.attachmentIds.includes(doc.id));

            return (
              <div
                key={item.id}
                className={cn(
                  "border rounded-lg p-4 space-y-3",
                  item.completed && "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                )}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={item.completed}
                    onCheckedChange={() => handleChecklistToggle(item.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-medium",
                        item.completed && "line-through text-muted-foreground"
                      )}>
                        {item.label}
                      </span>
                      {item.required && (
                        <Badge variant="destructive" className="text-xs">Required</Badge>
                      )}
                      {item.isOvernightOnly && (
                        <Badge variant="secondary" className="text-xs">Overnight Only</Badge>
                      )}
                    </div>

                    {item.completed && item.completedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Completed on {format(new Date(item.completedAt), 'MMM d, yyyy')}
                      </p>
                    )}

                    {item.notes && (
                      <p className="text-sm text-muted-foreground mt-2">{item.notes}</p>
                    )}
                  </div>
                </div>

                {/* Document Attachments */}
                <div className="ml-8 space-y-2">
                  {itemDocuments.length > 0 && (
                    <div className="space-y-2">
                      {itemDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-2 bg-background border rounded"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <File className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{doc.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(doc.size / 1024).toFixed(1)} KB • {format(new Date(doc.uploadedAt), 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(doc.downloadUrl, '_blank')}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleFileDelete(doc.id, item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload Button */}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => handleFileSelect(e, item.id)}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedItem(item.id);
                        fileInputRef.current?.click();
                      }}
                      disabled={isUploading && selectedItem === item.id}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isUploading && selectedItem === item.id ? 'Uploading...' : 'Attach Document'}
                    </Button>
                    {isUploading && selectedItem === item.id && progress && (
                      <Progress value={progress.progress} className="mt-2" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
