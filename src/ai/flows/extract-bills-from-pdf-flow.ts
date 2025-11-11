'use server';
/**
 * @fileOverview An AI flow for extracting bills from a PDF docket.
 * 
 * - extractBillsFromPdf - A function that handles the PDF parsing and bill extraction.
 * - ExtractBillsInput - The input type for the flow.
 * - ExtractBillsOutput - The return type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { CongressBill } from '@/lib/types';

const ExtractBillsInputSchema = z.object({
  docketName: z.string().describe("The name for the new docket."),
  pdfDataUri: z.string().describe("A PDF file of the docket, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:application/pdf;base64,<encoded_data>'."),
});
export type ExtractBillsInput = z.infer<typeof ExtractBillsInputSchema>;

const CongressBillSchema = z.object({
  title: z.string().describe("The full title of the bill or resolution."),
  fullText: z.string().describe("The complete text of the bill or resolution, including all sections, clauses, and resolving statements."),
});

const ExtractBillsOutputSchema = z.object({
    bills: z.array(CongressBillSchema).describe("An array of all bills and resolutions found in the document."),
});
export type ExtractBillsOutput = z.infer<typeof ExtractBillsOutputSchema>;

const prompt = ai.definePrompt({
    name: 'extractBillsFromPdfPrompt',
    input: { schema: ExtractBillsInputSchema },
    output: { schema: ExtractBillsOutputSchema },
    prompt: `You are an expert assistant for a speech and debate team. Your task is to parse a legislative docket from the provided PDF and extract all the bills and resolutions.

Analyze the document and identify each individual bill or resolution. For each piece of legislation, extract two things:
1.  **title**: The full, official title (e.g., "A Bill to Establish a National Carbon Tax", "A Resolution to Ratify the Treaty on the Prohibition of Nuclear Weapons").
2.  **fullText**: The entire body of the legislation, starting from "BE IT ENACTED" or "WHEREAS" all the way to the final section or resolving clause.

Return the extracted information as an array of objects in the 'bills' field.

Here is the document:
---
{{media url=pdfDataUri}}
---
`,
});


const extractBillsFlow = ai.defineFlow(
  {
    name: 'extractBillsFlow',
    inputSchema: ExtractBillsInputSchema,
    outputSchema: ExtractBillsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);

    if (!output) {
        throw new Error("AI failed to extract bills from the PDF.");
    }
    
    return output;
  }
);


export async function extractBillsFromPdf(input: ExtractBillsInput): Promise<CongressBill[]> {
    const result = await extractBillsFlow(input);
    return result.bills.map(bill => ({
        id: `bill-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        ...bill
    }));
}
