"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import { cn, getRoleBasedColor } from "@/lib/utils";
import { Loader2, Save } from "lucide-react";
import { useFirebase } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { user, isLoading } = useAuth();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || "");
  const [editedUsername, setEditedUsername] = useState(user?.username || "");
  const [editedStudentId, setEditedStudentId] = useState(user?.studentId || "");

  // Update local state when user changes
  useEffect(() => {
    if (user) {
      setEditedName(user.name || "");
      setEditedUsername(user.username || "");
      setEditedStudentId(user.studentId || "");
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center h-96">
        <h3 className="text-xl font-semibold font-headline">Not Logged In</h3>
        <p className="text-muted-foreground mt-2">
          Please log in to view settings.
        </p>
      </div>
    );
  }

  const initials = user.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase()
    : "?";

  const handleSave = async () => {
    if (!firestore || !user) return;

    setIsSaving(true);
    try {
      const userDocRef = doc(firestore, "users", user.id);
      const updateData: any = {
        name: editedName,
        username: editedUsername,
      };

      // Only include studentId for non-admin users
      if (user.role !== 'admin') {
        updateData.studentId = editedStudentId;
      }

      await updateDoc(userDocRef, updateData);

      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });

      setIsEditing(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedName(user.name || "");
    setEditedUsername(user.username || "");
    setEditedStudentId(user.studentId || "");
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your profile information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className={cn(getRoleBasedColor(user.role), "text-2xl")}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold">{user.name}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <p className="text-sm text-muted-foreground capitalize">Role: {user.role}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={isEditing ? editedName : user.name || ""}
                onChange={(e) => setEditedName(e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user.email || ""} disabled />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={isEditing ? editedUsername : user.username || ""}
                onChange={(e) => setEditedUsername(e.target.value)}
                disabled={!isEditing}
              />
            </div>
            {user.role !== 'admin' && (
              <div className="space-y-2">
                <Label htmlFor="studentId">Student ID</Label>
                <Input
                  id="studentId"
                  value={isEditing ? editedStudentId : user.studentId || ""}
                  onChange={(e) => setEditedStudentId(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Enter your student ID"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input id="role" value={user.role} disabled className="capitalize" />
              <p className="text-xs text-muted-foreground">Contact an administrator to change your role</p>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)}>
                Edit Profile
              </Button>
            ) : (
              <>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                  Cancel
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
