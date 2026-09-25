
"use client";

import { useRef, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, UserPlus, Upload, Loader2, CheckCircle, XCircle, AlertTriangle, Archive, Trash2, Key } from "lucide-react";

import type { User, UserRole } from "@/lib/types";
import CreateUserDialog from "@/components/dashboard/create-user-dialog";
import { useToast } from "@/hooks/use-toast";
import { cn, getRoleBasedColor } from "@/lib/utils";
import { useFirebase } from "@/firebase";
import { useAuth } from "@/contexts/auth-context";
import { doc, deleteDoc, addDoc, collection, updateDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function UsersPageContent({ allUsers }: { allUsers: User[]}) {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation state
  const [showDeleteChoiceDialog, setShowDeleteChoiceDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showPermanentDeleteDialog, setShowPermanentDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Reset password state
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [userToResetPassword, setUserToResetPassword] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleDeleteClick = (user: User) => {
    // Prevent deletion of master account
    if (user.email?.toLowerCase() === 'kaseywilleby@gmail.com') {
      toast({
        title: "Cannot Delete Master Account",
        description: "This is the master superadmin account and cannot be deleted for security reasons.",
        variant: "destructive",
      });
      return;
    }

    setUserToDelete(user);
    setDeleteConfirmText("");
    setShowDeleteChoiceDialog(true);
  };

  const handleArchiveUser = async () => {
    if (!firestore || !userToDelete || !user) return;

    if (deleteConfirmText !== "Archive User") {
      toast({
        title: "Confirmation Failed",
        description: 'Please type "Archive User" exactly to confirm',
        variant: "destructive",
      });
      return;
    }

    try {
      // Soft delete - mark as deleted but keep in database
      await updateDoc(doc(firestore, 'users', userToDelete.id), {
        deleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: user.id,
      });

      toast({
        title: "User Archived",
        description: "The user has been archived and will no longer appear in the active users list."
      });

      setShowArchiveDialog(false);
      setUserToDelete(null);
      setDeleteConfirmText("");
    } catch (error) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `users/${userToDelete.id}`,
        operation: 'update',
      }));
      toast({
        title: "Archive Failed",
        description: "Failed to archive user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePermanentDelete = async () => {
    if (!firestore || !userToDelete) return;

    if (deleteConfirmText !== "Delete User") {
      toast({
        title: "Confirmation Failed",
        description: 'Please type "Delete User" exactly to confirm',
        variant: "destructive",
      });
      return;
    }

    try {
      // Hard delete - permanently remove from database
      await deleteDoc(doc(firestore, 'users', userToDelete.id));

      toast({
        title: "User Permanently Deleted",
        description: "The user has been permanently deleted from the database."
      });

      setShowPermanentDeleteDialog(false);
      setUserToDelete(null);
      setDeleteConfirmText("");
    } catch (error) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `users/${userToDelete.id}`,
        operation: 'delete',
      }));
      toast({
        title: "Delete Failed",
        description: "Failed to permanently delete user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleResetPasswordClick = (targetUser: User) => {
    setUserToResetPassword(targetUser);
    setNewPassword("");
    setConfirmPassword("");
    setShowResetPasswordDialog(true);
  };

  const handleResetPassword = async () => {
    if (!userToResetPassword) return;

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "The passwords you entered do not match.",
        variant: "destructive",
      });
      return;
    }

    // Validate password length
    if (newPassword.length < 6) {
      toast({
        title: "Invalid Password",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userToResetPassword.id,
          newPassword: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      toast({
        title: "Password Reset",
        description: `Password for ${userToResetPassword.name} has been reset successfully.`
      });

      setShowResetPasswordDialog(false);
      setUserToResetPassword(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error resetting password:", error);
      toast({
        title: "Reset Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleApproveUser = (userId: string) => {
    if (!firestore) return;
    updateDoc(doc(firestore, 'users', userId), { approved: true }).catch(error => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: `users/${userId}`,
          operation: 'update',
      }));
    });
    toast({ title: "User Approved", description: "The user can now access the dashboard." });
  };

  const handleRejectUser = (userId: string) => {
    if (!firestore) return;
    updateDoc(doc(firestore, 'users', userId), { approved: false }).catch(error => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: `users/${userId}`,
          operation: 'update',
      }));
    });
    toast({ title: "User Rejected", description: "The user's access has been revoked.", variant: "destructive" });
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !firestore) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      
      try {
        const lines = text.split('\n').filter(line => line.trim() !== '');
        const headers = lines[0].split(',').map(h => h.trim());
        
        if (headers[0] !== 'name' || headers[1] !== 'username' || headers[2] !== 'role') {
            throw new Error('Invalid CSV format. Headers must be name,username,role');
        }

        const usersCollection = collection(firestore, 'users');
        const importPromises = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const role = values[2] as UserRole;
          if (['admin', 'varsity', 'novice'].includes(role)) {
            const newUser = {
              name: values[0],
              username: values[1],
              role: role,
              avatarUrl: '',
            };
            importPromises.push(addDoc(usersCollection, newUser));
          }
        }
        
        await Promise.all(importPromises).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: 'users',
                operation: 'create',
                requestResourceData: "Multiple from CSV"
            }));
            // Re-throw to be caught by outer try-catch
            throw error;
        });

        toast({
          title: "Users Import Started",
          description: `Import process for ${lines.length - 1} users has begun.`,
        });

      } catch (error) {
        toast({
          variant: "destructive",
          title: "CSV Import Failed",
          description: (error as Error).message || "An unexpected error occurred during import.",
        });
      } finally {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };
  
  return (
    <div className="flex flex-col gap-6">
       <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">User Management</h1>
          <p className="text-muted-foreground">
            Create, view, and manage user accounts.
          </p>
        </div>
        <div className="flex gap-2">
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".csv"
                onChange={handleCsvUpload} 
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2" />
                Upload CSV
            </Button>
            <CreateUserDialog>
                <Button>
                    <UserPlus className="mr-2" />
                    Create User
                </Button>
            </CreateUserDialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            A list of all users in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(allUsers || []).filter(u => !u.deleted).map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className={cn(getRoleBasedColor(user.role))}>{user.name ? user.name.split(" ").map(n => n[0]).join("") : "?"}</AvatarFallback>
                      </Avatar>
                      <div className="font-medium">{user.name || "No Name"}</div>
                      <div className="text-sm text-muted-foreground">{user.email || "No Email"}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{user.studentId || "—"}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    {user.approved ? (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Approved
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-yellow-500 text-white">
                        <XCircle className="mr-1 h-3 w-3" />
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        {!user.approved && (
                          <DropdownMenuItem onClick={() => handleApproveUser(user.id)}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve User
                          </DropdownMenuItem>
                        )}
                        {user.approved && (
                          <DropdownMenuItem onClick={() => handleRejectUser(user.id)}>
                            <XCircle className="mr-2 h-4 w-4" />
                            Revoke Access
                          </DropdownMenuItem>
                        )}
                         <CreateUserDialog userToEdit={user}>
                             <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full">
                                Edit
                             </button>
                        </CreateUserDialog>
                        {(user.role === 'varsity' || user.role === 'novice') && (
                          <DropdownMenuItem onClick={() => handleResetPasswordClick(user)}>
                            <Key className="mr-2 h-4 w-4" />
                            Reset Password
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleDeleteClick(user)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
                {!allUsers || allUsers.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            No users found.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Choice Dialog - Archive or Permanently Delete */}
      <AlertDialog open={showDeleteChoiceDialog} onOpenChange={setShowDeleteChoiceDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete User: {userToDelete?.name}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Choose how you want to delete this user:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 py-4">
            {/* Archive Option */}
            <button
              onClick={() => {
                setShowDeleteChoiceDialog(false);
                setTimeout(() => setShowArchiveDialog(true), 100);
              }}
              className="text-left"
            >
              <Card className="border-2 hover:border-yellow-600 hover:shadow-md cursor-pointer transition-all">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Archive className="h-5 w-5 text-yellow-600" />
                    Archive User (Recommended)
                    <Badge variant="outline" className="ml-auto">Safer Option</Badge>
                  </CardTitle>
                  <CardDescription>
                    Hide the user from active lists while preserving all their data
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm">
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>User data is preserved in the database</li>
                    <li>Can be recovered by superadmins later</li>
                    <li>Historical records remain intact</li>
                    <li>Recommended for most cases</li>
                  </ul>
                </CardContent>
              </Card>
            </button>

            {/* Permanent Delete Option */}
            <button
              onClick={() => {
                setShowDeleteChoiceDialog(false);
                setTimeout(() => setShowPermanentDeleteDialog(true), 100);
              }}
              className="text-left"
            >
              <Card className="border-2 border-destructive/50 hover:border-destructive hover:shadow-md cursor-pointer transition-all bg-destructive/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-destructive">
                    <Trash2 className="h-5 w-5" />
                    Permanently Delete
                    <Badge variant="destructive" className="ml-auto">Cannot Undo</Badge>
                  </CardTitle>
                  <CardDescription className="text-destructive/90 font-medium">
                    Completely remove the user and all their data from the database
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm">
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li className="font-semibold text-destructive">All user data will be lost forever</li>
                    <li className="font-semibold text-destructive">This action CANNOT be undone</li>
                    <li>Historical records will be broken</li>
                    <li>Only use if absolutely necessary</li>
                  </ul>
                </CardContent>
              </Card>
            </button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteChoiceDialog(false);
              setDeleteConfirmText("");
              setUserToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-yellow-600" />
              Archive User
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will archive <span className="font-semibold text-foreground">{userToDelete?.name}</span>.
              The user will no longer appear in the active users list, but their data will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="confirm-archive">
              Type <span className="font-mono font-semibold">Archive User</span> to confirm:
            </Label>
            <Input
              id="confirm-archive"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Archive User"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowArchiveDialog(false);
              setDeleteConfirmText("");
              setUserToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={handleArchiveUser}
              disabled={deleteConfirmText !== "Archive User"}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Archive User
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Confirmation Dialog */}
      <AlertDialog open={showPermanentDeleteDialog} onOpenChange={setShowPermanentDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Permanently Delete User?
            </AlertDialogTitle>
            <AlertDialogDescription>
              WARNING: This will PERMANENTLY DELETE <span className="font-bold text-destructive">{userToDelete?.name}</span> from the database.
              This action CANNOT be undone! All user data, history, and records will be lost forever.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="confirm-permanent-delete">
              Type <span className="font-mono font-semibold">Delete User</span> to confirm permanent deletion:
            </Label>
            <Input
              id="confirm-permanent-delete"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Delete User"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowPermanentDeleteDialog(false);
              setDeleteConfirmText("");
              setUserToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={handlePermanentDelete}
              disabled={deleteConfirmText !== "Delete User"}
              variant="destructive"
            >
              Delete Forever
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <AlertDialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Reset Password for {userToResetPassword?.name}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Enter a new password for this user. The user will be able to log in with this new password immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowResetPasswordDialog(false);
              setUserToResetPassword(null);
              setNewPassword("");
              setConfirmPassword("");
            }}>
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={handleResetPassword}
              disabled={!newPassword || !confirmPassword || newPassword.length < 6}
            >
              Reset Password
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
