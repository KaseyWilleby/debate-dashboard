'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { BotSelector } from '@/components/dashboard/coach-bot/bot-selector';
import { ChatInterface } from '@/components/dashboard/coach-bot/chat-interface';
import type { CoachBotType, CoachBotMode } from '@/lib/types';
import { getBotConfig } from '@/lib/coach-bot-config';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function CoachBotsPage() {
  const [selectedBot, setSelectedBot] = React.useState<CoachBotType | null>(null);
  const [mode, setMode] = React.useState<CoachBotMode>('chat');

  const botConfig = selectedBot ? getBotConfig(selectedBot) : null;

  const handleBackToSelector = () => {
    setSelectedBot(null);
    setMode('chat');
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
        <BotSelector onSelectBot={setSelectedBot} />
      ) : (
        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {/* Mode Selector */}
          {botConfig && botConfig.supportedModes.length > 1 && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Mode:</span>
              <Select value={mode} onValueChange={(v) => setMode(v as CoachBotMode)}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {botConfig.supportedModes.includes('chat') && (
                    <SelectItem value="chat">General Chat</SelectItem>
                  )}
                  {botConfig.supportedModes.includes('case-feedback') && (
                    <SelectItem value="case-feedback">Case Feedback</SelectItem>
                  )}
                  {botConfig.supportedModes.includes('rebuttal-practice') && (
                    <SelectItem value="rebuttal-practice">Rebuttal Practice</SelectItem>
                  )}
                  {botConfig.supportedModes.includes('cx-practice') && (
                    <SelectItem value="cx-practice">Cross-Examination Practice</SelectItem>
                  )}
                  {botConfig.supportedModes.includes('speech-feedback') && (
                    <SelectItem value="speech-feedback">Speech Feedback</SelectItem>
                  )}
                  {botConfig.supportedModes.includes('topic-generation') && (
                    <SelectItem value="topic-generation">Topic Generation</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Chat Interface */}
          <div className="flex-1 min-h-0">
            <ChatInterface
              botType={selectedBot}
              mode={mode}
              onModeChange={setMode}
            />
          </div>
        </div>
      )}
    </div>
  );
}
