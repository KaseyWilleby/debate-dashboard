
'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import type { WebsiteResource, VideoResource, LearningResource } from '@/lib/learning-resources';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export function ResourceCard({ resource }: { resource: LearningResource }) {
  const hasRules = resource.rules && (resource.rules.TFA || resource.rules.NSDA || resource.rules.UIL);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{resource.title}</CardTitle>
        <CardDescription>{resource.event}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">{resource.description}</p>
        
        {resource.type === 'video' && (
          <div className="aspect-video w-full rounded-md overflow-hidden border">
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${resource.videoId}`}
              title={resource.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        )}

        {resource.url && (
            <Button asChild variant="outline">
                <a href={resource.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Visit Website
                </a>
            </Button>
        )}

        {hasRules && (
          <div className="pt-4">
            <h4 className="text-lg font-semibold mb-2">Event Rules</h4>
            <Accordion type="multiple" className="w-full">
              {resource.rules?.NSDA && (
                <AccordionItem value="nsda">
                  <AccordionTrigger>NSDA Rules</AccordionTrigger>
                  <AccordionContent className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                    {resource.rules.NSDA}
                  </AccordionContent>
                </AccordionItem>
              )}
               {resource.rules?.TFA && (
                <AccordionItem value="tfa">
                  <AccordionTrigger>TFA Rules</AccordionTrigger>
                  <AccordionContent className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                    {resource.rules.TFA}
                  </AccordionContent>
                </AccordionItem>
              )}
              {resource.rules?.UIL && (
                <AccordionItem value="uil">
                  <AccordionTrigger>UIL Rules</AccordionTrigger>
                  <AccordionContent className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                    {resource.rules.UIL}
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
