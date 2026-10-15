'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, ArrowLeft, ArrowRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PointerDirection = 'top' | 'bottom' | 'left' | 'right';

interface TutorialPointerProps {
  targetSelector: string;
  direction?: PointerDirection;
  title: string;
  description: string;
  onNext?: () => void;
  onSkip?: () => void;
  onPrevious?: () => void;
  showNext?: boolean;
  showSkip?: boolean;
  showPrevious?: boolean;
  nextLabel?: string;
  highlightPulse?: boolean;
}

const arrowIcons = {
  top: ArrowDown,
  bottom: ArrowUp,
  left: ArrowRight,
  right: ArrowLeft,
};

export function TutorialPointer({
  targetSelector,
  direction = 'bottom',
  title,
  description,
  onNext,
  onSkip,
  onPrevious,
  showNext = true,
  showSkip = true,
  showPrevious = false,
  nextLabel = 'Next',
  highlightPulse = true,
}: TutorialPointerProps) {
  const [targetRect, setTargetRect] = React.useState<DOMRect | null>(null);
  const [pointerPosition, setPointerPosition] = React.useState({ top: 0, left: 0 });

  React.useEffect(() => {
    const updatePosition = () => {
      const targetElement = document.querySelector(targetSelector);
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        setTargetRect(rect);

        // Calculate pointer position based on direction
        let top = 0;
        let left = 0;

        switch (direction) {
          case 'top':
            top = rect.top - 200; // Card height offset
            left = rect.left + rect.width / 2 - 200; // Center horizontally
            break;
          case 'bottom':
            top = rect.bottom + 20;
            left = rect.left + rect.width / 2 - 200;
            break;
          case 'left':
            top = rect.top + rect.height / 2 - 100;
            left = rect.left - 420;
            break;
          case 'right':
            top = rect.top + rect.height / 2 - 100;
            left = rect.right + 20;
            break;
        }

        setPointerPosition({ top, left });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [targetSelector, direction]);

  if (!targetRect) return null;

  const ArrowIcon = arrowIcons[direction];

  return (
    <AnimatePresence>
      {/* Backdrop overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-[100] pointer-events-none"
      />

      {/* Target highlight */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed z-[101] pointer-events-none"
        style={{
          top: targetRect.top - 8,
          left: targetRect.left - 8,
          width: targetRect.width + 16,
          height: targetRect.height + 16,
        }}
      >
        <div
          className={cn(
            'absolute inset-0 rounded-lg border-4 border-primary bg-primary/10',
            highlightPulse && 'animate-pulse'
          )}
        />
        {/* Cutout to make target clickable */}
        <div
          className="absolute inset-[8px] bg-background/0 pointer-events-auto"
          style={{
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
          }}
        />
      </motion.div>

      {/* Pointer card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className="fixed z-[102]"
        style={{
          top: pointerPosition.top,
          left: pointerPosition.left,
        }}
      >
        <Card className="w-[400px] p-6 shadow-2xl pointer-events-auto">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <ArrowIcon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-lg">{title}</h3>
            </div>
            {showSkip && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -mt-1 -mr-1"
                onClick={onSkip}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <p className="text-sm text-muted-foreground mb-6">{description}</p>

          <div className="flex items-center justify-between gap-2">
            {showPrevious ? (
              <Button variant="outline" onClick={onPrevious}>
                Previous
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              {showSkip && (
                <Button variant="ghost" onClick={onSkip}>
                  Skip Tour
                </Button>
              )}
              {showNext && (
                <Button onClick={onNext}>{nextLabel}</Button>
              )}
            </div>
          </div>
        </Card>

        {/* Animated arrow pointing to target */}
        <motion.div
          animate={{
            y: direction === 'top' || direction === 'bottom' ? [0, -10, 0] : 0,
            x: direction === 'left' || direction === 'right' ? [0, -10, 0] : 0,
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className={cn(
            'absolute text-primary',
            direction === 'top' && 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full',
            direction === 'bottom' && 'top-0 left-1/2 -translate-x-1/2 -translate-y-full',
            direction === 'left' && 'right-0 top-1/2 -translate-y-1/2 translate-x-full',
            direction === 'right' && 'left-0 top-1/2 -translate-y-1/2 -translate-x-full'
          )}
        >
          <ArrowIcon className="h-8 w-8" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
