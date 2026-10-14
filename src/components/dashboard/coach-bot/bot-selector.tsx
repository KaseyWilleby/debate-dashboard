'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Scale,
  Users,
  FileText,
  Globe,
  Flag,
  Newspaper,
  Zap,
  MessageSquare,
  Presentation,
  Drama,
  GraduationCap,
  ArrowRight
} from 'lucide-react';
import type { CoachBotType } from '@/lib/types';
import { getAllBotConfigs, getDebateBots, getSpeechBots, getInterpBots } from '@/lib/coach-bot-config';

interface BotSelectorProps {
  onSelectBot: (botType: CoachBotType) => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Scale: <Scale className="h-6 w-6" />,
  Users: <Users className="h-6 w-6" />,
  FileText: <FileText className="h-6 w-6" />,
  Globe: <Globe className="h-6 w-6" />,
  Flag: <Flag className="h-6 w-6" />,
  Newspaper: <Newspaper className="h-6 w-6" />,
  Zap: <Zap className="h-6 w-6" />,
  MessageSquare: <MessageSquare className="h-6 w-6" />,
  Presentation: <Presentation className="h-6 w-6" />,
  Drama: <Drama className="h-6 w-6" />,
  GraduationCap: <GraduationCap className="h-6 w-6" />,
};

export function BotSelector({ onSelectBot }: BotSelectorProps) {
  const debateBots = getDebateBots();
  const speechBots = getSpeechBots();
  const interpBots = getInterpBots();
  const allBots = getAllBotConfigs();
  const generalBot = allBots.find(b => b.type === 'general-coach');

  return (
    <div className="space-y-8">
      {/* General Coach */}
      {generalBot && (
        <div>
          <h2 className="text-2xl font-bold font-headline mb-4">General Coach</h2>
          <Card
            className="cursor-pointer hover:border-primary transition-all group"
            onClick={() => onSelectBot(generalBot.type)}
          >
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-primary">
                  {ICON_MAP[generalBot.icon]}
                </div>
                <div>
                  <CardTitle className="text-xl">{generalBot.name}</CardTitle>
                  <CardDescription>{generalBot.description}</CardDescription>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Debate Coaches */}
      <div>
        <h2 className="text-2xl font-bold font-headline mb-4">Debate Coaches</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {debateBots.map(bot => (
            <Card
              key={bot.type}
              className="cursor-pointer hover:border-primary transition-all group"
              onClick={() => onSelectBot(bot.type)}
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="text-primary">
                    {ICON_MAP[bot.icon]}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <CardTitle className="text-lg">{bot.name}</CardTitle>
                <CardDescription className="text-xs">{bot.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Speech Coaches */}
      <div>
        <h2 className="text-2xl font-bold font-headline mb-4">Speech Coaches</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {speechBots.map(bot => (
            <Card
              key={bot.type}
              className="cursor-pointer hover:border-primary transition-all group"
              onClick={() => onSelectBot(bot.type)}
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="text-primary">
                    {ICON_MAP[bot.icon]}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <CardTitle className="text-lg">{bot.name}</CardTitle>
                <CardDescription className="text-xs">{bot.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Interp Coaches */}
      <div>
        <h2 className="text-2xl font-bold font-headline mb-4">Interpretation Coaches</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {interpBots.map(bot => (
            <Card
              key={bot.type}
              className="cursor-pointer hover:border-primary transition-all group"
              onClick={() => onSelectBot(bot.type)}
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="text-primary">
                    {ICON_MAP[bot.icon]}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <CardTitle className="text-lg">{bot.name}</CardTitle>
                <CardDescription className="text-xs">{bot.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
