
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

/**
 * Fetches recent news headlines using NewsAPI
 */
async function fetchRecentNews(category: 'domestic' | 'foreign'): Promise<string> {
    try {
        const today = new Date();
        const oneMonthAgo = new Date();
        oneMonthAgo.setDate(today.getDate() - 30);

        const fromDate = oneMonthAgo.toISOString().split('T')[0];
        const toDate = today.toISOString().split('T')[0];

        let url: string;

        if (category === 'domestic') {
            // Fetch US news
            url = `https://newsapi.org/v2/top-headlines?country=us&pageSize=20&apiKey=${process.env.NEWS_API_KEY}`;
        } else {
            // Fetch international news
            url = `https://newsapi.org/v2/top-headlines?category=general&pageSize=20&apiKey=${process.env.NEWS_API_KEY}`;
        }

        const response = await fetch(url);

        if (!response.ok) {
            console.warn('NewsAPI request failed, using fallback');
            return '';
        }

        const data = await response.json();

        if (!data.articles || data.articles.length === 0) {
            return '';
        }

        // Extract titles and descriptions from articles
        const newsItems = data.articles
            .slice(0, 15)
            .map((article: any) => {
                const title = article.title || '';
                const description = article.description || '';
                return `${title}${description ? ': ' + description : ''}`;
            })
            .filter((item: string) => item.trim().length > 0)
            .join('\n\n');

        return newsItems;
    } catch (error) {
        console.error('Error fetching recent news:', error);
        return '';
    }
}

const GeneratePracticeTopicsInputSchema = z.object({
  type: z.enum(['extemp', 'impromptu']).describe("The type of topics to generate."),
  extempCategory: z.enum(['foreign', 'domestic']).optional().describe("The category for extemp topics."),
});
export type GeneratePracticeTopicsInput = z.infer<typeof GeneratePracticeTopicsInputSchema>;

const GeneratePracticeTopicsWithNewsInputSchema = z.object({
  type: z.enum(['extemp', 'impromptu']).describe("The type of topics to generate."),
  extempCategory: z.enum(['foreign', 'domestic']).optional().describe("The category for extemp topics."),
  recentNews: z.string().describe("Recent news headlines and articles from the past month."),
  currentDate: z.string().describe("Today's date in YYYY-MM-DD format."),
});

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
  input: { schema: GeneratePracticeTopicsWithNewsInputSchema },
  output: { schema: GeneratePracticeTopicsOutputSchema },
  prompt: `You are an AI assistant for a speech and debate team. Your task is to generate practice topics based on ACTUAL CURRENT NEWS from the past 30 days.

CURRENT DATE: {{{currentDate}}}

Topic Type: {{{type}}}
{{#if extempCategory}}Extemp Category: {{{extempCategory}}}{{/if}}

RECENT NEWS HEADLINES (from the past month):
---
{{{recentNews}}}
---

If the type is 'extemp':
- You MUST generate three UNIQUE and DISTINCT questions based SPECIFICALLY on the news headlines provided above
- Each question must reference an actual event, development, or issue from the recent news
- DO NOT generate generic or timeless questions - they must be tied to specific recent events
- If the category is 'domestic', focus on US news items from the list above
- If the category is 'foreign', focus on international news items from the list above
- Keep questions SIMPLE, CLEAR, and STRAIGHTFORWARD - avoid complex multi-part questions
- Questions should be suitable for high school students preparing for extemp competitions
- Preferred formats (use simple, direct language):
  * "What is happening with [recent event/topic]?"
  * "Why is [recent event] important?"
  * "What caused [recent event]?"
  * "How will [recent event] affect [people/country/situation]?"
  * "What should be done about [recent issue]?"
  * "Is [recent policy/action] working?"

CRITICAL REQUIREMENTS:
1. Keep questions SHORT and SIMPLE - no more than 10-12 words
2. Every topic MUST reference a specific event, person, policy, or development from the news headlines provided
3. Each generation must produce DIFFERENT topics - never repeat the same topics
4. Use variety - pick from different news items in the list
5. Avoid overly complex or academic language - use conversational, accessible wording

If the type is 'impromptu':
- Generate three creative prompts that do not require prior knowledge
- These can be abstract concepts, famous quotes, song lyrics, or 'what if' scenarios
- The goal is to inspire a short, creative speech
- Make each set of topics unique and varied

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
        // Fetch recent news if generating extemp topics
        let recentNews = '';
        if (input.type === 'extemp' && input.extempCategory) {
            recentNews = await fetchRecentNews(input.extempCategory);
        }

        // If we have news, use LLM-based generation with news context
        if (recentNews && input.type === 'extemp') {
            try {
                const currentDate = new Date().toISOString().split('T')[0];
                const { output } = await prompt({
                    ...input,
                    recentNews,
                    currentDate,
                });
                if (!output || !output.topics || output.topics.length === 0) {
                    throw new Error("AI failed to generate topics.");
                }
                return output;
            } catch (error) {
                console.error('Error generating topics with AI and news:', error);
                // Fall through to fallback
            }
        }

        // Fallback to hardcoded lists if no news or AI generation fails
        if (input.type === 'extemp') {
            const category = input.extempCategory || 'domestic';
            const questionList = extempQuestions[category];
            return { topics: getRandomItems(questionList, 3) };
        } else { // impromptu
            return { topics: getRandomItems(impromptuTopics, 3) };
        }
    }
);


export async function generatePracticeTopics(input: GeneratePracticeTopicsInput): Promise<GeneratePracticeTopicsOutput> {
    return generatePracticeTopicsFlow(input);
}
