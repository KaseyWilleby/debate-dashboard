
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
        oneMonthAgo.setMonth(today.getMonth() - 1);

        const fromDate = oneMonthAgo.toISOString().split('T')[0];
        const toDate = today.toISOString().split('T')[0];

        let url: string;

        if (category === 'domestic') {
            // Fetch US news from the past month (free tier limit)
            url = `https://newsapi.org/v2/everything?q=United+States+OR+US+politics+OR+Congress+OR+Biden+OR+Trump&language=en&from=${fromDate}&to=${toDate}&sortBy=publishedAt&pageSize=100&apiKey=${process.env.NEWS_API_KEY}`;
        } else {
            // Fetch international news from the past month (free tier limit)
            url = `https://newsapi.org/v2/everything?q=international+OR+world+politics+OR+diplomacy+OR+global&language=en&from=${fromDate}&to=${toDate}&sortBy=publishedAt&pageSize=100&apiKey=${process.env.NEWS_API_KEY}`;
        }

        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('NewsAPI request failed:', response.status, response.statusText, errorText);
            return '';
        }

        const data = await response.json();

        if (!data.articles || data.articles.length === 0) {
            console.log('NewsAPI returned no articles');
            return '';
        }

        console.log(`NewsAPI returned ${data.articles.length} articles for ${category}`);

        // Filter articles to only include those from the last month
        const oneMonthAgoTimestamp = oneMonthAgo.getTime();
        const filteredArticles = data.articles.filter((article: any) => {
            const publishedDate = new Date(article.publishedAt).getTime();
            return publishedDate >= oneMonthAgoTimestamp;
        });

        // Extract titles and descriptions from articles
        const newsItems = filteredArticles
            .slice(0, 40)
            .map((article: any) => {
                const title = article.title || '';
                const description = article.description || '';
                const publishedAt = article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : '';
                return `[${publishedAt}] ${title}${description ? ': ' + description : ''}`;
            })
            .filter((item: string) => item.trim().length > 0)
            .join('\n\n');

        console.log(`Prepared ${filteredArticles.length} news items for ${category} questions`);
        return newsItems;
    } catch (error) {
        console.error('Error fetching recent news:', error);
        return '';
    }
}

const GeneratePracticeTopicsInputSchema = z.object({
  type: z.enum(['extemp', 'impromptu']).describe("The type of topics to generate."),
  extempCategory: z.enum(['foreign', 'domestic']).optional().describe("The category for extemp topics."),
  previouslyGenerated: z.array(z.string()).optional().describe("Previously generated questions to avoid duplicates."),
});
export type GeneratePracticeTopicsInput = z.infer<typeof GeneratePracticeTopicsInputSchema>;

const GeneratePracticeTopicsWithNewsInputSchema = z.object({
  type: z.enum(['extemp', 'impromptu']).describe("The type of topics to generate."),
  extempCategory: z.enum(['foreign', 'domestic']).optional().describe("The category for extemp topics."),
  recentNews: z.string().describe("Recent news headlines and articles from the past month."),
  currentDate: z.string().describe("Today's date in YYYY-MM-DD format."),
  previouslyGenerated: z.array(z.string()).optional().describe("Previously generated questions to avoid duplicates."),
});

const GeneratePracticeTopicsOutputSchema = z.object({
  topics: z.array(z.string()).length(3).describe("An array of three topic strings."),
});
export type GeneratePracticeTopicsOutput = z.infer<typeof GeneratePracticeTopicsOutputSchema>;

const extempQuestions = {
    domestic: [
        "Will the Federal Reserve's current monetary policy successfully curb inflation without causing a recession?",
        "How should the United States regulate artificial intelligence development?",
        "Can the United States secure its energy infrastructure against cyberattacks?",
        "Is the current U.S. strategy to combat the fentanyl crisis effective?",
        "Can the United States reform its immigration system?",
        "Will recent Supreme Court decisions weaken federal regulatory authority?",
        "How effective are state-level climate policies in the absence of federal action?",
        "Can bipartisan infrastructure legislation address America's crumbling roads and bridges?",
        "Will student loan forgiveness programs survive legal challenges?",
        "Is the U.S. healthcare system equipped to handle the next pandemic?",
        "How should Congress address Social Security's looming insolvency?",
        "Will expanded child tax credits reduce poverty in America?",
        "Can the United States achieve energy independence through renewable sources?",
        "Is gerrymandering undermining American democracy?",
        "How effective are gun control measures in reducing mass shootings?",
        "Will federal antitrust action successfully break up tech monopolies?",
        "Can the U.S. attract semiconductor manufacturing back from Asia?",
        "Is the electoral college still an effective system for choosing presidents?",
        "How should the United States address homelessness in major cities?",
        "Will teacher pay increases improve American education outcomes?",
        "Can federal legislation protect voting rights in all states?",
        "Is the U.S. criminal justice system effectively addressing recidivism?",
        "How should Congress regulate social media platforms?",
        "Will tariffs on foreign goods strengthen American manufacturing?",
        "Can the United States reduce its national debt without cutting entitlements?",
        "Is political polarization weakening American institutions?",
        "How effective are sanctuary city policies in protecting immigrants?",
        "Will legalizing marijuana at the federal level reduce incarceration rates?",
        "Can the U.S. military maintain readiness with current recruitment levels?",
        "Is the Affordable Care Act achieving its goal of universal coverage?",
        "How should the federal government respond to state abortion bans?",
        "Will expanding Medicaid improve health outcomes in rural America?",
        "Can federal investment revitalize American infrastructure?",
        "Is campaign finance reform necessary to restore trust in democracy?",
        "How effective are federal diversity initiatives in government agencies?",
        "Will increased defense spending deter adversaries?",
        "Can the United States balance border security with humanitarian concerns?",
        "Is the Federal Trade Commission effectively regulating monopolies?",
        "How should Congress address the rising cost of prescription drugs?",
        "Will electric vehicle subsidies accelerate the transition from fossil fuels?"
    ],
    foreign: [
        "What steps can the United Nations take to address humanitarian crises?",
        "How will drone warfare reshape modern conflicts?",
        "Can the European Union develop a unified China strategy?",
        "What economic challenges does Argentina face?",
        "Is the African Union making progress in conflict mediation?",
        "What are the prospects for far-right parties in European elections?",
        "Will BRICS expansion challenge G7 influence?",
        "What are the consequences of Japan's military expansion?",
        "Can sanctions effectively deter nuclear proliferation?",
        "How will climate change impact South Asian migration?",
        "What role should NATO play in Indo-Pacific security?",
        "Can diplomacy resolve the Kashmir conflict between India and Pakistan?",
        "Will China's Belt and Road Initiative increase its global influence?",
        "How effective is the International Criminal Court in prosecuting war crimes?",
        "Can ASEAN maintain neutrality amid U.S.-China competition?",
        "What challenges does the European energy transition face?",
        "Will sanctions compel Russia to withdraw from Ukraine?",
        "How can international institutions address cybersecurity threats?",
        "Is democracy declining in Latin America?",
        "What impact will artificial intelligence have on global labor markets?",
        "Can the World Health Organization prepare for future pandemics?",
        "Will renewable energy reduce Middle Eastern oil influence?",
        "How should democracies respond to authoritarian tech surveillance?",
        "Can international cooperation mitigate climate change?",
        "What challenges does Taiwan face from Chinese pressure?",
        "Will nuclear deterrence prevent major power conflicts?",
        "How effective are peacekeeping operations in Africa?",
        "Can Europe reduce its dependence on Russian energy?",
        "What role should the UN play in Arctic governance?",
        "Will India emerge as a counterbalance to China?",
        "How can countries address mass refugee movements?",
        "Is the global food supply chain resilient to climate shocks?",
        "What challenges do Pacific island nations face from rising seas?",
        "Can international law constrain great power competition?",
        "Will automation increase global inequality?",
        "How should democracies respond to election interference?",
        "Can multilateral institutions adapt to multipolarity?",
        "What impact will demographic decline have on developed nations?",
        "Will space exploration lead to new geopolitical conflicts?",
        "How can international cooperation combat human trafficking?",
        "Is globalization reversing in the 21st century?",
        "What challenges does NATO face in the Black Sea region?",
        "Can economic sanctions change authoritarian behavior?",
        "Will the International Monetary Fund reforms benefit developing nations?",
        "How should countries balance economic growth with environmental protection?",
        "Can regional organizations prevent ethnic conflicts?",
        "What role should the United States play in Middle East peace?",
        "Will technological competition reshape global alliances?",
        "How can countries combat disinformation campaigns?",
        "Is nuclear energy essential for achieving climate goals?"
    ]
};

const impromptuTopics = [
    // Creative and Abstract
    "The color of Monday",
    "If silence was a sound",
    "A door that only opens once",
    "The secret life of garden gnomes",
    "A world without questions",
    "The taste of nostalgia",
    "What history forgot to write down",
    "The last page of your favorite book",
    "If animals could talk, which would be the rudest?",
    "A conversation between the sun and the moon",
    "The meaning of a semicolon",
    "If laughter was a currency",
    "The world inside a snow globe",
    "An invention that should exist, but doesn't",
    "The texture of a memory",
    "If time had a flavor",
    "The weight of a whisper",
    "A mirror that shows your future",
    "The language of rain",
    "If dreams were downloadable",
    "The soundtrack of your life",
    "A book that writes itself",
    "If thoughts had colors",
    "The shape of happiness",
    "A clock that runs backwards",

    // Famous Quotes
    "'Not all those who wander are lost.' - J.R.R. Tolkien",
    "'The journey of a thousand miles begins with a single step.' - Lao Tzu",
    "'I have not failed. I've just found 10,000 ways that won't work.' - Thomas A. Edison",
    "'The only thing we have to fear is fear itself.' - Franklin D. Roosevelt",
    "'Be the change you wish to see in the world.' - Gandhi",
    "'In three words I can sum up everything I've learned about life: it goes on.' - Robert Frost",
    "'To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.' - Ralph Waldo Emerson",
    "'The unexamined life is not worth living.' - Socrates",
    "'It is during our darkest moments that we must focus to see the light.' - Aristotle",
    "'Life is what happens when you're busy making other plans.' - John Lennon",

    // What If Scenarios
    "If cats ruled the world",
    "If cars could talk",
    "If Monday was a person",
    "If you could pause time for 10 seconds every hour",
    "If everyone's thoughts appeared as text above their heads",
    "If plants could walk",
    "If memories were tradeable",
    "If you could relive one day, which would it be?",
    "If emotions were visible",
    "If books could choose their readers",
    "If music was mandatory",
    "If kindness was a superpower",
    "If you could only ask questions, never make statements",
    "If failure was celebrated more than success",

    // Personal Reflection
    "The advice you would give your younger self",
    "A lesson learned the hard way",
    "Your biggest fear and why",
    "The moment you felt most alive",
    "A risk worth taking",
    "The person who changed your perspective",
    "Your proudest achievement",
    "A mistake that taught you something valuable",
    "The meaning of home",
    "What makes you unique",
    "Your definition of success",
    "The power of saying no",
    "Learning from failure",
    "The importance of authenticity",

    // Social and Contemporary
    "The impact of social media on friendships",
    "Why kindness matters",
    "The value of disconnecting",
    "First impressions versus lasting impressions",
    "The art of listening",
    "Why small talk isn't so small",
    "The power of a compliment",
    "Standing up for what you believe",
    "The importance of mental health awareness",
    "Finding balance in a busy world",
    "The role of humor in difficult times",
    "Why vulnerability is strength",
    "The importance of stepping outside your comfort zone",
    "Making time for what matters",

    // Everyday Objects with Meaning
    "An empty chair",
    "A broken compass",
    "A locked diary",
    "An old photograph",
    "A paper airplane",
    "An hourglass",
    "A red balloon",
    "A handwritten letter",
    "A worn-out pair of shoes",
    "A blank canvas",
    "A broken clock",
    "A seashell",
    "An unopened gift",
    "A coffee stain",

    // Fun and Lighthearted
    "Why Mondays get a bad rap",
    "If your pet could give you one piece of advice",
    "The secret talent you wish you had",
    "A day in the life of a pencil",
    "Why socks disappear in the laundry",
    "The perfect Saturday",
    "If you could have dinner with any fictional character",
    "Things that make you smile",
    "Your favorite childhood memory",
    "A food that describes your personality",
    "The most embarrassing thing that's ever happened to you",
    "If you could be invisible for a day",
    "Your unpopular opinion",
    "A conspiracy theory you find amusing",

    // Values and Character
    "The meaning of integrity",
    "Why perseverance pays off",
    "The value of honesty",
    "What it means to be brave",
    "The importance of gratitude",
    "Leading by example",
    "The power of forgiveness",
    "What friendship really means",
    "The courage to be different",
    "Why empathy matters",
    "The strength in admitting you're wrong",
    "What it means to be a good person",
    "The importance of keeping promises",
    "Standing alone versus following the crowd",

    // Education and Growth
    "Why failure is the best teacher",
    "The most important lesson school doesn't teach",
    "Learning from mistakes",
    "The value of curiosity",
    "Why asking questions is important",
    "What makes a great teacher",
    "The importance of reading",
    "Skills everyone should learn",
    "The power of practice",
    "Why creativity matters",
    "Learning something new every day",
    "The role of education in society",
    "Why critical thinking is essential",
    "The importance of being a lifelong learner",

    // Technology and Future
    "Life before smartphones",
    "The benefits and drawbacks of technology",
    "If AI could feel emotions",
    "The future of communication",
    "Technology's impact on relationships",
    "The digital footprint we leave behind",
    "Screen time: friend or foe?",
    "Virtual reality versus real reality",
    "The evolution of social connection",
    "Privacy in the digital age",

    // Nature and Environment
    "What nature teaches us",
    "The importance of protecting our planet",
    "A world without trees",
    "The ocean's secrets",
    "Seasons as metaphors for life",
    "The power of a sunrise",
    "Why we need wild spaces",
    "The wisdom of animals",
    "Climate change and our responsibility",
    "The beauty in everyday nature",

    // Time and Change
    "If you could time travel, where would you go?",
    "The importance of living in the present",
    "How change shapes us",
    "Looking back versus looking forward",
    "The power of a single moment",
    "Why we fear change",
    "Making the most of today",
    "The passage of time",
    "Growing older, growing wiser",
    "The value of patience"
];

function getRandomItems<T>(arr: T[], count: number): T[] {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}


const prompt = ai.definePrompt({
  name: 'generatePracticeTopicsPrompt',
  input: { schema: GeneratePracticeTopicsWithNewsInputSchema },
  output: { schema: GeneratePracticeTopicsOutputSchema },
  prompt: `You are an AI assistant for a speech and debate team. Your task is to generate practice topics based on ACTUAL CURRENT NEWS from the past month.

CURRENT DATE: {{{currentDate}}}

Topic Type: {{{type}}}
{{#if extempCategory}}Extemp Category: {{{extempCategory}}}{{/if}}

RECENT NEWS HEADLINES (from the past month):
---
{{{recentNews}}}
---

{{#if previouslyGenerated}}
PREVIOUSLY GENERATED QUESTIONS (DO NOT REPEAT THESE):
---
{{#each previouslyGenerated}}
- {{{this}}}
{{/each}}
---

CRITICAL: You MUST generate completely new and original questions that are DIFFERENT from all the questions listed above. Do not use similar wording, topics, or themes.
{{/if}}

If the type is 'extemp':
- You MUST generate three UNIQUE and DISTINCT questions based SPECIFICALLY on the news headlines provided above
- Each question must reference an actual event, development, or issue from the recent news (within the past month)
- DO NOT generate generic or timeless questions - they must be tied to specific recent events
- If the category is 'domestic', focus on US news items from the list above - PRIORITIZE POLITICAL NEWS (Congress, White House, elections, policies, courts, regulations, political conflicts)
- If the category is 'foreign', focus on international news items from the list above - PRIORITIZE POLITICAL NEWS (international relations, diplomacy, elections, government policies, conflicts, geopolitical developments)

TWO TYPES OF QUESTIONS TO GENERATE:

TYPE 1 - DIRECT INFORMATION-BASED QUESTIONS:
These questions ask students to use information from articles to answer a direct question about recent events.
Examples:
  * "How have NATO members reacted to [recent development]?"
  * "What measures has [entity] taken in response to [recent event]?"
  * "What factors contributed to [recent political outcome]?"
  * "How has [recent policy/action] impacted [stakeholder group]?"

TYPE 2 - ANALYTICAL/OPINION-BASED QUESTIONS:
These questions require students to analyze articles and infer a response, forming an evidence-based opinion.
Examples:
  * "Will [recent policy/action] achieve [stated goal]?"
  * "Can [entity] overcome [recent challenge]?"
  * "Is [politician/administration] succeeding in [recent effort]?"
  * "Should [country/organization] pursue [recent policy approach]?"
  * "Has [recent event] strengthened or weakened [stakeholder]?"

GENERATE A MIX OF BOTH TYPES - at least one of each type among your three questions.

CRITICAL REQUIREMENTS:
1. Keep questions CLEAR and FOCUSED - typically 10-16 words
2. PRIORITIZE POLITICAL TOPICS - government, elections, policies, political figures, legislation, court decisions, political conflicts, diplomacy
3. Questions must be answerable using information from online articles (news sites, expert analysis, government reports, etc.)
4. Each question must reference a SPECIFIC event, person, policy, or development from the news headlines provided (within past month)
5. Generate COMPLETELY ORIGINAL questions - never repeat previously generated topics or use similar wording
6. Use variety - pick from different news items in the list
7. Questions should invite 1-3 main analytical points supported by evidence

If the type is 'impromptu':
- Generate three creative prompts that do not require prior knowledge
- These can be abstract concepts, famous quotes, song lyrics, or 'what if' scenarios
- The goal is to inspire a short, creative speech
- Make each set of topics unique and varied

Provide the three generated topics in the 'topics' array.
`,
});

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelayMs: number = 1000
): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;

            // Check if error is retryable (rate limit or service unavailable)
            const errorMessage = error?.message || String(error);
            const isRateLimit = errorMessage.includes('429') || errorMessage.includes('Too Many Requests');
            const isServiceUnavailable = errorMessage.includes('503') || errorMessage.includes('Service Unavailable') || errorMessage.includes('high demand');

            if (!isRateLimit && !isServiceUnavailable) {
                // Non-retryable error, throw immediately
                throw error;
            }

            if (attempt < maxRetries) {
                // Calculate delay with exponential backoff: 1s, 2s, 4s
                const delayMs = initialDelayMs * Math.pow(2, attempt);
                console.log(`AI request failed (${isRateLimit ? 'rate limit' : 'service unavailable'}), retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})...`);
                await sleep(delayMs);
            }
        }
    }

    // All retries exhausted
    throw lastError;
}

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

                // Retry AI generation with exponential backoff
                const { output } = await retryWithBackoff(
                    async () => {
                        return await prompt({
                            type: input.type,
                            extempCategory: input.extempCategory,
                            recentNews,
                            currentDate,
                            previouslyGenerated: input.previouslyGenerated || [],
                        });
                    },
                    3, // max 3 retries
                    1000 // start with 1 second delay
                );

                if (!output || !output.topics || output.topics.length === 0) {
                    throw new Error("AI failed to generate topics.");
                }

                console.log(`Successfully generated ${output.topics.length} AI-powered topics for ${input.extempCategory}`);
                return output;
            } catch (error) {
                console.error('Error generating topics with AI and news (after retries):', error);
                // Fall through to fallback
            }
        }

        // Fallback to hardcoded lists if no news or AI generation fails
        if (input.type === 'extemp') {
            const category = input.extempCategory || 'domestic';
            const questionList = extempQuestions[category];

            console.log(`[Fallback] Category: ${category}, Total questions: ${questionList.length}, Previously generated: ${input.previouslyGenerated?.length || 0}`);

            // Filter out previously generated questions if provided
            const availableQuestions = input.previouslyGenerated && input.previouslyGenerated.length > 0
                ? questionList.filter(q => !input.previouslyGenerated?.includes(q))
                : questionList;

            console.log(`[Fallback] Available questions after filtering: ${availableQuestions.length}`);

            // If we've exhausted all questions, reset and use all questions again
            const questionsToUse = availableQuestions.length >= 3 ? availableQuestions : questionList;

            if (questionsToUse === questionList && availableQuestions.length < questionList.length) {
                console.log(`[Fallback] Resetting question pool - all ${questionList.length} questions have been used`);
            }

            return { topics: getRandomItems(questionsToUse, 3) };
        } else { // impromptu
            console.log(`[Fallback] Impromptu - Total topics: ${impromptuTopics.length}, Previously generated: ${input.previouslyGenerated?.length || 0}`);

            // Filter out previously generated topics if provided
            const availableTopics = input.previouslyGenerated && input.previouslyGenerated.length > 0
                ? impromptuTopics.filter(t => !input.previouslyGenerated?.includes(t))
                : impromptuTopics;

            console.log(`[Fallback] Available topics after filtering: ${availableTopics.length}`);

            // If we've exhausted all topics, reset and use all topics again
            const topicsToUse = availableTopics.length >= 3 ? availableTopics : impromptuTopics;

            if (topicsToUse === impromptuTopics && availableTopics.length < impromptuTopics.length) {
                console.log(`[Fallback] Resetting topic pool - all ${impromptuTopics.length} topics have been used`);
            }

            return { topics: getRandomItems(topicsToUse, 3) };
        }
    }
);


export async function generatePracticeTopics(input: GeneratePracticeTopicsInput): Promise<GeneratePracticeTopicsOutput> {
    return generatePracticeTopicsFlow(input);
}
