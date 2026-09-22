
'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight, Gavel, Mic, Drama, Flag, Globe, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

const learningCategories = [
  {
    title: 'Platform Guides',
    description: 'Tutorials for Tabroom, the NSDA website, and more.',
    href: '/dashboard/learning-hub/platforms',
    icon: <Globe className="h-8 w-8" />,
  },
  {
    title: 'Standing Rules',
    description: 'Official rulebooks and guides from NSDA, TFA, and UIL.',
    href: '/dashboard/learning-hub/standing-rules',
    icon: <FileText className="h-8 w-8" />,
  },
  {
    title: 'Debate Events',
    description: 'Resources for LD, PF, CX, and WSD.',
    href: '/dashboard/learning-hub/debate',
    icon: <Gavel className="h-8 w-8" />,
  },
  {
    title: 'Speech Events',
    description: 'Guides for Extemp, Oratory, and Informative.',
    href: '/dashboard/learning-hub/speech',
    icon: <Mic className="h-8 w-8" />,
  },
  {
    title: 'Interpretation Events',
    description: 'Tips for HI, DI, Duo, Duet, Prose, and Poetry.',
    href: '/dashboard/learning-hub/interp',
    icon: <Drama className="h-8 w-8" />,
  },
  {
    title: 'Student Congress',
    description: 'Learn about legislation, procedure, and strategy.',
    href: '/dashboard/learning-hub/congress',
    icon: <Flag className="h-8 w-8" />,
  },
];

export default function LearningHubPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Learning Hub</h1>
        <p className="text-muted-foreground">
          Browse resources, tutorials, and guides to improve your skills.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {learningCategories.map((category) => (
          <Card
            key={category.title}
            className="group cursor-pointer transition-all hover:bg-muted/50"
            onClick={() => router.push(category.href)}
          >
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-primary">{category.icon}</div>
                <div>
                  <CardTitle>{category.title}</CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
