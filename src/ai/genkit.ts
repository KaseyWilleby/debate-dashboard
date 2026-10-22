import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// In production (Firebase), env vars are provided by the platform
// In development, they come from .env via Next.js
// Secret access granted via: firebase apphosting:secrets:grantaccess GOOGLE_GENAI_API_KEY
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
    }),
  ],
  model: 'googleai/gemini-2.5-flash',
});
