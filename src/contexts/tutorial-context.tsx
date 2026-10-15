'use client';

import * as React from 'react';

export interface TutorialStep {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  direction?: 'top' | 'bottom' | 'left' | 'right';
  action?: () => void | Promise<void>;
  waitForElement?: string; // Wait for this element to appear before showing step
  highlightPulse?: boolean;
  nextLabel?: string;
}

export interface TutorialFlow {
  id: string;
  name: string;
  steps: TutorialStep[];
}

interface TutorialContextValue {
  currentFlow: TutorialFlow | null;
  currentStepIndex: number;
  isActive: boolean;
  startTutorial: (flow: TutorialFlow) => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  currentStep: TutorialStep | null;
}

const TutorialContext = React.createContext<TutorialContextValue | null>(null);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [currentFlow, setCurrentFlow] = React.useState<TutorialFlow | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0);
  const [isActive, setIsActive] = React.useState(false);

  const currentStep = React.useMemo(() => {
    if (!currentFlow || !isActive) return null;
    return currentFlow.steps[currentStepIndex] || null;
  }, [currentFlow, currentStepIndex, isActive]);

  const startTutorial = React.useCallback((flow: TutorialFlow) => {
    setCurrentFlow(flow);
    setCurrentStepIndex(0);
    setIsActive(true);
  }, []);

  const nextStep = React.useCallback(async () => {
    if (!currentFlow) return;

    // Execute current step action if present
    if (currentStep?.action) {
      await currentStep.action();
    }

    // Move to next step
    if (currentStepIndex < currentFlow.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      // Tutorial completed
      completeTutorial();
    }
  }, [currentFlow, currentStepIndex, currentStep]);

  const previousStep = React.useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  const skipTutorial = React.useCallback(() => {
    setIsActive(false);
    setCurrentFlow(null);
    setCurrentStepIndex(0);
  }, []);

  const completeTutorial = React.useCallback(() => {
    setIsActive(false);
    // Store completion in localStorage
    if (currentFlow) {
      const completedTutorials = JSON.parse(
        localStorage.getItem('completedTutorials') || '[]'
      );
      if (!completedTutorials.includes(currentFlow.id)) {
        completedTutorials.push(currentFlow.id);
        localStorage.setItem('completedTutorials', JSON.stringify(completedTutorials));
      }
    }
    setCurrentFlow(null);
    setCurrentStepIndex(0);
  }, [currentFlow]);

  const value: TutorialContextValue = {
    currentFlow,
    currentStepIndex,
    isActive,
    startTutorial,
    nextStep,
    previousStep,
    skipTutorial,
    completeTutorial,
    currentStep,
  };

  return (
    <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = React.useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within TutorialProvider');
  }
  return context;
}

export function hasCompletedTutorial(tutorialId: string): boolean {
  if (typeof window === 'undefined') return false;
  const completedTutorials = JSON.parse(
    localStorage.getItem('completedTutorials') || '[]'
  );
  return completedTutorials.includes(tutorialId);
}
