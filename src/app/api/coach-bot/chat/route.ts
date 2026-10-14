import { NextRequest, NextResponse } from 'next/server';
import { coachBotChatFlow } from '@/ai/flows/coach-bot-chat-flow';
import type { CoachBotType, CoachBotMode } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { botType, mode, userMessage, conversationHistory, context } = body;

    // Validate required fields
    if (!botType || !mode || !userMessage) {
      return NextResponse.json(
        { error: 'Missing required fields: botType, mode, or userMessage' },
        { status: 400 }
      );
    }

    // Call the Genkit flow
    const result = await coachBotChatFlow({
      botType: botType as CoachBotType,
      mode: mode as CoachBotMode,
      userMessage,
      conversationHistory: conversationHistory || [],
      context: context || {},
    });

    return NextResponse.json({
      response: result.response,
      suggestedFollowUps: result.suggestedFollowUps,
    });
  } catch (error) {
    console.error('Coach bot chat error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}
