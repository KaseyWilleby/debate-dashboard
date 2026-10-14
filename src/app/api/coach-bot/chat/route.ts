import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { getBotConfig } from '@/lib/coach-bot-config';
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

    // Get bot configuration
    const botConfig = getBotConfig(botType as CoachBotType);

    // Build system prompt
    let systemPrompt = botConfig.systemPrompt;

    // Add mode-specific instructions
    if (mode === 'case-feedback') {
      systemPrompt += `\n\nYou are currently in CASE FEEDBACK mode. The student will share their case or argument with you. Provide constructive, detailed feedback on argument strength, evidence quality, link chains, and improvements.`;
    } else if (mode === 'rebuttal-practice') {
      systemPrompt += `\n\nYou are currently in REBUTTAL PRACTICE mode. Help the student practice responding to arguments. Present arguments for them to rebut and evaluate their responses.`;
    } else if (mode === 'cx-practice') {
      systemPrompt += `\n\nYou are currently in CROSS-EXAMINATION PRACTICE mode. Help the student practice questioning skills by role-playing and providing feedback.`;
    } else if (mode === 'speech-feedback') {
      systemPrompt += `\n\nYou are currently in SPEECH FEEDBACK mode. Provide feedback on speech structure, organization, argument clarity, and delivery suggestions.`;
    } else if (mode === 'topic-generation') {
      systemPrompt += `\n\nYou are currently in TOPIC GENERATION mode. Generate relevant practice topics, questions, or prompts that are current, varied, and appropriately challenging.`;
    }

    if (context?.additionalContext) {
      systemPrompt += `\n\nAdditional context: ${context.additionalContext}`;
    }

    // Build conversation prompt
    let prompt = `${systemPrompt}\n\n`;

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      prompt += 'Previous conversation:\n';
      for (const msg of conversationHistory) {
        const label = msg.role === 'user' ? 'STUDENT' : 'COACH';
        prompt += `${label}: ${msg.content}\n\n`;
      }
    }

    // Add current user message
    prompt += `STUDENT: ${userMessage}\n\nCOACH:`;

    // Generate response using AI
    const { text } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });

    // Generate suggested follow-ups based on mode
    const suggestedFollowUps: string[] = [];
    if (mode === 'chat') {
      suggestedFollowUps.push('Can you explain that in more detail?', 'How would this apply in a round?', 'What else should I consider?');
    } else if (mode === 'case-feedback') {
      suggestedFollowUps.push('What are the biggest weaknesses?', 'How can I make this impact stronger?', 'What evidence would help this argument?');
    } else if (mode === 'rebuttal-practice') {
      suggestedFollowUps.push('Give me another argument to rebut', 'How did I do on that rebuttal?', 'What strategy should I use here?');
    }

    return NextResponse.json({
      response: text,
      suggestedFollowUps: suggestedFollowUps.length > 0 ? suggestedFollowUps : undefined,
    });
  } catch (error) {
    console.error('Coach bot chat error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
