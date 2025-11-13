
'use server';
/**
 * @fileOverview An AI flow for extracting current NSDA topics.
 *
 * - extractNsdaTopics - A function that scrapes the NSDA topics page and extracts them.
 * - NsdaTopic - The return type for a single extracted topic.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { DebateFormat } from '@/lib/types';

const NSDA_TOPICS_URL = 'https://www.speechanddebate.org/topics/';

const NsdaTopicSchema = z.object({
  resolution: z.string().describe('The full text of the debate resolution.'),
  type: z.enum(['LD', 'PF', 'CX', 'WSD']).describe('The debate format (LD, PF, CX, or WSD).'),
  months: z.string().describe('The month or months the topic is for (e.g., "September/October", "November").'),
});
export type NsdaTopic = z.infer<typeof NsdaTopicSchema>;

const ExtractNsdaTopicsOutputSchema = z.object({
  topics: z.array(NsdaTopicSchema),
});

async function getPageContent(url: string): Promise<string> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch page: ${response.statusText}`);
        }
        const html = await response.text();
        return html;
    } catch (error) {
        console.error("Error fetching page content:", error);
        throw new Error("Could not retrieve content from the provided URL.");
    }
}

const getWebpageTextContentTool = ai.defineTool(
    {
        name: 'getWebpageTextContent',
        description: 'Retrieves the HTML content of a given webpage URL.',
        inputSchema: z.object({ url: z.string().url() }),
        outputSchema: z.string(),
    },
    async ({ url }) => await getPageContent(url)
);

const prompt = ai.definePrompt({
  name: 'extractNsdaTopicsPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: { schema: z.object({ url: z.string().url() }) },
  output: { schema: ExtractNsdaTopicsOutputSchema },
  tools: [getWebpageTextContentTool],
  prompt: `You are an expert at analyzing the National Speech & Debate Association (NSDA) topics page.
  
Your task is to analyze the HTML content of the provided URL (${NSDA_TOPICS_URL}) and extract the CURRENT resolutions for the following debate formats:
1.  **Public Forum Debate** (map to 'PF')
2.  **Lincoln-Douglas Debate** (map to 'LD')
3.  **Policy Debate** (map to 'CX')

For each format, find the active resolution and the corresponding month(s) it is for (e.g., "September/October 2024", "November 2024"). Do NOT extract topics for previous years or national tournaments unless they are the currently listed main topic.

First, you MUST use the 'getWebpageTextContent' tool to fetch the content of the URL: {{{url}}}

Then, analyze the retrieved text to find the resolutions. The resolutions are usually prefixed with "Resolved:". Extract the full resolution text and the associated months for each of the specified formats.

Provide the extracted information in the 'topics' array, mapping the event name to the correct 'type' enum and including the 'months'.
`,
});

const extractNsdaTopicsFlow = ai.defineFlow(
  {
    name: 'extractNsdaTopicsFlow',
    inputSchema: z.void(),
    outputSchema: ExtractNsdaTopicsOutputSchema,
  },
  async () => {
    const { output } = await prompt({ url: NSDA_TOPICS_URL });
    if (!output) {
      throw new Error("AI failed to extract NSDA topics.");
    }
    return output;
  }
);


export async function extractNsdaTopics(): Promise<NsdaTopic[]> {
    const result = await extractNsdaTopicsFlow();
    return result.topics;
}
