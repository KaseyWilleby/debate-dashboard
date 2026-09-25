"use client";

import { useAuth } from "@/contexts/auth-context";
import { useFirebase, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, DollarSign, Calendar, Building2, Loader2 } from "lucide-react";
import { Invoice } from "@/lib/types";

export default function InvoicePage() {
  const { user } = useAuth();
  const { firestore } = useFirebase();

  // Fetch team to get current invoice ID
  const teamDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.teamId) return null;
    return doc(firestore, 'teams', user.teamId);
  }, [firestore, user?.teamId]);
  const { data: team } = useDoc(teamDocRef);

  // Fetch invoice
  const invoiceDocRef = useMemoFirebase(() => {
    if (!firestore || !team?.currentInvoiceId) return null;
    return doc(firestore, 'invoices', team.currentInvoiceId);
  }, [firestore, team?.currentInvoiceId]);
  const { data: invoice, isLoading } = useDoc<Invoice>(invoiceDocRef);

  const handlePrint = () => {
    window.print();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'pending': return 'secondary';
      case 'overdue': return 'destructive';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Invoice Found</CardTitle>
          <CardDescription>There is no invoice associated with your account at this time.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const dueDate = new Date(invoice.dueDate);
  const createdDate = new Date(invoice.createdAt);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Invoice
          </h1>
          <p className="text-muted-foreground">
            Annual subscription invoice for your school
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Download className="mr-2 h-4 w-4" />
            Print / Download
          </Button>
        </div>
      </div>

      <Card className="max-w-4xl print:shadow-none">
        <CardHeader className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl mb-2">INVOICE</CardTitle>
              <div className="text-sm space-y-1 text-muted-foreground">
                <p className="font-mono font-semibold text-foreground">{invoice.invoiceNumber}</p>
                <p>Created: {createdDate.toLocaleDateString()}</p>
                <p>Due Date: {dueDate.toLocaleDateString()}</p>
              </div>
            </div>
            <Badge variant={getStatusColor(invoice.status)} className="text-sm px-3 py-1">
              {invoice.status.toUpperCase()}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-6 border-t">
            <div>
              <p className="text-sm font-semibold mb-2">Bill To:</p>
              <div className="text-sm space-y-1">
                <p className="font-medium">{team?.displayName}</p>
                {team?.address && <p className="text-muted-foreground">{team.address}</p>}
                {team?.headCoachEmail && <p className="text-muted-foreground">{team.headCoachEmail}</p>}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">Pay To:</p>
              <div className="text-sm space-y-1">
                <p className="font-medium">{invoice.payeeName}</p>
                <p className="text-muted-foreground">{invoice.payeeAddress}</p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Invoice Items */}
          <div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-4 font-semibold">Description</th>
                    <th className="text-left p-4 font-semibold">Period</th>
                    <th className="text-right p-4 font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="p-4">
                      <p className="font-medium">{invoice.description}</p>
                      <p className="text-sm text-muted-foreground">Full access to platform features</p>
                    </td>
                    <td className="p-4 text-muted-foreground">{invoice.billingPeriod}</td>
                    <td className="p-4 text-right font-semibold">${invoice.amount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>${invoice.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                <span>Total Due:</span>
                <span className="text-primary">${invoice.amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Instructions */}
          <div className="bg-muted rounded-lg p-4 mt-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Payment Instructions
            </h3>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Please make check payable to: <span className="font-semibold text-foreground">{invoice.payeeName}</span></p>
              <p>Mail payment to: <span className="font-semibold text-foreground">{invoice.payeeAddress}</span></p>
              <p className="pt-2">Include invoice number <span className="font-mono font-semibold text-foreground">{invoice.invoiceNumber}</span> on your payment.</p>
            </div>
          </div>

          {invoice.notes && (
            <div className="border-t pt-4">
              <p className="text-sm font-semibold mb-1">Notes:</p>
              <p className="text-sm text-muted-foreground">{invoice.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Info Cards */}
      <div className="grid gap-4 md:grid-cols-3 print:hidden">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amount Due</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${invoice.amount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {invoice.status === 'paid' ? 'Paid' : `Due ${dueDate.toLocaleDateString()}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Billing Period</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoice.billingPeriod.split(' ')[0]}</div>
            <p className="text-xs text-muted-foreground">Academic Year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">School</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">{team?.displayName}</div>
            <p className="text-xs text-muted-foreground">Registered</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
