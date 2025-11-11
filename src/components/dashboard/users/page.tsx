
"use client";

import { useRef, useMemo } from "react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, UserPlus, Upload, Loader2, CheckCircle, XCircle } from "lucide-react";

import type { User, UserRole } from "@/lib/types";
import CreateUserDialog from "@/components/dashboard/create-user-dialog";
import { useToast } from "@/hooks/use-toast";
import { cn, getRoleBasedColor } from "@/lib/utils";
import { useFirebase } from "@/firebase";
import { doc, deleteDoc, addDoc, collection, updateDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function UsersPageContent({ allUsers }: { allUsers: User[]}) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUserDeleted = (userId: string) => {
    if (!firestore) return;
    deleteDoc(doc(firestore, 'users', userId)).catch(error => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: `users/${userId}`,
          operation: 'delete',
      }));
    });
    toast({ title: "User Deleted", description: "The user has been removed from the system." });
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
              {(allUsers || []).map((user) => (
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
                        <DropdownMenuItem onClick={() => handleUserDeleted(user.id)}>Delete</DropdownMenuItem>
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
    </div>
  );
}
