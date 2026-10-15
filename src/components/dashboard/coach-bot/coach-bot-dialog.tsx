'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Bot, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ChatInterface } from './chat-interface';
import type { CoachBotType, CoachBotMode } from '@/lib/types';
import { getBotConfig } from '@/lib/coach-bot-config';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useParams } from 'next/navigation';

interface CoachBotDialogProps {
  botType: CoachBotType;
  defaultMode?: CoachBotMode;
  context?: {
    eventType?: string;
    topicId?: string;
    sessionName?: string;
  };
  trigger?: 'fab' | 'button' | 'none';
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  recordingContext?: {
    topic: string;
    duration?: string;
    recordingUrl?: string;
    transcript?: string;
  };
}

export function CoachBotDialog({
  botType,
  defaultMode,
  context,
  trigger = 'fab',
  onOpenChange,
  open: controlledOpen,
  recordingContext
}: CoachBotDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [mode, setMode] = React.useState<CoachBotMode | null>(defaultMode || (recordingContext ? 'speech-feedback' : null));
  const params = useParams();
  const teamSlug = params?.teamSlug as string;
  const { firestore } = useFirebase();

  // Use controlled or uncontrolled open state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = (open: boolean) => {
    if (controlledOpen !== undefined) {
      onOpenChange?.(open);
    } else {
      setInternalOpen(open);
    }
  };

  // Fetch team settings to check if coach bot is enabled
  const teamDocRef = useMemoFirebase(() => {
    if (!firestore || !teamSlug) return null;
    return doc(firestore, 'teams', teamSlug);
  }, [firestore, teamSlug]);

  const { data: team } = useDoc(teamDocRef);
  const isEnabled = team?.settings?.enablePracticeCoachBot ?? false;

  const botConfig = getBotConfig(botType);

  // Build initial message if recording context is provided
  const initialMessage = React.useMemo(() => {
    if (!recordingContext) return undefined;

    let message = `I recorded a ${recordingContext.topic} speech`;
    if (recordingContext.duration) {
      message += ` (${recordingContext.duration})`;
    }
    message += '. Can you provide feedback on my performance?';

    if (recordingContext.transcript) {
      message += `\n\nTranscript:\n${recordingContext.transcript}`;
    } else if (recordingContext.recordingUrl) {
      message += `\n\nRecording URL: ${recordingContext.recordingUrl}`;
    }

    return message;
  }, [recordingContext]);

  // If coach bot is not enabled for this team, don't render anything
  if (!isEnabled || !team) {
    return null;
  }

  return (
    <>
      {/* Floating Action Button - only show if trigger is 'fab' */}
      {trigger === 'fab' && (
        <div className="fixed bottom-6 right-6 z-50">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setIsOpen(true)}
                  size="lg"
                  className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all"
                >
                  <Bot className="h-6 w-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="font-semibold mb-1">{botConfig.name}</p>
                <p className="text-xs">{botConfig.description}</p>
                <p className="text-xs text-muted-foreground mt-1">Click to get coaching, feedback, and practice guidance</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Coach Bot Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
          <div className="h-full overflow-hidden">
            <ChatInterface
              botType={botType}
              mode={mode}
              onModeChange={setMode}
              initialMessage={initialMessage}
              recordingContext={recordingContext}
              sessionName={context?.sessionName}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
