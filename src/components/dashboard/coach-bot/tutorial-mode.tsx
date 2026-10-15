'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Play, BookOpen } from 'lucide-react';
import { useTutorial } from '@/contexts/tutorial-context';
import { tutorialFlows } from '@/lib/tutorial-flows';
import type { PracticeMode } from '@/lib/types';

interface TutorialModeProps {
  eventType: PracticeMode;
  onClose: () => void;
}

export function TutorialMode({ eventType, onClose }: TutorialModeProps) {
  const { startTutorial } = useTutorial();

  const getTutorialInfo = () => {
    switch (eventType) {
      case 'extemp':
        return {
          title: 'Learn Extemp Practice',
          description:
            'Take a guided tour through the extemp practice workflow. Learn how to generate topics, prep your speech, record yourself, and get AI feedback.',
          flow: tutorialFlows.extemp,
        };
      case 'impromptu':
        return {
          title: 'Learn Impromptu Practice',
          description:
            'Discover how to practice impromptu speaking with our guided tutorial. Learn about the 7:30 time split, combined timer mode, and more.',
          flow: tutorialFlows.impromptu,
        };
      case 'informative':
        return {
          title: 'Learn Informative Practice',
          description:
            'Learn how to write, practice, and perfect your informative speech with our step-by-step tutorial.',
          flow: tutorialFlows.informative,
        };
      case 'oratory':
        return {
          title: 'Learn Oratory Practice',
          description:
            'Get a complete walkthrough of the oratory practice features including script writing, teleprompter, and recording.',
          flow: tutorialFlows.oratory,
        };
      default:
        return null;
    }
  };

  const tutorialInfo = getTutorialInfo();

  if (!tutorialInfo) {
    return (
      <Card className="flex flex-col h-full border-0 shadow-none">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Practice Coach
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">
            Tutorial not available for this event type.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleStartTutorial = () => {
    onClose();
    startTutorial(tutorialInfo.flow);
  };

  return (
    <Card className="flex flex-col h-full border-0 shadow-none">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Practice Coach
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col items-center justify-center p-8 space-y-6">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <BookOpen className="h-10 w-10 text-primary" />
        </div>

        <div className="text-center space-y-3 max-w-md">
          <h2 className="text-2xl font-bold">{tutorialInfo.title}</h2>
          <p className="text-muted-foreground">{tutorialInfo.description}</p>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-sm">
          <Button
            size="lg"
            className="w-full"
            onClick={handleStartTutorial}
          >
            <Play className="mr-2 h-5 w-5" />
            Start Guided Tutorial
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={onClose}
          >
            Skip Tutorial
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center max-w-sm">
          The tutorial will guide you through the practice workflow with
          interactive pointers and step-by-step instructions. You can skip or
          exit at any time.
        </p>
      </CardContent>
    </Card>
  );
}
