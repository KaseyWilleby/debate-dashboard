'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Sparkles, MessageSquare, FileSearch, Swords, HelpCircle, Presentation, Lightbulb } from 'lucide-react';
import { ChatMessage } from './chat-message';
import type { CoachBotType, CoachBotMode, CoachBotMessage } from '@/lib/types';
import { getBotConfig } from '@/lib/coach-bot-config';
import { useToast } from '@/hooks/use-toast';

interface ChatInterfaceProps {
  botType: CoachBotType;
  mode: CoachBotMode | null;
  onModeChange?: (mode: CoachBotMode) => void;
  initialMessages?: CoachBotMessage[];
  conversationId?: string;
  initialMessage?: string; // Auto-send this message when provided
}

export function ChatInterface({
  botType,
  mode,
  onModeChange,
  initialMessages = [],
  conversationId,
  initialMessage,
}: ChatInterfaceProps) {
  const [messages, setMessages] = React.useState<CoachBotMessage[]>(initialMessages);
  const [input, setInput] = React.useState('');
  const [hasAutoSent, setHasAutoSent] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const prevModeRef = React.useRef<CoachBotMode>(mode);

  const botConfig = getBotConfig(botType);

  // Send greeting when mode changes
  React.useEffect(() => {
    if (prevModeRef.current !== mode && mode !== null) {
      prevModeRef.current = mode;

      // Get mode-specific greeting
      let greeting = '';
      switch (mode) {
        case 'chat':
          greeting = "Hi! I'm ready to answer any questions you have. What would you like to talk about?";
          break;
        case 'case-feedback':
          greeting = "I'm ready to review your case! Please share your case or argument, and I'll provide detailed feedback on its strengths, weaknesses, and how you can improve it.";
          break;
        case 'rebuttal-practice':
          greeting = "Let's practice rebuttals! I can either present arguments for you to rebut, or you can share an opponent's argument and I'll help you craft a strong response. What would you like to do?";
          break;
        case 'cx-practice':
          greeting = "Time to practice cross-examination! I can role-play as your opponent and you can question me, or I can demonstrate effective CX techniques. Which would you prefer?";
          break;
        case 'speech-feedback':
          greeting = "I'm here to help improve your speech! Share your speech outline or full text, and I'll provide feedback on structure, argumentation, delivery suggestions, and ways to make it more compelling.";
          break;
        case 'topic-generation':
          greeting = "I'll help you find great practice topics! Let me know what event you're practicing for and I can generate relevant, current topics for you to work on.";
          break;
      }

      // Add coach greeting message
      const greetingMessage: CoachBotMessage = {
        id: `msg-${Date.now()}-greeting`,
        role: 'assistant',
        content: greeting,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, greetingMessage]);
    }
  }, [mode]);

  // Scroll to bottom when messages change
  React.useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSend = React.useCallback(async (messageOverride?: string) => {
    const messageToSend = messageOverride || input.trim();
    if (!messageToSend || isLoading || !mode) return;

    const userMessage: CoachBotMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: messageToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    if (!messageOverride) {
      setInput('');
    }
    setIsLoading(true);

    try {
      // Call the API
      const response = await fetch('/api/coach-bot/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          botType,
          mode,
          userMessage: userMessage.content,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: CoachBotMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // TODO: Save conversation to Firestore

    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: 'Error',
        description: 'Failed to get response from coach bot. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, mode, botType, messages, toast]);

  // Auto-send initial message when provided
  React.useEffect(() => {
    if (initialMessage && mode && !hasAutoSent && !isLoading) {
      setHasAutoSent(true);
      handleSend(initialMessage);
    }
  }, [initialMessage, mode, hasAutoSent, isLoading, handleSend]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getModeInfo = (modeType: CoachBotMode) => {
    switch (modeType) {
      case 'chat':
        return {
          icon: <MessageSquare className="h-5 w-5" />,
          title: 'General Chat',
          description: 'Ask me anything about debate and get personalized coaching advice',
        };
      case 'case-feedback':
        return {
          icon: <FileSearch className="h-5 w-5" />,
          title: 'Case Feedback',
          description: 'Share your case or argument for detailed feedback and improvements',
        };
      case 'rebuttal-practice':
        return {
          icon: <Swords className="h-5 w-5" />,
          title: 'Rebuttal Practice',
          description: 'Practice responding to arguments with organized, effective rebuttals',
        };
      case 'cx-practice':
        return {
          icon: <HelpCircle className="h-5 w-5" />,
          title: 'Cross-Examination Practice',
          description: 'Improve your questioning skills through interactive CX practice',
        };
      case 'speech-feedback':
        return {
          icon: <Presentation className="h-5 w-5" />,
          title: 'Speech Feedback',
          description: 'Get feedback on speech structure, delivery, and persuasiveness',
        };
      case 'topic-generation':
        return {
          icon: <Lightbulb className="h-5 w-5" />,
          title: 'Topic Generation',
          description: 'Generate relevant practice topics for your event',
        };
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {botConfig.name}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{botConfig.description}</p>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 p-0">
        <ScrollArea className="h-full px-6" ref={scrollAreaRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
              {!mode ? (
                <>
                  <h3 className="text-lg font-semibold mb-2">Choose a mode</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Select how you'd like to work with {botConfig.name}.
                  </p>
                  <div className="grid gap-3 w-full max-w-2xl">
                    {botConfig.supportedModes.map((modeType) => {
                      const modeInfo = getModeInfo(modeType);
                      return (
                        <Button
                          key={modeType}
                          variant="outline"
                          className="h-auto py-4 px-4 text-left justify-start hover:bg-accent"
                          onClick={() => onModeChange?.(modeType)}
                        >
                          <div className="flex items-start gap-3 w-full">
                            <div className="text-primary mt-0.5">{modeInfo.icon}</div>
                            <div className="flex-1">
                              <div className="font-semibold text-sm mb-1">{modeInfo.title}</div>
                              <div className="text-xs text-muted-foreground">{modeInfo.description}</div>
                            </div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Ask me anything about {botConfig.name.toLowerCase()}.
                  </p>
                  {botConfig.examples && (
                    <div className="space-y-2 w-full max-w-md">
                      <p className="text-xs font-medium text-muted-foreground">Example questions:</p>
                      {botConfig.examples.slice(0, 3).map((example, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          className="w-full text-left justify-start h-auto py-2 px-3"
                          onClick={() => setInput(example)}
                        >
                          <span className="text-xs">{example}</span>
                        </Button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="py-4">
              {messages.map(message => (
                <ChatMessage key={message.id} message={message} botName={botConfig.name} />
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground mb-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Coach is thinking...</span>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      <CardFooter className="p-4 border-t">
        <div className="flex gap-2 w-full">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message... (Shift+Enter for new line)"
            className="min-h-[60px] max-h-[120px] resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-[60px] w-[60px] shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
