"use client";

import * as React from "react";
import { useAuth } from "@/contexts/auth-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Settings, Clock, Users } from "lucide-react";
import { WorkspaceManager } from "@/components/appointments/workspace-manager";
import { AppointmentWindowManager } from "@/components/appointments/appointment-window-manager";
import { OfficerAvailabilityManager } from "@/components/appointments/officer-availability-manager";
import { AppointmentBooking } from "@/components/appointments/appointment-booking";
import { MyAppointments } from "@/components/appointments/my-appointments";

export default function AppointmentsPage() {
  const { user } = useAuth();

  const isCoach = user?.role === 'coach' || user?.role === 'superadmin';
  const isOfficer = user?.role === 'officer';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Appointments</h1>
        <p className="text-muted-foreground">
          Schedule and manage appointments with coaches and officers
        </p>
      </div>

      <Tabs defaultValue="book" className="w-full">
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${isCoach ? 4 : isOfficer ? 3 : 2}, minmax(0, 1fr))` }}>
          <TabsTrigger value="book">
            <Calendar className="h-4 w-4 mr-2" />
            Book Appointment
          </TabsTrigger>
          <TabsTrigger value="my-appointments">
            <Clock className="h-4 w-4 mr-2" />
            My Appointments
          </TabsTrigger>
          {isOfficer && (
            <TabsTrigger value="availability">
              <Users className="h-4 w-4 mr-2" />
              My Availability
            </TabsTrigger>
          )}
          {isCoach && (
            <TabsTrigger value="manage">
              <Settings className="h-4 w-4 mr-2" />
              Manage System
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="book" className="mt-6">
          <AppointmentBooking />
        </TabsContent>

        <TabsContent value="my-appointments" className="mt-6">
          <MyAppointments />
        </TabsContent>

        {isOfficer && (
          <TabsContent value="availability" className="mt-6">
            <OfficerAvailabilityManager />
          </TabsContent>
        )}

        {isCoach && (
          <TabsContent value="manage" className="mt-6">
            <div className="space-y-6">
              <WorkspaceManager />
              <AppointmentWindowManager />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
