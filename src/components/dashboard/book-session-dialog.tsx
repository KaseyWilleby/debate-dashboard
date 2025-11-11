"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import React from "react";
import type { Session, User } from "@/lib/types";

interface BookSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session;
  users: User[];
  currentUserId: string;
  onConfirmBooking: (partnerId?: string) => void;
}

export default function BookSessionDialog({
  open,
  onOpenChange,
  session,
  users,
  currentUserId,
  onConfirmBooking,
}: BookSessionDialogProps) {
  const [selectedPartnerId, setSelectedPartnerId] = React.useState<string | undefined>(undefined);

  const isPartneredFormat = session.debateFormat === 'PF' || session.debateFormat === 'CX';

  const handleConfirm = () => {
    onConfirmBooking(selectedPartnerId);
    setSelectedPartnerId(undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">Book Session</DialogTitle>
          <DialogDescription>
            {isPartneredFormat
              ? "This is a partnered debate format. You can optionally select a partner to join you."
              : "You are about to book this session."}
          </DialogDescription>
        </DialogHeader>

        {isPartneredFormat && (
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">
              Select Partner (Optional)
            </label>
            <Select
              value={selectedPartnerId}
              onValueChange={setSelectedPartnerId}
            >
              <SelectTrigger>
                <SelectValue placeholder="No partner (debate solo)" />
              </SelectTrigger>
              <SelectContent>
                {users
                  .filter(u => u.id !== currentUserId && u.id !== session.hostId)
                  .map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleConfirm}>
            Confirm Booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
