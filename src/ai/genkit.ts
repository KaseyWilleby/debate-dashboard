import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// In production (Firebase), env vars are provided by the platform
// In development, they come from .env via Next.js
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
      apiVersion: 'v1', // Use v1 API instead of v1beta
    })
  ],
  model: 'googleai/gemini-1.5-pro-latest',
});
