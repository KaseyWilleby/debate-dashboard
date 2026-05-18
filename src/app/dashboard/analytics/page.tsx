"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Trophy,
  Clock,
  Target,
  Calendar,
  BarChart3,
  Award,
  Flame,
  Users,
  Video,
  Loader2
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { SavedSpeech, Tournament, TournamentResult, User } from "@/lib/types";
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316', '#84cc16'];

const PLACEMENT_POINTS: Record<string, number> = {
  'champion': 100,
  'finalist': 80,
  'semifinalist': 60,
  'quarterfinalist': 40,
  'octafinalist': 30,
  'double-octafinalist': 20,
  'speaker-award': 50,
  'top-speaker': 70,
  'preliminary-advancement': 10,
  'participated': 5,
  'other': 5
};

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { firestore } = useFirebase();
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);
  const [timeRange, setTimeRange] = React.useState<'month' | 'semester' | 'year' | 'all'>('semester');

  // Queries
  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);
  const { data: users } = useCollection<User>(usersQuery);

  const speechesQuery = useMemoFirebase(() => {
    if (!firestore || !selectedUserId) return null;
    return query(
      collection(firestore, 'savedSpeeches'),
      where('ownerId', '==', selectedUserId)
    );
  }, [firestore, selectedUserId]);
  const { data: speeches } = useCollection<SavedSpeech>(speechesQuery);

  const tournamentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'tournaments');
  }, [firestore]);
  const { data: tournaments } = useCollection<Tournament>(tournamentsQuery);

  const resultsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedUserId) return null;
    return query(
      collection(firestore, 'tournamentResults'),
      where('userId', '==', selectedUserId)
    );
  }, [firestore, selectedUserId]);
  const { data: results } = useCollection<TournamentResult>(resultsQuery);

  // Set default user
  React.useEffect(() => {
    if (user && !selectedUserId) {
      setSelectedUserId(user.id);
    }
  }, [user, selectedUserId]);

  // Filter data by time range
  const getDateCutoff = () => {
    const now = new Date();
    switch (timeRange) {
      case 'month': return subMonths(now, 1);
      case 'semester': return subMonths(now, 6);
      case 'year': return subMonths(now, 12);
      case 'all': return new Date(0);
    }
  };

  const filteredSpeeches = React.useMemo(() => {
    if (!speeches) return [];
    const cutoff = getDateCutoff();
    return speeches.filter(s => parseISO(s.date) >= cutoff);
  }, [speeches, timeRange]);

  const filteredResults = React.useMemo(() => {
    if (!results) return [];
    const cutoff = getDateCutoff();
    return results.filter(r => parseISO(r.date) >= cutoff);
  }, [results, timeRange]);

  const filteredTournaments = React.useMemo(() => {
    if (!tournaments || !selectedUserId) return [];
    const cutoff = getDateCutoff();
    return tournaments.filter(t => {
      const hasEntry = t.entries.some(e => e.id === selectedUserId);
      return hasEntry && parseISO(t.date) >= cutoff;
    });
  }, [tournaments, selectedUserId, timeRange]);

  // Calculate stats
  const stats = React.useMemo(() => {
    const totalPracticeTime = filteredSpeeches.reduce((sum, s) => sum + (s.speechTime || 0) + (s.prepTime || 0), 0);
    const totalSpeeches = filteredSpeeches.length;
    const totalTournaments = filteredTournaments.length;

    const placements = filteredResults.filter(r =>
      ['champion', 'finalist', 'semifinalist', 'quarterfinalist', 'octafinalist'].includes(r.placement)
    ).length;

    const speakerAwards = filteredResults.filter(r =>
      ['speaker-award', 'top-speaker'].includes(r.placement)
    ).length;

    const successPoints = filteredResults.reduce((sum, r) => sum + (PLACEMENT_POINTS[r.placement] || 0), 0);

    // Calculate streak (consecutive days with practice)
    const practiceDates = [...new Set(filteredSpeeches.map(s => s.date.split('T')[0]))].sort().reverse();
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < practiceDates.length; i++) {
      const practiceDate = new Date(practiceDates[i]);
      practiceDate.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor((today.getTime() - practiceDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === i) {
        currentStreak++;
      } else {
        break;
      }
    }

    return {
      totalPracticeTime: Math.round(totalPracticeTime / 60), // in minutes
      totalSpeeches,
      totalTournaments,
      placements,
      speakerAwards,
      successPoints,
      currentStreak
    };
  }, [filteredSpeeches, filteredTournaments, filteredResults]);

  // Practice by event type
  const practiceByEvent = React.useMemo(() => {
    const eventCounts: Record<string, number> = {};
    filteredSpeeches.forEach(s => {
      eventCounts[s.mode] = (eventCounts[s.mode] || 0) + 1;
    });

    return Object.entries(eventCounts)
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredSpeeches]);

  // Practice over time (monthly)
  const practiceOverTime = React.useMemo(() => {
    if (filteredSpeeches.length === 0) return [];

    const cutoff = getDateCutoff();
    const now = new Date();
    const months = eachMonthOfInterval({ start: cutoff, end: now });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const count = filteredSpeeches.filter(s => {
        const speechDate = parseISO(s.date);
        return speechDate >= monthStart && speechDate <= monthEnd;
      }).length;

      return {
        month: format(month, 'MMM yyyy'),
        count
      };
    });
  }, [filteredSpeeches, timeRange]);

  // Tournament performance
  const tournamentPerformance = React.useMemo(() => {
    return filteredResults.map(r => ({
      tournament: r.tournamentName,
      event: r.event,
      placement: r.placement,
      points: PLACEMENT_POINTS[r.placement] || 0,
      date: r.date
    })).sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [filteredResults]);

  const selectedUser = users?.find(u => u.id === selectedUserId);
  const canViewOthers = user?.role === 'admin';

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Track progress, practice time, and tournament performance.
          </p>
        </div>

        <div className="flex gap-2">
          {canViewOthers && users && (
            <Select value={selectedUserId || undefined} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} {u.role !== 'novice' && `(${u.role})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="semester">Last 6 Months</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedUser && (
        <div className="text-sm text-muted-foreground">
          Showing analytics for <span className="font-semibold text-foreground">{selectedUser.name}</span>
          {selectedUser.role !== 'novice' && ` (${selectedUser.role})`}
        </div>
      )}

      {/* Key Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Practice Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPracticeTime}m</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalSpeeches} speech{stats.totalSpeeches !== 1 ? 'es' : ''} recorded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tournaments</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTournaments}</div>
            <p className="text-xs text-muted-foreground">
              {stats.placements} placement{stats.placements !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Score</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successPoints}</div>
            <p className="text-xs text-muted-foreground">
              {stats.speakerAwards} speaker award{stats.speakerAwards !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Practice Streak</CardTitle>
            <Flame className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.currentStreak}</div>
            <p className="text-xs text-muted-foreground">
              consecutive day{stats.currentStreak !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="practice">Practice</TabsTrigger>
          <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Practice Over Time</CardTitle>
                <CardDescription>Monthly practice session count</CardDescription>
              </CardHeader>
              <CardContent>
                {practiceOverTime.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={practiceOverTime}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No practice data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Practice by Event</CardTitle>
                <CardDescription>Distribution of practice sessions</CardDescription>
              </CardHeader>
              <CardContent>
                {practiceByEvent.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={practiceByEvent}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ event, count }) => `${event}: ${count}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {practiceByEvent.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No practice data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="practice" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Practice Sessions</CardTitle>
              <CardDescription>Your latest recorded speeches</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredSpeeches.length > 0 ? (
                <div className="space-y-3">
                  {filteredSpeeches
                    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
                    .slice(0, 10)
                    .map(speech => (
                      <div key={speech.id} className="flex items-start justify-between p-3 rounded-lg border">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Video className="h-4 w-4 text-muted-foreground" />
                            <p className="font-medium">{speech.topic}</p>
                            <Badge variant="secondary">{speech.mode}</Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span>{format(parseISO(speech.date), 'MMM d, yyyy')}</span>
                            {speech.prepTime && <span>Prep: {Math.floor(speech.prepTime / 60)}m</span>}
                            <span>Speech: {Math.floor(speech.speechTime / 60)}m {speech.speechTime % 60}s</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Video className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No practice sessions recorded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tournaments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tournament Results</CardTitle>
              <CardDescription>Your competitive performance history</CardDescription>
            </CardHeader>
            <CardContent>
              {tournamentPerformance.length > 0 ? (
                <div className="space-y-3">
                  {tournamentPerformance.map((result, index) => (
                    <div key={index} className="flex items-start justify-between p-3 rounded-lg border">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium">{result.tournament}</p>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <Badge variant="secondary">{result.event}</Badge>
                          <Badge
                            variant={result.points >= 50 ? "default" : "outline"}
                            className={result.points >= 50 ? "bg-yellow-500 text-white" : ""}
                          >
                            {result.placement.replace('-', ' ')}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(parseISO(result.date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-muted-foreground">{result.points}</p>
                        <p className="text-xs text-muted-foreground">points</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Trophy className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No tournament results recorded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
