(globalThis.TURBOPACK = globalThis.TURBOPACK || []).push([typeof document === "object" ? document.currentScript : undefined, {

"[project]/src/lib/learning-resources.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname, k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "congressResources": (()=>congressResources),
    "debateEventsOrder": (()=>debateEventsOrder),
    "debateResources": (()=>debateResources),
    "initialResources": (()=>initialResources),
    "interpEventsOrder": (()=>interpEventsOrder),
    "interpResources": (()=>interpResources),
    "platformResources": (()=>platformResources),
    "speechResources": (()=>speechResources)
});
const platformResources = [
    {
        id: 'nsda-home',
        type: 'website',
        event: 'Platform Guides',
        title: 'National Speech & Debate Association (NSDA)',
        description: 'The official source for topics, rules, and resources for all speech and debate formats.',
        url: 'https://www.speechanddebate.org/'
    },
    {
        id: 'tabroom-home',
        type: 'website',
        event: 'Platform Guides',
        title: 'Tabroom.com',
        description: 'The primary platform for tournament registration, pairings, and results in the United States.',
        url: 'https://www.tabroom.com/'
    },
    {
        id: 'uil-home',
        type: 'website',
        event: 'Platform Guides',
        title: 'UIL Speech & Debate',
        description: 'Official website for the University Interscholastic League (UIL), governing speech and debate activities in Texas.',
        url: 'https://www.uiltexas.org/speech-debate'
    }
];
const debateEventsOrder = [
    'All Debate',
    'Lincoln-Douglas Debate',
    'Public Forum Debate',
    'Policy Debate',
    'World Schools Debate',
    'Big Questions Debate'
];
const interpEventsOrder = [
    'Interpretation (General)',
    'Humorous Interpretation',
    'Dramatic Interpretation',
    'Duo Interpretation',
    'Program Oral Interpretation',
    'Prose',
    'Poetry'
];
const debateResources = [
    {
        id: 'ld-intro',
        type: 'video',
        event: 'Lincoln-Douglas Debate',
        title: 'Intro to Lincoln-Douglas Debate',
        description: 'A great starting point for understanding the fundamentals of LD debate, from values to impacts.',
        videoId: 'PL8Kx3g2VnC-4',
        rules: {
            NSDA: `Speech Times:
- Affirmative Constructive: 6 minutes
- Negative Cross-Examination: 3 minutes
- Negative Constructive: 7 minutes
- Affirmative Cross-Examination: 3 minutes
- First Affirmative Rebuttal: 4 minutes
- Negative Rebuttal: 6 minutes
- Second Affirmative Rebuttal: 3 minutes
Prep Time: 4 minutes per debater.`,
            TFA: `Speech Times:
- Affirmative Constructive: 6 minutes
- Negative Cross-Examination: 3 minutes
- Negative Constructive: 7 minutes
- Affirmative Cross-Examination: 3 minutes
- First Affirmative Rebuttal: 4 minutes
- Negative Rebuttal: 6 minutes
- Second Affirmative Rebuttal: 3 minutes
Prep Time: 4 minutes per debater.`,
            UIL: `Speech Times:
- Affirmative Constructive: 6 minutes
- Negative Cross-Examination of Affirmative: 3 minutes
- Negative Constructive: 7 minutes
- Affirmative Cross-Examination of Negative: 3 minutes
- First Affirmative Rebuttal: 4 minutes
- Negative Rebuttal: 6 minutes
- Second Affirmative Rebuttal: 3 minutes
Prep Time: 4 minutes per debater.`
        }
    },
    {
        id: 'ld-value-criterion',
        type: 'video',
        event: 'Lincoln-Douglas Debate',
        title: 'Intro to Value and Criterion in LD Debate',
        description: 'Learn how to select and defend a value and criterion, the core of traditional LD framework debate. From the NSDA.',
        videoId: '0hOfGq18Jcc'
    },
    {
        id: 'ld-intro-website',
        type: 'website',
        event: 'Lincoln-Douglas Debate',
        title: 'Introduction to Lincoln-Douglas Debate',
        description: 'A comprehensive written guide from the NSDA covering the basics of LD, including format, philosophy, and case construction.',
        url: 'https://www.speechanddebate.org/introduction-to-lincoln-douglas-debate/'
    },
    {
        id: 'pf-weighing-guide',
        type: 'website',
        event: 'Public Forum Debate',
        title: 'A Guide to Weighing in Public Forum',
        description: 'This NSDA resource explains the critical skill of weighing, or telling the judge why your arguments matter more than your opponents\'.',
        url: 'https://www.speechanddebate.org/a-guide-to-weighing-in-public-forum-debate/',
        rules: {
            NSDA: `Speech Times:
- Team A Speaker 1 (Constructive): 4 minutes
- Team B Speaker 1 (Constructive): 4 minutes
- Crossfire: 3 minutes
- Team A Speaker 2 (Rebuttal): 4 minutes
- Team B Speaker 2 (Rebuttal): 4 minutes
- Crossfire: 3 minutes
- Team A Speaker 1 (Summary): 3 minutes
- Team B Speaker 1 (Summary): 3 minutes
- Grand Crossfire: 3 minutes
- Team A Speaker 2 (Final Focus): 2 minutes
- Team B Speaker 2 (Final Focus): 2 minutes
Prep Time: 3 minutes per team.`,
            TFA: `Speech Times and Prep are the same as NSDA. Coin flip determines side and speaking order.`,
            UIL: `Speech Times:
- Team A Speaker 1 (Constructive): 4 minutes
- Team B Speaker 1 (Constructive): 4 minutes
- Crossfire: 3 minutes
- Team A Speaker 2 (Rebuttal): 4 minutes
- Team B Speaker 2 (Rebuttal): 4 minutes
- Crossfire: 3 minutes
- Team A Speaker 1 (Summary): 2 minutes
- Team B Speaker 1 (Summary): 2 minutes
- Grand Crossfire: 3 minutes
- Team A Speaker 2 (Final Focus): 2 minutes
- Team B Speaker 2 (Final Focus): 2 minutes
Prep Time: 2 minutes per team.`
        }
    },
    {
        id: 'pf-intro',
        type: 'video',
        event: 'Public Forum Debate',
        title: 'Public Forum Debate Basics',
        description: 'An introductory video covering the core concepts and structure of a Public Forum round.',
        videoId: '3-Wq2-w_J3Y'
    },
    {
        id: 'pf-crossfire',
        type: 'video',
        event: 'Public Forum Debate',
        title: 'Crossfire in Public Forum Debate',
        description: 'An NSDA video explaining the strategies and purpose of the Crossfire questioning periods in PF debate.',
        videoId: 'A3y26t98s2A'
    },
    {
        id: 'cx-intro-website',
        type: 'website',
        event: 'Policy Debate',
        title: 'Introduction to Policy Debate',
        description: 'Learn about the oldest debate format, including stock issues, disadvantages, and counterplans, in this guide from the NSDA.',
        url: 'https://www.speechanddebate.org/introduction-to-policy-debate/',
        rules: {
            NSDA: `Speech Times (8-minute format):
- 1AC (First Affirmative Constructive): 8 minutes
- Cross-Examination by 2NC: 3 minutes
- 1NC (First Negative Constructive): 8 minutes
- Cross-Examination by 1AC: 3 minutes
- 2AC (Second Affirmative Constructive): 8 minutes
- Cross-Examination by 1NC: 3 minutes
- 2NC (Second Negative Constructive): 8 minutes
- Cross-Examination by 2AC: 3 minutes
- 1NR (First Negative Rebuttal): 5 minutes
- 1AR (First Affirmative Rebuttal): 5 minutes
- 2NR (Second Negative Rebuttal): 5 minutes
- 2AR (Second Affirmative Rebuttal): 5 minutes
Prep Time: 8 minutes per team.`,
            TFA: `Speech Times and Prep are the same as NSDA 8-minute format. Some tournaments may use a 10-minute prep time variant.`,
            UIL: `Speech Times:
- 1AC (First Affirmative Constructive): 8 minutes
- Cross-Examination by 2N: 3 minutes
- 1NC (First Negative Constructive): 8 minutes
- Cross-Examination by 1A: 3 minutes
- 2AC (Second Affirmative Constructive): 8 minutes
- Cross-Examination by 1N: 3 minutes
- 2NC (Second Negative Constructive): 8 minutes
- Cross-Examination by 2A: 3 minutes
- 1NR (First Negative Rebuttal): 5 minutes
- 1AR (First Affirmative Rebuttal): 5 minutes
- 2NR (Second Negative Rebuttal): 5 minutes
- 2AR (Second Affirmative Rebuttal): 5 minutes
Prep Time: 8 minutes per team.`
        }
    },
    {
        id: 'cx-k-intro',
        type: 'video',
        event: 'Policy Debate',
        title: 'Introduction to Kritiks',
        description: 'An introductory explanation of what a "Kritik" or "K" is in policy debate, covering the basic parts: link, impact, and alternative.',
        videoId: '2QSk02sk1vY'
    },
    {
        id: 'cx-stock-issues',
        type: 'video',
        event: 'Policy Debate',
        title: 'Understanding the Stock Issues',
        description: 'A deep dive into the five stock issues (Significance, Harms, Inherency, Topicality, Solvency) that form the foundation of policy debate.',
        videoId: 'YCWaC-a2E5Y'
    },
    {
        id: 'wsd-intro-website',
        type: 'website',
        event: 'World Schools Debate',
        title: 'Introduction to World Schools Debate',
        description: 'The NSDA\'s guide to the unique format of World Schools Debate, which combines prepared and impromptu argumentation.',
        url: 'https://www.speechanddebate.org/introduction-to-world-schools-debate/',
        rules: {
            NSDA: `Team size: 3-5 members per team, 3 speak in any given debate.
Speech Times:
- Proposition Speaker 1: 8 minutes
- Opposition Speaker 1: 8 minutes
- Proposition Speaker 2: 8 minutes
- Opposition Speaker 2: 8 minutes
- Proposition Speaker 3: 8 minutes
- Opposition Speaker 3: 8 minutes
- Opposition Reply: 4 minutes
- Proposition Reply: 4 minutes
Points of Information (POIs) may be offered after the first minute and before the last minute of constructive speeches.`,
            TFA: `Follows NSDA rules for World Schools Debate.`
        }
    },
    {
        id: 'wsd-poi',
        type: 'video',
        event: 'World Schools Debate',
        title: 'Points of Information (POIs)',
        description: 'A brief tutorial on how to effectively offer and respond to Points of Information (POIs) in World Schools Debate.',
        videoId: 'M7KENuI9K3g'
    },
    {
        id: 'debate-refutation',
        type: 'video',
        event: 'All Debate',
        title: 'The Art of Refutation',
        description: 'Learn the four-step process for effectively responding to and dismantling your opponent\'s arguments.',
        videoId: 'VvN29K1s8vQ'
    },
    {
        id: 'debate-flowing',
        type: 'website',
        event: 'All Debate',
        title: 'A Guide to Flowing Debate Rounds',
        description: 'A comprehensive guide on different methods of "flowing" (taking notes) in a debate round to keep track of all the arguments.',
        url: 'https://www.speechanddebate.org/a-guide-to-flowing-in-debate/'
    },
    {
        id: 'tfa-debate-rules',
        type: 'website',
        event: 'All Debate',
        title: 'TFA Standing Rules - Debate',
        description: 'The official TFA rules for all debate events.',
        url: 'https://www.texasforensicassociation.org/constitution-and-standing-rules',
        rules: {
            TFA: `Refer to the official TFA Constitution and Standing Rules for detailed regulations on all events.`
        }
    }
];
const speechResources = [
    {
        id: 'extemp-structure',
        type: 'video',
        event: 'Extemporaneous Speaking',
        title: 'How to Structure an Extemp Speech',
        description: 'Learn the "3x2" structure that is essential for success in extemporaneous speaking.',
        videoId: '3KLg-CjG-yE'
    },
    {
        id: 'extemp-delivery',
        type: 'video',
        event: 'Extemporaneous Speaking',
        title: 'Tips for Extemporaneous Speaking Delivery',
        description: 'A video guide from the NSDA on improving your delivery, from gestures to vocal variety.',
        videoId: 'N8qS-t4pLpA'
    },
    {
        id: 'extemp-com',
        type: 'website',
        event: 'Extemporaneous Speaking',
        title: 'Extemp.com',
        description: 'A dedicated resource for extempers, with topic analysis, practice questions, and more.',
        url: 'https://extemp.com/'
    },
    {
        id: 'oratory-101',
        type: 'website',
        event: 'Original Oratory',
        title: 'Original Oratory 101',
        description: 'A comprehensive guide to writing and delivering a compelling oratory.',
        url: 'https://www.speechanddebate.org/original-oratory-101/'
    },
    {
        id: 'oratory-writing',
        type: 'video',
        event: 'Original Oratory',
        title: 'How to Write an Oratory',
        description: 'A step-by-step guide on the process of writing a compelling Original Oratory, from brainstorming to polishing.',
        videoId: '5xMw2yQ4jM0'
    },
    {
        id: 'oratory-finding-topics',
        type: 'website',
        event: 'Original Oratory',
        title: 'Brainstorming Oratory Topics',
        description: 'Tips and strategies for finding a unique and passionate topic for your Original Oratory that you can speak on for an entire season.',
        url: 'https://www.speechanddebate.org/finding-your-oratory-topic/'
    },
    {
        id: 'info-intro',
        type: 'website',
        event: 'Informative Speaking',
        title: 'Introduction to Informative Speaking',
        description: 'An overview from the NSDA on the goals and structure of an Informative speech.',
        url: 'https://www.speechanddebate.org/introduction-to-informative-speaking/'
    },
    {
        id: 'info-visual-aids',
        type: 'video',
        event: 'Informative Speaking',
        title: 'Using Visual Aids in Informative Speaking',
        description: 'Learn how to effectively create and integrate visual aids into your informative presentation.',
        videoId: 'nIuCMaJb65I'
    },
    {
        id: 'speech-impromptu',
        type: 'video',
        event: 'Speech (General)',
        title: 'Impromptu Speaking Structure',
        description: 'Learn common structures for Impromptu Speaking, such as PREP (Point, Reason, Example, Point), to organize your thoughts quickly.',
        videoId: 'hMMvj4aa2_c'
    },
    {
        id: 'tfa-speech-rules',
        type: 'website',
        event: 'Speech (General)',
        title: 'TFA Standing Rules - Speech',
        description: 'The official TFA rules for all speech events.',
        url: 'https://www.texasforensicassociation.org/constitution-and-standing-rules',
        rules: {
            TFA: `Refer to the official TFA Constitution and Standing Rules for detailed regulations on all events.`
        }
    }
];
const interpResources = [
    {
        id: 'interp-finding-piece',
        type: 'website',
        event: 'Interpretation (General)',
        title: 'Finding the Perfect Piece',
        description: 'A guide from the NSDA on how to select literature for your interpretation event.',
        url: 'https://www.speechanddebate.org/finding-your-perfect-prose-or-poetry-piece/'
    },
    {
        id: 'interp-blocking',
        type: 'video',
        event: 'Interpretation (General)',
        title: 'Intro to Blocking for Interp',
        description: 'Learn the basics of "blocking" – using movement and the space to tell your story effectively.',
        videoId: 'yJH8Ff94Y3I'
    },
    {
        id: 'interp-characterization',
        type: 'website',
        event: 'Interpretation (General)',
        title: 'Intro to Characterization',
        description: 'Techniques for developing distinct and believable characters using vocal and physical choices.',
        url: 'https://www.speechanddebate.org/characterization-for-interpretation/'
    },
    {
        id: 'hi-intro',
        type: 'website',
        event: 'Humorous Interpretation',
        title: 'Introduction to Humorous Interpretation',
        description: 'The NSDA\'s guide to the rules and strategies of Humorous Interpretation (HI).',
        url: 'https://www.speechanddebate.org/introduction-to-humorous-interpretation/'
    },
    {
        id: 'hi-character-pops',
        type: 'video',
        event: 'Humorous Interpretation',
        title: 'Character Pops in Interpretation',
        description: 'Master the art of "popping" between different characters cleanly and effectively in your performance.',
        videoId: '93gC66q-I_E'
    },
    {
        id: 'di-intro',
        type: 'website',
        event: 'Dramatic Interpretation',
        title: 'Introduction to Dramatic Interpretation',
        description: 'The NSDA\'s guide to the rules and strategies of Dramatic Interpretation (DI).',
        url: 'https://www.speechanddebate.org/introduction-to-dramatic-interpretation/'
    },
    {
        id: 'di-characterization',
        type: 'video',
        event: 'Dramatic Interpretation',
        title: 'Characterization for Dramatic Interp',
        description: 'A tutorial on how to develop deep, believable characters for your DI performance.',
        videoId: 'B-VY-CoL-Jg'
    },
    {
        id: 'duo-intro',
        type: 'website',
        event: 'Duo Interpretation',
        title: 'Introduction to Duo Interpretation',
        description: 'The NSDA\'s guide to Duo Interpretation, a partnered event where performers cannot touch or look at each other.',
        url: 'https://www.speechanddebate.org/introduction-to-duo-interpretation/'
    },
    {
        id: 'duet-vs-duo',
        type: 'video',
        event: 'Duo Interpretation',
        title: 'Duet Acting vs. Duo Interpretation',
        description: 'An explanation of the key differences between the two partnered interpretation events.',
        videoId: 'L3SAy_faN9I'
    },
    {
        id: 'poi-intro',
        type: 'website',
        event: 'Program Oral Interpretation',
        title: 'Introduction to Program Oral Interpretation',
        description: 'Learn about POI, an event where competitors weave together prose, poetry, and drama into a single, cohesive argument.',
        url: 'https://www.speechanddebate.org/introduction-to-program-oral-interpretation/'
    },
    {
        id: 'poi-binder',
        type: 'video',
        event: 'Program Oral Interpretation',
        title: 'How to Use Your Binder in POI',
        description: 'A guide to using the POI binder not just as a prop, but as an integral part of your performance.',
        videoId: 'Hk0x025cI1A'
    },
    {
        id: 'prose-intro',
        type: 'video',
        event: 'Prose',
        title: 'Intro to Prose Interpretation',
        description: 'An introductory video on the basics of Prose, focusing on storytelling and character development.',
        videoId: 'p8peWdAkS5k'
    },
    {
        id: 'poetry-intro',
        type: 'video',
        event: 'Poetry',
        title: 'Intro to Poetry Interpretation',
        description: 'A guide to understanding and performing poetry, focusing on conveying mood, rhythm, and imagery.',
        videoId: 'G2Y-ZoL2i0A'
    },
    {
        id: 'prose-poetry-cutting',
        type: 'website',
        event: 'Prose',
        title: 'How to Cut a Piece for Interp',
        description: 'A general guide on cutting literature down to a performance-length script for events like Prose and Poetry.',
        url: 'https://www.speechanddebate.org/how-to-cut-a-piece/'
    },
    {
        id: 'poetry-resource-2',
        type: 'website',
        event: 'Poetry',
        title: 'How to Cut a Piece for Interp',
        description: 'A general guide on cutting literature down to a performance-length script for events like Prose and Poetry.',
        url: 'https://www.speechanddebate.org/how-to-cut-a-piece/'
    },
    {
        id: 'tfa-interp-rules',
        type: 'website',
        event: 'Interpretation (General)',
        title: 'TFA Standing Rules - Interpretation',
        description: 'The official TFA rules for all interpretation events.',
        url: 'https://www.texasforensicassociation.org/constitution-and-standing-rules',
        rules: {
            TFA: `Refer to the official TFA Constitution and Standing Rules for detailed regulations on all events.`
        }
    }
];
const congressResources = [
    {
        id: 'congress-intro',
        type: 'video',
        event: 'Student Congress',
        title: 'Intro to Congressional Debate',
        description: 'An overview of the rules, procedures, and strategies for Student Congress.',
        videoId: 'L4a-b9n-g4o',
        rules: {
            NSDA: `A session is a legislative session modeled on the U.S. Congress.
- Speeches are up to 3 minutes, followed by a questioning period.
- A student who has given a speech may not be recognized for another speech until all others who wish to speak have done so.
- A presiding officer (PO) runs the session, recognizing speakers and ruling on motions.
- Students vote on legislation after a period of debate.`,
            TFA: `Follows NSDA rules for Congressional Debate.`,
            UIL: `- Speeches are a maximum of three minutes.
- Direct questioning for a maximum of one minute.
- A presiding officer (PO) is elected to conduct the session.
- Representatives are ranked on their leadership and participation.`
        }
    },
    {
        id: 'roberts-rules',
        type: 'website',
        event: 'Student Congress',
        title: 'Robert\'s Rules of Order Online',
        description: 'The definitive guide to parliamentary procedure, which forms the basis of congressional debate.',
        url: 'https://robertsrules.com/'
    },
    {
        id: 'congress-speech-structure',
        type: 'video',
        event: 'Student Congress',
        title: 'Structuring a Congress Speech',
        description: 'Learn how to structure a 3-minute speech in Student Congress, complete with an intro, points, and a conclusion.',
        videoId: 'DEhrYGjHfX8'
    },
    {
        id: 'parli-pro-chart',
        type: 'website',
        event: 'Student Congress',
        title: 'Parliamentary Procedure Chart',
        description: 'A handy chart that summarizes common motions, their purpose, whether they are debatable, and the vote required.',
        url: 'https://www.speechanddebate.org/wp-content/uploads/Parli-At-A-Glance-handout.pdf'
    },
    {
        id: 'tfa-congress-rules',
        type: 'website',
        event: 'Student Congress',
        title: 'TFA Standing Rules - Congress',
        description: 'The official TFA rules for Student Congress.',
        url: 'https://www.texasforensicassociation.org/constitution-and-standing-rules',
        rules: {
            TFA: `Refer to the official TFA Constitution and Standing Rules for detailed regulations on all events.`
        }
    }
];
const initialResources = [
    ...debateResources,
    ...speechResources,
    ...interpResources,
    ...congressResources,
    ...platformResources
];
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/src/app/dashboard/learning-hub/layout.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname, k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "LearningResourcesContext": (()=>LearningResourcesContext),
    "default": (()=>LearningHubLayout),
    "useLearningResources": (()=>useLearningResources)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$learning$2d$resources$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/learning-resources.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
;
const LEARNING_RESOURCES_KEY = 'work-session-learning-resources';
const LearningResourcesContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(null);
function useLearningResources() {
    _s();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(LearningResourcesContext);
    if (!context) {
        throw new Error('useLearningResources must be used within a LearningHubLayout');
    }
    return context;
}
_s(useLearningResources, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
function LearningHubLayout({ children }) {
    _s1();
    const [resources, setResources] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "LearningHubLayout.useState": ()=>{
            if ("TURBOPACK compile-time falsy", 0) {
                "TURBOPACK unreachable";
            }
            try {
                const stored = localStorage.getItem(LEARNING_RESOURCES_KEY);
                return stored ? JSON.parse(stored) : __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$learning$2d$resources$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["initialResources"];
            } catch (e) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$learning$2d$resources$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["initialResources"];
            }
        }
    }["LearningHubLayout.useState"]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "LearningHubLayout.useEffect": ()=>{
            localStorage.setItem(LEARNING_RESOURCES_KEY, JSON.stringify(resources));
        }
    }["LearningHubLayout.useEffect"], [
        resources
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(LearningResourcesContext.Provider, {
        value: {
            resources,
            setResources
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/src/app/dashboard/learning-hub/layout.tsx",
        lineNumber: 40,
        columnNumber: 9
    }, this);
}
_s1(LearningHubLayout, "IkRD1sqTCLi3PJunmofzNHuSuMU=");
_c = LearningHubLayout;
var _c;
__turbopack_context__.k.register(_c, "LearningHubLayout");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
}]);

//# sourceMappingURL=src_61a0c410._.js.map