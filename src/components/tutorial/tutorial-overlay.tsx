'use client';

import * as React from 'react';
import { useTutorial } from '@/contexts/tutorial-context';
import { TutorialPointer } from './tutorial-pointer';

export function TutorialOverlay() {
  const {
    currentStep,
    currentStepIndex,
    currentFlow,
    isActive,
    nextStep,
    previousStep,
    skipTutorial,
  } = useTutorial();

  // Don't render anything if tutorial is not active
  if (!isActive || !currentStep || !currentFlow) {
    return null;
  }

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === currentFlow.steps.length - 1;

  return (
    <TutorialPointer
      targetSelector={currentStep.targetSelector}
      direction={currentStep.direction}
      title={currentStep.title}
      description={currentStep.description}
      onNext={nextStep}
      onPrevious={previousStep}
      onSkip={skipTutorial}
      showNext={true}
      showSkip={true}
      showPrevious={!isFirstStep}
      nextLabel={isLastStep ? 'Finish' : currentStep.nextLabel || 'Next'}
      highlightPulse={currentStep.highlightPulse}
    />
  );
}
