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
import { ChatInterface } from './chat-interface';
import type { CoachBotType, CoachBotMode } from '@/lib/types';
import { getBotConfig } from '@/lib/coach-bot-config';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useParams } from 'next/navigation';

interface CoachBotDialogProps {
  botType: CoachBotType;
  defaultMode?: CoachBotMode;
  context?: {
    eventType?: string;
    topicId?: string;
    sessionName?: string;
  };
}

export function CoachBotDialog({ botType, defaultMode, context }: CoachBotDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [mode, setMode] = React.useState<CoachBotMode | null>(defaultMode || null);
  const params = useParams();
  const teamSlug = params?.teamSlug as string;

  // Fetch team settings to check if coach bot is enabled
  const team = useDoc(teamSlug ? `teams/${teamSlug}` : null);
  const isEnabled = team?.settings?.enablePracticeCoachBot ?? false;

  const botConfig = getBotConfig(botType);

  // If coach bot is not enabled for this team, don't render anything
  if (!isEnabled || !team) {
    return null;
  }

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all"
        >
          <Bot className="h-6 w-6" />
        </Button>
      </div>

      {/* Coach Bot Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl h-[600px] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                {botConfig.name}
                {context?.sessionName && (
                  <span className="text-sm text-muted-foreground font-normal">
                    • {context.sessionName}
                  </span>
                )}
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <ChatInterface
              botType={botType}
              mode={mode}
              onModeChange={setMode}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
