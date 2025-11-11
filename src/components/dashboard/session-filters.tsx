
"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { SessionStatus, User } from "@/lib/types";
import { format } from "date-fns";
import { Calendar as CalendarIcon, FilterX } from "lucide-react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Filters = {
  status: string;
  hostId: string;
  clientId: string;
  date: Date | undefined;
  showCancelled: boolean;
};

interface SessionFiltersProps {
  onFilterChange: (filters: Filters) => void;
  users: User[];
}

const sessionStatuses: SessionStatus[] = ["available", "booked", "completed", "cancelled"];

export function SessionFilters({ onFilterChange, users }: SessionFiltersProps) {
  const [filters, setFilters] = useState<Filters>({
    status: "all",
    hostId: "all",
    clientId: "all",
    date: undefined,
    showCancelled: false,
  });

  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const handleReset = () => {
    setFilters({ status: "all", hostId: "all", clientId: "all", date: undefined, showCancelled: false });
  }
  
  const varsityUsers = users.filter(u => u.role === 'varsity' || u.role === 'admin');
  const noviceUsers = users.filter(u => u.role === 'novice');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-lg">Filter Sessions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({...prev, status: value}))}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {sessionStatuses.map(status => (
                  <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.hostId} onValueChange={(value) => setFilters(prev => ({...prev, hostId: value}))}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by host..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Hosts</SelectItem>
                {varsityUsers.map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.clientId} onValueChange={(value) => setFilters(prev => ({...prev, clientId: value}))}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by client..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {noviceUsers.map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "justify-start text-left font-normal",
                    !filters.date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.date ? format(filters.date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.date}
                  onSelect={(date) => setFilters(prev => ({...prev, date: date || undefined}))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button variant="ghost" onClick={handleReset} className="flex items-center gap-2">
              <FilterX size={16} />
              Reset Filters
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showCancelled"
              checked={filters.showCancelled}
              onCheckedChange={(checked) => setFilters(prev => ({...prev, showCancelled: !!checked}))}
            />
            <Label
              htmlFor="showCancelled"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Show cancelled sessions
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
