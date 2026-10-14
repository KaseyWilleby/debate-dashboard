import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import {claude} from 'genkitx-anthropic';

// In production (Firebase), env vars are provided by the platform
// In development, they come from .env via Next.js
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
    }),
    claude({
      apiKey: process.env.ANTHROPIC_API_KEY,
    }),
  ],
  model: 'googleai/gemini-2.5-flash',
});
