"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Mail } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export default function PendingApprovalPage() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-yellow-100 dark:bg-yellow-900/30 p-4">
              <Clock className="h-12 w-12 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-headline">Account Pending Approval</CardTitle>
          <CardDescription>
            Your account is waiting to be approved by an administrator
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <p className="text-sm">
              <strong>Thank you for signing up, {user?.name}!</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Your account has been created successfully. However, all new accounts must be approved by Mr. Willeby before you can access the dashboard.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">What happens next?</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>An administrator will review your account</li>
              <li>You'll receive an email once approved</li>
              <li>Then you can log in and access all features</li>
            </ul>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3">
            <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              If you have questions, please contact Mr. Willeby
            </p>
          </div>

          <div className="pt-4">
            <Button variant="outline" className="w-full" onClick={logout}>
              Log Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
