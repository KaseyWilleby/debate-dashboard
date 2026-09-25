
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import React from "react";
import type { User, UserRole, Team } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, addDoc, updateDoc, setDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { initiateEmailSignUp } from "@/firebase/non-blocking-login";
import { useAuth } from "@/contexts/auth-context";

const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  role: z.enum(['superadmin', 'coach', 'varsity', 'novice'], { required_error: "A role is required." }),
  teamId: z.string().min(1, "A team is required."),
  password: z.string().min(6, "Password must be at least 6 characters.").or(z.literal('')).optional(),
  studentId: z.string().optional(),
  recoveryPin: z.string().length(4, "PIN must be exactly 4 digits.").regex(/^\d+$/, "PIN must contain only numbers.").or(z.literal('')).optional(),
});

interface CreateUserDialogProps {
    children: React.ReactNode;
    userToEdit?: User;
}

export default function CreateUserDialog({ children, userToEdit }: CreateUserDialogProps) {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  const { firestore, auth } = useFirebase();
  const { user } = useAuth();

  // Fetch teams for superadmin
  const teamsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'teams');
  }, [firestore]);
  const { data: teams } = useCollection<Team>(teamsQuery);

  const isSuperAdmin = user?.role === 'superadmin';

  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: userToEdit ? {
        name: userToEdit.name,
        email: userToEdit.email,
        role: userToEdit.role,
        teamId: userToEdit.teamId,
        studentId: userToEdit.studentId || "",
        recoveryPin: userToEdit.recoveryPin || "",
    } : {
      name: "",
      email: "",
      role: "novice",
      teamId: isSuperAdmin ? "" : (user?.teamId || ""),
      password: "",
      studentId: "",
      recoveryPin: "",
    },
  });

  React.useEffect(() => {
    if (open) {
        form.reset(userToEdit ? {
            name: userToEdit.name,
            email: userToEdit.email,
            role: userToEdit.role,
            teamId: userToEdit.teamId,
            studentId: userToEdit.studentId || "",
            recoveryPin: userToEdit.recoveryPin || "",
        } : {
          name: "",
          email: "",
          role: "novice",
          teamId: isSuperAdmin ? "" : (user?.teamId || ""),
          password: "",
          studentId: "",
          recoveryPin: "",
        });
    }
  }, [open, form, userToEdit, isSuperAdmin, user?.teamId]);

  async function onSubmit(values: z.infer<typeof userSchema>) {
    console.log("=== onSubmit called ===");
    console.log("Form values:", values);

    if (!firestore || !auth) {
      console.error("Missing firestore or auth:", { firestore: !!firestore, auth: !!auth });
      return;
    }

    if (userToEdit) {
        const updatedUserData = {
            name: values.name,
            email: values.email,
            role: values.role as UserRole,
            teamId: values.teamId,
        };
        const userDocRef = doc(firestore, 'users', userToEdit.id);
        updateDoc(userDocRef, updatedUserData).catch(error => {
             errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'update',
                requestResourceData: updatedUserData,
            }));
        });
        toast({ title: "User Updated", description: `User ${values.name} has been updated.` });
    } else {
        if (!values.password) {
            form.setError("password", { message: "Password is required for new users."});
            return;
        }
        try {
            console.log("Calling API to create user...");
            // Use API route to create user without affecting current session
            const response = await fetch('/api/admin/create-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: values.email,
                    password: values.password,
                    name: values.name,
                    role: values.role,
                    teamId: values.teamId,
                    studentId: values.studentId,
                    recoveryPin: values.recoveryPin,
                }),
            });

            const data = await response.json();
            console.log("API response:", { ok: response.ok, status: response.status, data });

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create user');
            }

            console.log("User created successfully!");
            toast({ title: "User Created", description: `User ${values.name} has been created.` });
        } catch (error) {
            console.error("Error creating user:", error);
            toast({ variant: 'destructive', title: "Creation Failed", description: (error as Error).message });
            return; // Stop dialog from closing on failure
        }
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">{userToEdit ? 'Edit User' : 'Create New User'}</DialogTitle>
          <DialogDescription>
            {userToEdit ? 'Update the details for this user.' : 'Fill in the details to create a new user account.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. John Doe" /></FormControl>
                  <FormMessage />
                </FormItem>
            )} />
             <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. jdoe@example.com" type="email" readOnly={!!userToEdit} /></FormControl>
                  <FormMessage />
                </FormItem>
            )} />
             {!userToEdit && (
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl><Input {...field} type="password" /></FormControl>
                      <FormMessage />
                    </FormItem>
                )} />
             )}
            <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl>
                      <SelectContent>
                          {isSuperAdmin && <SelectItem value="superadmin">Superadmin</SelectItem>}
                          <SelectItem value="coach">Coach</SelectItem>
                          <SelectItem value="varsity">Varsity</SelectItem>
                          <SelectItem value="novice">Novice</SelectItem>
                      </SelectContent>
                  </Select>
                  {isSuperAdmin && field.value === 'coach' && (
                    <FormDescription>
                      Coaches have full access to manage their team including tournaments, results, and all tools
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
            )} />
            {(form.watch('role') === 'varsity' || form.watch('role') === 'novice') && (
              <>
                <FormField control={form.control} name="studentId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student ID</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. 123456" /></FormControl>
                    <FormDescription>
                      Student ID number for verification purposes
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="recoveryPin" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recovery PIN (Recommended)</FormLabel>
                    <FormControl><Input {...field} placeholder="4-digit PIN" maxLength={4} type="password" /></FormControl>
                    <FormDescription>
                      4-digit PIN for password recovery (helpful for students without email access)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              </>
            )}
            <FormField control={form.control} name="teamId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Team/School</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!isSuperAdmin}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select a team" /></SelectTrigger></FormControl>
                      <SelectContent>
                          {teams?.filter(t => !t.deleted && (isSuperAdmin || t.id === user?.teamId)).map(team => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.displayName || team.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                  {isSuperAdmin && (
                    <FormDescription>
                      Select which school/team this user belongs to
                    </FormDescription>
                  )}
                  {!isSuperAdmin && (
                    <FormDescription>
                      You can only create users for your own team
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
            )} />
             <DialogFooter className="pt-4">
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button
                  type="submit"
                  onClick={() => {
                    console.log("=== Button clicked ===");
                    console.log("Form errors:", form.formState.errors);
                    console.log("Form values:", form.getValues());
                    console.log("Is valid:", form.formState.isValid);
                  }}
                >
                  {userToEdit ? 'Save Changes' : 'Create User'}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
