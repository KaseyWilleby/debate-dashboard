
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import React from "react";
import type { User, UserRole } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from "@/firebase";
import { collection, doc, addDoc, updateDoc, setDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { initiateEmailSignUp } from "@/firebase/non-blocking-login";
import { useAuth } from "@/contexts/auth-context";

const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  role: z.enum(['admin', 'varsity', 'novice'], { required_error: "A role is required." }),
  password: z.string().min(6, "Password must be at least 6 characters.").optional(),
});

interface CreateUserDialogProps {
    children: React.ReactNode;
    userToEdit?: User;
}

export default function CreateUserDialog({ children, userToEdit }: CreateUserDialogProps) {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  const { firestore, auth } = useFirebase();

  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: userToEdit ? {
        name: userToEdit.name,
        email: userToEdit.email,
        role: userToEdit.role,
    } : {
      name: "",
      email: "",
      role: "novice",
      password: "",
    },
  });
  
  React.useEffect(() => {
    if (open) {
        form.reset(userToEdit ? {
            name: userToEdit.name,
            email: userToEdit.email,
            role: userToEdit.role,
        } : {
          name: "",
          email: "",
          role: "novice",
          password: "",
        });
    }
  }, [open, form, userToEdit]);

  async function onSubmit(values: z.infer<typeof userSchema>) {
    if (!firestore || !auth) return;

    if (userToEdit) {
        const updatedUserData = {
            name: values.name,
            email: values.email,
            role: values.role as UserRole,
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
            await initiateEmailSignUp(auth, firestore, values.email, values.password, values.name, values.role as UserRole);
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
                          <SelectItem value="novice">Novice</SelectItem>
                          <SelectItem value="varsity">Varsity</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
            )} />
             <DialogFooter className="pt-4">
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">{userToEdit ? 'Save Changes' : 'Create User'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
