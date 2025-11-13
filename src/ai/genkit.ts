import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// In production (Firebase), env vars are provided by the platform
// In development, they come from .env via Next.js
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
    })
  ],
  // Don't specify a default model - let each flow specify its own
});
