"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Calendar as CalendarIcon, List, ChevronLeft, ChevronRight, ExternalLink, MapPin, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import type { Tournament } from "@/lib/types";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parse, isToday, isBefore, startOfDay } from "date-fns";
import NextLink from "next/link";
import { cn } from "@/lib/utils";

export default function TournamentCalendarPage({ params }: { params: { teamSlug: string } }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { firestore } = useFirebase();
  const [viewMode, setViewMode] = React.useState<'calendar' | 'list'>('calendar');
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  // Fetch tournaments from Firestore
  const tournamentsQuery = useMemoFirebase(() => {
    if (!firestore || !user || isAuthLoading) return null;
    return collection(firestore, 'tournaments');
  }, [firestore, user, isAuthLoading]);

  const { data: tournaments, isLoading: areTournamentsLoading } = useCollection<Tournament>(tournamentsQuery);
  const isLoading = isAuthLoading || areTournamentsLoading;

  // Filter only active (non-archived) tournaments
  const activeTournaments = React.useMemo(() => {
    if (!tournaments) return [];
    return tournaments.filter(t => !t.isArchived);
  }, [tournaments]);

  // Get tournaments for current month
  const monthTournaments = React.useMemo(() => {
    if (!activeTournaments) return [];
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    return activeTournaments.filter(tournament => {
      const tournamentDate = parse(tournament.date, 'yyyy-MM-dd', new Date());
      return tournamentDate >= monthStart && tournamentDate <= monthEnd;
    });
  }, [activeTournaments, currentMonth]);

  // Get all days in the current month view (including padding days)
  const calendarDays = React.useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDay = monthStart.getDay(); // 0 = Sunday

    // Get all days to display (start from previous month if needed)
    const daysToShow: Date[] = [];

    // Add padding days from previous month
    for (let i = startDay - 1; i >= 0; i--) {
      const day = new Date(monthStart);
      day.setDate(day.getDate() - (i + 1));
      daysToShow.push(day);
    }

    // Add days from current month
    const allDaysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    daysToShow.push(...allDaysInMonth);

    // Add padding days from next month to complete the grid
    const remainingDays = 42 - daysToShow.length; // 6 weeks * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const day = new Date(monthEnd);
      day.setDate(day.getDate() + i);
      daysToShow.push(day);
    }

    return daysToShow;
  }, [currentMonth]);

  // Get tournaments for a specific date
  const getTournamentsForDate = (date: Date) => {
    return activeTournaments.filter(tournament => {
      const tournamentDate = parse(tournament.date, 'yyyy-MM-dd', new Date());
      return isSameDay(tournamentDate, date);
    });
  };

  // Sort tournaments chronologically for list view
  const sortedTournaments = React.useMemo(() => {
    const today = startOfDay(new Date());
    const future: Tournament[] = [];
    const past: Tournament[] = [];

    activeTournaments.forEach(tournament => {
      const tournamentDate = parse(tournament.date, 'yyyy-MM-dd', new Date());
      if (isBefore(tournamentDate, today)) {
        past.push(tournament);
      } else {
        future.push(tournament);
      }
    });

    // Sort future tournaments by date (earliest first)
    future.sort((a, b) => {
      const dateA = parse(a.date, 'yyyy-MM-dd', new Date());
      const dateB = parse(b.date, 'yyyy-MM-dd', new Date());
      return dateA.getTime() - dateB.getTime();
    });

    // Sort past tournaments by date (most recent first)
    past.sort((a, b) => {
      const dateA = parse(a.date, 'yyyy-MM-dd', new Date());
      const dateB = parse(b.date, 'yyyy-MM-dd', new Date());
      return dateB.getTime() - dateA.getTime();
    });

    return [...future, ...past];
  }, [activeTournaments]);

  const handlePreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Tournament Calendar</h1>
          <p className="text-muted-foreground">
            View all your scheduled tournaments in calendar or list format.
          </p>
        </div>
        <div className="flex gap-2">
          <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as 'calendar' | 'list')}>
            <ToggleGroupItem value="calendar" aria-label="Calendar view">
              <CalendarIcon className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      ) : (
        <>
          {viewMode === 'calendar' ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-headline">
                    {format(currentMonth, 'MMMM yyyy')}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleToday}>
                      Today
                    </Button>
                    <Button variant="outline" size="sm" onClick={handlePreviousMonth}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleNextMonth}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  {monthTournaments.length} tournament{monthTournaments.length !== 1 ? 's' : ''} this month
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                  {/* Day headers */}
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div
                      key={day}
                      className="bg-muted p-2 text-center text-sm font-semibold text-muted-foreground"
                    >
                      {day}
                    </div>
                  ))}

                  {/* Calendar days */}
                  {calendarDays.map((day, index) => {
                    const dayTournaments = getTournamentsForDate(day);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isTodayDate = isToday(day);

                    return (
                      <div
                        key={index}
                        className={cn(
                          "min-h-[100px] bg-card p-2 flex flex-col",
                          !isCurrentMonth && "opacity-40",
                          isTodayDate && "bg-accent"
                        )}
                      >
                        <div className={cn(
                          "text-sm font-semibold mb-1",
                          isTodayDate && "text-accent-foreground"
                        )}>
                          {format(day, 'd')}
                        </div>
                        <div className="flex flex-col gap-1 overflow-hidden">
                          {dayTournaments.slice(0, 2).map((tournament) => (
                            <NextLink
                              key={tournament.id}
                              href={`/${params.teamSlug}/dashboard/tournaments/${tournament.id}`}
                              className="block"
                            >
                              <div className="text-xs bg-primary/10 text-primary hover:bg-primary/20 rounded px-1 py-0.5 truncate cursor-pointer transition-colors">
                                {tournament.name}
                              </div>
                            </NextLink>
                          ))}
                          {dayTournaments.length > 2 && (
                            <div className="text-xs text-muted-foreground">
                              +{dayTournaments.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sortedTournaments.length > 0 ? (
                sortedTournaments.map((tournament) => {
                  const tournamentDate = parse(tournament.date, 'yyyy-MM-dd', new Date());
                  const isPast = isBefore(tournamentDate, startOfDay(new Date()));

                  return (
                    <Card key={tournament.id} className={cn(isPast && "opacity-60")}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <CardTitle className="text-xl">{tournament.name}</CardTitle>
                              {isPast && (
                                <Badge variant="outline" className="text-xs">Past</Badge>
                              )}
                            </div>
                            <CardDescription className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4" />
                                <span>{format(tournamentDate, 'EEEE, MMMM d, yyyy')}</span>
                              </div>
                              {tournament.registrationCloseDate && (
                                <div className="text-sm">
                                  Registration closes: {format(parse(tournament.registrationCloseDate, 'yyyy-MM-dd', new Date()), 'MMMM d, yyyy')}
                                </div>
                              )}
                            </CardDescription>
                          </div>
                          <div className="flex gap-2">
                            {tournament.webpageUrl && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={tournament.webpageUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            <Button variant="default" size="sm" asChild>
                              <NextLink href={`/${params.teamSlug}/dashboard/tournaments/${tournament.id}`}>
                                View Details
                              </NextLink>
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      {tournament.notes && (
                        <CardContent>
                          <p className="text-sm text-muted-foreground">{tournament.notes}</p>
                        </CardContent>
                      )}
                    </Card>
                  );
                })
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Tournaments Scheduled</h3>
                    <p className="text-sm text-muted-foreground">
                      Check the Tournament Manager to add tournaments.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
