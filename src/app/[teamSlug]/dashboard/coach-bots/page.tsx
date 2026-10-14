'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { BotSelector } from '@/components/dashboard/coach-bot/bot-selector';
import { ChatInterface } from '@/components/dashboard/coach-bot/chat-interface';
import type { CoachBotType, CoachBotMode } from '@/lib/types';

export default function CoachBotsPage() {
  const [selectedBot, setSelectedBot] = React.useState<CoachBotType | null>(null);
  const [mode, setMode] = React.useState<CoachBotMode | null>(null);

  const handleBotSelect = (botType: CoachBotType) => {
    setSelectedBot(botType);
    setMode(null); // Reset mode when selecting a new bot
  };

  const handleBackToSelector = () => {
    setSelectedBot(null);
    setMode(null);
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            AI Coach Bots
          </h1>
          <p className="text-muted-foreground">
            {selectedBot
              ? 'Get personalized coaching and feedback from AI experts'
              : 'Choose a specialized coach bot to help you improve your skills'}
          </p>
        </div>
        {selectedBot && (
          <Button
            variant="outline"
            onClick={handleBackToSelector}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Change Coach
          </Button>
        )}
      </div>

      {!selectedBot ? (
        <BotSelector onSelectBot={handleBotSelect} />
      ) : (
        <div className="flex-1 min-h-0">
          <ChatInterface
            botType={selectedBot}
            mode={mode}
            onModeChange={setMode}
          />
        </div>
      )}
    </div>
  );
}
