"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TournamentResult, RoundBallot } from "@/lib/types";
import { ChevronDown, ChevronUp } from "lucide-react";
import { format, parseISO } from "date-fns";

/**
 * Component for displaying a tournament result with expandable round details
 */
export function ResultCard({
  result,
  showStudentName = false
}: {
  result: TournamentResult;
  showStudentName?: boolean;
}) {
  const [showRounds, setShowRounds] = React.useState(false);
  const [selectedRound, setSelectedRound] = React.useState<RoundBallot | null>(null);

  const hasRounds = (result.preliminaryRounds && result.preliminaryRounds.length > 0) ||
                    (result.eliminationRounds && result.eliminationRounds.length > 0);

  // Determine if this is a debate event (has speaker points) or speech/other event (has rankings)
  // Debate events: CX, CCX, VCX, NCX, LD, VLD, CLD, NLD, PF, NPF, VPF, CPF, WSD
  // Speech events: HI, DI, DUO, DA, PR, PO, DX, USX, FX, IX, INFO, OO, POI, SC, CD
  const isDebateEvent = /^(CCX|VCX|NCX|CX|VLD|CLD|NLD|LD|NPF|VPF|CPF|PF|WSD)$/i.test(result.event);
  const isSpeechEvent = !isDebateEvent; // Everything else has rankings instead of speaker points

  // Remove F1/F2 side indicators from round names
  const cleanRoundName = (roundName: string) => {
    return roundName.replace(/\s*F[12]\s*$/i, '').trim();
  };

  // Extract short round names for badges
  const getShortRoundName = (roundName: string) => {
    const cleaned = cleanRoundName(roundName);
    if (/trips/i.test(cleaned)) return 'Trips';
    if (/double.*octas/i.test(cleaned)) return 'Double Octos';
    if (/octas/i.test(cleaned)) return 'Octos';
    if (/quarters/i.test(cleaned)) return 'Quarters';
    if (/semis/i.test(cleaned)) return 'Semis';
    if (/finals/i.test(cleaned)) return 'Finals';
    return cleaned;
  };

  const getPlacementColor = (placement: string) => {
    if (placement === 'champion') return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-300';
    if (placement === 'finalist') return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300';
    if (placement === 'semifinalist' || placement === 'quarterfinalist') return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 border-orange-300';
    return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-300';
  };

  return (
    <Card className={`border-2 ${getPlacementColor(result.placement)}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">
              {showStudentName && result.studentName && (
                <span className="text-muted-foreground">{result.studentName} - </span>
              )}
              {result.event}
            </CardTitle>
            <CardDescription>
              {result.tournamentName} - {format(parseISO(result.date), 'MMM d, yyyy')}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            {result.placementDetail && (
              <Badge variant="default" className="text-sm">
                {result.placementDetail}
              </Badge>
            )}
            {hasRounds && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRounds(!showRounds)}
                className="h-7 px-2"
              >
                {showRounds ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    View Details
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 flex-wrap">
          {result.partnerName && (
            <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded">
              Partner: {result.partnerName}
            </span>
          )}
          {result.preliminaryRecord && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">
              Prelims: {result.preliminaryRecord}
            </span>
          )}
          {result.eliminationRounds && result.eliminationRounds.length > 0 && result.eliminationRounds.map((round: RoundBallot, idx: number) => (
            <span key={idx} className={`text-xs px-2 py-0.5 rounded ${
              round.result === 'win'
                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
            }`}>
              {getShortRoundName(round.roundName)}: {round.result === 'win' ? 'W' : 'L'}
              {round.ballotsWon !== undefined && round.judgeCount && ` (${round.ballotsWon}-${round.judgeCount - round.ballotsWon})`}
            </span>
          ))}
        </div>

        {showRounds && hasRounds && (
          <div className="mt-4 pt-4 border-t space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Preliminary Rounds */}
              {result.preliminaryRounds && result.preliminaryRounds.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Preliminary Rounds</h4>
                  <div className="space-y-1">
                    {result.preliminaryRounds.map((round: RoundBallot, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedRound(round)}
                        className="w-full text-xs flex justify-between items-center p-2 bg-white dark:bg-gray-900 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border"
                      >
                        <div className="flex flex-col items-start gap-0.5">
                          <span className="font-medium">{cleanRoundName(round.roundName)}</span>
                          {/* Show opponent for debate events */}
                          {isDebateEvent && round.opponent && (
                            <span className="text-muted-foreground text-[10px]">vs {round.opponent}</span>
                          )}
                        </div>
                        <div className="flex gap-2 items-center">
                          {/* Show speaker points for debate events */}
                          {isDebateEvent && round.individualSpeakerPoints && round.individualSpeakerPoints.length > 0 ? (
                            <span className="text-muted-foreground font-medium">{round.individualSpeakerPoints.join(', ')}</span>
                          ) : isDebateEvent && round.speakerPoints !== undefined ? (
                            <span className="text-muted-foreground font-medium">{round.speakerPoints}</span>
                          ) : null}
                          {/* Show rankings for speech events */}
                          {isSpeechEvent && round.ranks && (
                            <span className="text-muted-foreground">Rank: {round.ranks}</span>
                          )}
                          {/* Only show result badge for debate events (not for speech events) */}
                          {isDebateEvent && (
                            <Badge variant={round.result === 'win' ? 'default' : round.result === 'loss' ? 'destructive' : 'secondary'} className="text-xs">
                              {round.result.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Elimination Rounds */}
              {result.eliminationRounds && result.eliminationRounds.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Elimination Rounds</h4>
                  <div className="space-y-1">
                    {result.eliminationRounds.map((round: RoundBallot, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedRound(round)}
                        className="w-full text-xs flex justify-between items-center p-2 bg-white dark:bg-gray-900 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border"
                      >
                        <div className="flex flex-col items-start gap-0.5">
                          <span className="font-medium">{cleanRoundName(round.roundName)}</span>
                          {/* Show opponent for debate events */}
                          {isDebateEvent && round.opponent && (
                            <span className="text-muted-foreground text-[10px]">vs {round.opponent}</span>
                          )}
                        </div>
                        <div className="flex gap-2 items-center">
                          {/* Show rankings for speech events in elims */}
                          {isSpeechEvent && round.ranks && (
                            <span className="text-muted-foreground">Rank: {round.ranks}</span>
                          )}
                          {/* Show ballot count for debate events */}
                          {isDebateEvent && round.ballotsWon !== undefined && round.judgeCount && (
                            <span className="text-muted-foreground">({round.ballotsWon}-{round.judgeCount - round.ballotsWon})</span>
                          )}
                          {/* Only show result badge for debate events (not for speech events) */}
                          {isDebateEvent && (
                            <Badge variant={round.result === 'win' ? 'default' : round.result === 'loss' ? 'destructive' : 'secondary'} className="text-xs">
                              {round.result.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Selected Round RFD */}
            {selectedRound && (
              <div className="mt-3 p-3 bg-white dark:bg-gray-900 rounded border">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-sm">{cleanRoundName(selectedRound.roundName)} - Feedback</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedRound(null)}
                    className="h-6 w-6 p-0"
                  >
                    ✕
                  </Button>
                </div>
                {/* Show opponent for debate events */}
                {isDebateEvent && selectedRound.opponent && (
                  <p className="text-xs text-muted-foreground mb-2">Opponent: {selectedRound.opponent}</p>
                )}
                {selectedRound.judge && (
                  <p className="text-xs text-muted-foreground mb-2">Judge: {selectedRound.judge}</p>
                )}
                {/* Show speaker points for debate prelims */}
                {isDebateEvent && selectedRound.individualSpeakerPoints && selectedRound.individualSpeakerPoints.length > 0 ? (
                  <p className="text-xs text-muted-foreground mb-2">Speaker Points: {selectedRound.individualSpeakerPoints.join(', ')}</p>
                ) : isDebateEvent && selectedRound.speakerPoints !== undefined ? (
                  <p className="text-xs text-muted-foreground mb-2">Speaker Points: {selectedRound.speakerPoints}</p>
                ) : null}
                {/* Show rankings for speech events */}
                {isSpeechEvent && selectedRound.ranks && (
                  <p className="text-xs text-muted-foreground mb-2">Ranking: {selectedRound.ranks}</p>
                )}
                {selectedRound.rfd ? (
                  <div>
                    <p className="text-xs font-medium mb-1">Comments:</p>
                    <p className="text-xs whitespace-pre-wrap">{selectedRound.rfd}</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No comments available for this round</p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
