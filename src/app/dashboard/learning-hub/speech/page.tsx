
'use client';

import * as React from 'react';
import { speechResources } from '@/lib/learning-resources';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Link from 'next/link';
import { FileText, Video, PlusCircle, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useLearningResources } from '../layout';
import { Button } from '@/components/ui/button';
import { CreateResourceDialog } from '@/components/dashboard/learning/create-resource-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';

export default function SpeechLearningPage() {
  const { user } = useAuth();
  const { resources, setResources } = useLearningResources();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);

  const pageResources = React.useMemo(() => resources.filter(r => {
      return r.event.includes('Speaking') || r.event.includes('Oratory') || r.event === 'Speech (General)';
  }), [resources]);

  const events = Array.from(new Set(pageResources.map(r => r.event)));

  const handleDelete = (resourceId: string) => {
    setResources(prev => prev.filter(r => r.id !== resourceId));
    toast({ title: "Resource Deleted", variant: "destructive" });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold font-headline">Speech Events Resources</h1>
          <p className="text-muted-foreground">
            Guides and tutorials for Extemp, Oratory, and Informative Speaking.
          </p>
        </div>
        {user?.role === 'admin' && (
           <Button onClick={() => setIsCreateOpen(true)}><PlusCircle className="mr-2"/> New Resource</Button>
        )}
      </div>

      <Accordion type="multiple" defaultValue={events} className="w-full space-y-4">
        {events.map(event => (
          <AccordionItem value={event} key={event} className="border rounded-lg">
            <AccordionTrigger className="p-4 hover:no-underline font-headline text-lg">{event}</AccordionTrigger>
            <AccordionContent className="p-4 pt-0 border-t">
              <div className="divide-y">
                {pageResources.filter(r => r.event === event).map(resource => (
                   <div key={resource.id} className="group flex items-center gap-2 -mx-3">
                    <Link href={`/dashboard/learning-hub/resource/${resource.id}`} className="block p-3 hover:bg-muted/50 rounded-md flex-1">
                        <div className="flex items-center gap-4">
                            {resource.type === 'video' ? <Video className="h-5 w-5 text-primary" /> : <FileText className="h-5 w-5 text-primary" />}
                            <div>
                              <p className="font-medium">{resource.title}</p>
                              <p className="text-sm text-muted-foreground line-clamp-1">{resource.description}</p>
                            </div>
                        </div>
                    </Link>
                    {user?.role === 'admin' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4 text-destructive"/></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this resource?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(resource.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <CreateResourceDialog isOpen={isCreateOpen} onOpenChange={setIsCreateOpen} defaultEventCategory="Extemporaneous Speaking" />
    </div>
  );
}
