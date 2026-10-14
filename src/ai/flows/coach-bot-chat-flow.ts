import { ai } from '../genkit';
import { z } from 'zod';
import { getBotConfig } from '@/lib/coach-bot-config';
import type { CoachBotType, CoachBotMode, CoachBotMessage } from '@/lib/types';

// Input schema for the coach bot chat
const CoachBotChatInputSchema = z.object({
  botType: z.enum([
    'ld-coach',
    'pf-coach',
    'cx-coach',
    'wsd-coach',
    'congress-coach',
    'extemp-coach',
    'impromptu-coach',
    'oratory-coach',
    'info-coach',
    'interp-coach',
    'general-coach',
  ]),
  mode: z.enum([
    'chat',
    'case-feedback',
    'rebuttal-practice',
    'cx-practice',
    'speech-feedback',
    'topic-generation',
  ]),
  userMessage: z.string(),
  conversationHistory: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
    })
  ).optional(),
  context: z.object({
    eventType: z.string().optional(),
    topicId: z.string().optional(),
    caseId: z.string().optional(),
    speechId: z.string().optional(),
    additionalContext: z.string().optional(),
  }).optional(),
});

// Output schema
const CoachBotChatOutputSchema = z.object({
  response: z.string(),
  suggestedFollowUps: z.array(z.string()).optional(),
});

export const coachBotChatFlow = ai.defineFlow(
  {
    name: 'coachBotChat',
    inputSchema: CoachBotChatInputSchema,
    outputSchema: CoachBotChatOutputSchema,
  },
  async (input) => {
    const { botType, mode, userMessage, conversationHistory = [], context } = input;

    // Get the bot configuration
    const botConfig = getBotConfig(botType as CoachBotType);

    // Build the system prompt based on bot type and mode
    let systemPrompt = botConfig.systemPrompt;

    // Add mode-specific instructions
    if (mode === 'case-feedback') {
      systemPrompt += `\n\nYou are currently in CASE FEEDBACK mode. The student will share their case or argument with you. Provide constructive, detailed feedback on:
- Argument strength and logic
- Evidence quality and relevance
- Link chains and impact calculus
- Potential responses and vulnerabilities
- Specific improvements they can make

Ask clarifying questions if needed to better understand their case.`;
    } else if (mode === 'rebuttal-practice') {
      systemPrompt += `\n\nYou are currently in REBUTTAL PRACTICE mode. Help the student practice responding to arguments. You can:
- Present arguments for them to rebut
- Evaluate their rebuttals
- Teach rebuttal frameworks and strategies
- Provide tips for organized, effective responses

Be challenging but educational - push them to think critically.`;
    } else if (mode === 'cx-practice') {
      systemPrompt += `\n\nYou are currently in CROSS-EXAMINATION PRACTICE mode. Help the student practice questioning skills. You can:
- Role-play as their opponent
- Evaluate their CX questions
- Teach effective questioning strategies
- Demonstrate how to set up arguments through CX
- Show how to handle difficult questions

Make it interactive and realistic.`;
    } else if (mode === 'speech-feedback') {
      systemPrompt += `\n\nYou are currently in SPEECH FEEDBACK mode. The student will share their speech or speech outline. Provide feedback on:
- Structure and organization
- Argument clarity and persuasiveness
- Source integration and credibility
- Delivery suggestions (if applicable)
- Specific ways to strengthen the speech

Be encouraging while providing actionable feedback.`;
    } else if (mode === 'topic-generation') {
      systemPrompt += `\n\nYou are currently in TOPIC GENERATION mode. Help the student by generating relevant practice topics, questions, or prompts for their event. Make topics:
- Current and relevant
- Appropriately challenging
- Varied in scope and difficulty
- Based on real issues when applicable

Provide multiple options and explain why each topic is valuable for practice.`;
    }

    // Add context if provided
    if (context?.additionalContext) {
      systemPrompt += `\n\nAdditional context: ${context.additionalContext}`;
    }

    // Build the conversation messages
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];

    // Generate response using AI (using Claude for better coaching conversations)
    const { text } = await ai.generate({
      model: 'claude/claude-3-5-sonnet-latest',
      messages: messages.map(m => ({
        role: m.role === 'system' ? 'user' : m.role as 'user' | 'assistant',
        content: m.role === 'system' ? `<system>${m.content}</system>` : m.content,
      })),
      config: {
        temperature: 0.7,
        maxTokens: 2048,
      },
    });

    // Generate suggested follow-up questions
    const suggestedFollowUps: string[] = [];

    // Add mode-specific follow-ups
    if (mode === 'chat') {
      suggestedFollowUps.push(
        'Can you explain that in more detail?',
        'How would this apply in a round?',
        'What else should I consider?'
      );
    } else if (mode === 'case-feedback') {
      suggestedFollowUps.push(
        'What are the biggest weaknesses?',
        'How can I make this impact stronger?',
        'What evidence would help this argument?'
      );
    } else if (mode === 'rebuttal-practice') {
      suggestedFollowUps.push(
        'Give me another argument to rebut',
        'How did I do on that rebuttal?',
        'What strategy should I use here?'
      );
    }

    return {
      response: text,
      suggestedFollowUps: suggestedFollowUps.length > 0 ? suggestedFollowUps : undefined,
    };
  }
);
