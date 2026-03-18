
'use server';
/**
 * @fileOverview A flow for generating practice topics for Extemp and Impromptu.
 * 
 * - generatePracticeTopics - A function that generates topics based on the specified type.
 * - GeneratePracticeTopicsInput - The input type for the flow.
 * - GeneratePracticeTopicsOutput - The return type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GeneratePracticeTopicsInputSchema = z.object({
  type: z.enum(['extemp', 'impromptu']).describe("The type of topics to generate."),
  extempCategory: z.enum(['foreign', 'domestic']).optional().describe("The category for extemp topics."),
});
export type GeneratePracticeTopicsInput = z.infer<typeof GeneratePracticeTopicsInputSchema>;

const GeneratePracticeTopicsOutputSchema = z.object({
  topics: z.array(z.string()).length(3).describe("An array of three topic strings."),
});
export type GeneratePracticeTopicsOutput = z.infer<typeof GeneratePracticeTopicsOutputSchema>;

const extempQuestions = {
    domestic: [
        "Will the Federal Reserve's current monetary policy successfully curb inflation without causing a recession in the United States?",
        "How should the United States government regulate the development of advanced artificial intelligence to mitigate existential risks?",
        "How can the United States best secure its energy infrastructure against foreign cyberattacks?",
        "Is the current U.S. strategy to combat the fentanyl crisis proving effective?",
        "Can the United States reform its immigration system to meet both economic and humanitarian needs?"
    ],
    foreign: [
        "What further steps can the United Nations take to address the humanitarian crisis in Gaza?",
        "How will the increasing use of drone warfare in the Black Sea reshape naval conflict?",
        "Can the European Union forge a unified and effective long-term strategy towards China?",
        "What economic challenges will Argentina face following its recent currency devaluation?",
        "Is the African Union making significant progress in mediating the conflict in Sudan?",
        "What are the prospects for the far-right parties in the upcoming European Parliament elections?",
        "Will expanded BRICS membership challenge the G7's influence on the global economy?",
        "What will be the most significant consequence of Japan's departure from its post-war pacifist constitution?",
        "Can escalating sanctions effectively deter Iran's nuclear program?",
        "What is the future of the Wagner Group's operations in Africa following the death of Yevgeny Prigozhin?",
        "Will Mexico's water crisis lead to significant political instability?",
        "How effective will the Indo-Pacific Economic Framework be in countering China's economic influence in the region?",
        "What steps must be taken to rebuild Ukraine's infrastructure and economy post-war?",
        "What are the primary obstacles to a lasting peace agreement between Armenia and Azerbaijan?",
        "How will climate change impact migration patterns in South Asia over the next decade?",
    ]
};

const impromptuTopics = [
    "The color of Monday",
    "If silence was a sound",
    "A door that only opens once",
    "The secret life of garden gnomes",
    "'Not all those who wander are lost.' - J.R.R. Tolkien",
    "A world without questions",
    "The taste of nostalgia",
    "'The journey of a thousand miles begins with a single step.' - Lao Tzu",
    "What history forgot to write down",
    "The last page of your favorite book",
    "If animals could talk, which would be the rudest?",
    "'I have not failed. I've just found 10,000 ways that won't work.' - Thomas A. Edison",
    "The advice you would give your younger self",
    "A conversation between the sun and the moon",
    "The meaning of a semicolon",
    "If laughter was a currency",
    "'The only thing we have to fear is fear itself.' - Franklin D. Roosevelt",
    "The world inside a snow globe",
    "An invention that should exist, but doesn't",
    "The texture of a memory"
];

function getRandomItems<T>(arr: T[], count: number): T[] {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}


const prompt = ai.definePrompt({
  name: 'generatePracticeTopicsPrompt',
  input: { schema: GeneratePracticeTopicsInputSchema },
  output: { schema: GeneratePracticeTopicsOutputSchema },
  prompt: `You are an AI assistant for a speech and debate team. Your task is to generate practice topics based on CURRENT EVENTS from the past 30 days.

IMPORTANT: You must generate topics based on actual recent events from the past month. Use your knowledge of current events and news from the last 30 days.

Topic Type: {{{type}}}
{{#if extempCategory}}Extemp Category: {{{extempCategory}}}{{/if}}

If the type is 'extemp':
- Generate three UNIQUE and DISTINCT questions about current events that have occurred within the last 30 days
- Each time you are called, generate completely NEW topics - never repeat the same topics
- If the category is 'domestic', focus on recent issues within the United States (politics, economy, social issues, policy changes, court decisions, etc.)
- If the category is 'foreign', focus on recent international issues (conflicts, diplomacy, elections, economic developments, international organizations, etc.)
- The questions should be suitable for a 7-minute analytical speech, requiring evidence and analysis
- Format them as clear, concise questions that would appear in an actual extemp competition
- Examples of good formats:
  * "How will [recent event] impact [stakeholder/situation]?"
  * "Can [entity] successfully address [recent challenge]?"
  * "What are the implications of [recent development]?"
  * "Is [recent policy/action] effective in achieving [goal]?"
- Ensure the topics reflect events from THIS month, not general timeless questions

If the type is 'impromptu':
- Generate three creative prompts that do not require prior knowledge
- These can be abstract concepts, famous quotes, song lyrics, or 'what if' scenarios
- The goal is to inspire a short, creative speech
- Make each set of topics unique and varied

CRITICAL: Each generation must produce DIFFERENT topics. Never repeat topics from previous generations. Draw from the breadth of current events to ensure variety.

Provide the three generated topics in the 'topics' array.
`,
});

const generatePracticeTopicsFlow = ai.defineFlow(
    {
        name: 'generatePracticeTopicsFlow',
        inputSchema: GeneratePracticeTopicsInputSchema,
        outputSchema: GeneratePracticeTopicsOutputSchema,
    },
    async (input) => {
        // Use LLM-based generation for dynamic, current event topics
        try {
            const { output } = await prompt(input);
            if (!output || !output.topics || output.topics.length === 0) {
                throw new Error("AI failed to generate topics.");
            }
            return output;
        } catch (error) {
            console.error('Error generating topics with AI:', error);

            // Fallback to hardcoded lists only if AI generation fails
            if (input.type === 'extemp') {
                const category = input.extempCategory || 'domestic';
                const questionList = extempQuestions[category];
                return { topics: getRandomItems(questionList, 3) };
            } else { // impromptu
                return { topics: getRandomItems(impromptuTopics, 3) };
            }
        }
    }
);


export async function generatePracticeTopics(input: GeneratePracticeTopicsInput): Promise<GeneratePracticeTopicsOutput> {
    return generatePracticeTopicsFlow(input);
}
