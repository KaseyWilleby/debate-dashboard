
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useLearningResources } from '@/app/dashboard/learning-hub/layout';
import type { LearningResource } from '@/lib/learning-resources';

const resourceSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  event: z.string().min(2, "Event category is required."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  url: z.string().url("Must be a valid URL."),
});

interface CreateResourceDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEventCategory: string;
}

export function CreateResourceDialog({ isOpen, onOpenChange, defaultEventCategory }: CreateResourceDialogProps) {
  const { setResources } = useLearningResources();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof resourceSchema>>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      title: "",
      event: defaultEventCategory,
      description: "",
      url: "",
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        title: "",
        event: defaultEventCategory,
        description: "",
        url: "",
      });
    }
  }, [isOpen, defaultEventCategory, form]);

  function getYouTubeVideoId(url: string) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  function onSubmit(values: z.infer<typeof resourceSchema>) {
    const videoId = getYouTubeVideoId(values.url);
    
    const newResource: LearningResource = videoId 
      ? {
          id: `res-${Date.now()}`,
          type: 'video',
          title: values.title,
          event: values.event,
          description: values.description,
          videoId: videoId,
          url: values.url,
        }
      : {
          id: `res-${Date.now()}`,
          type: 'website',
          title: values.title,
          event: values.event,
          description: values.description,
          url: values.url,
        };

    setResources(prev => [newResource, ...prev]);
    toast({ title: "Resource Created", description: `${newResource.title} has been added.` });
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Learning Resource</DialogTitle>
          <DialogDescription>
            Add a new website or video resource to the Learning Hub.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Intro to Policy Debate" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="event"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Category</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Policy Debate" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://www.speechanddebate.org/... or https://youtube.com/watch?v=..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="A brief summary of the resource." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Create Resource</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
