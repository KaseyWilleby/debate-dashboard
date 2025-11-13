// Only load dotenv in development (when .env file exists)
if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv/config');
  } catch (e) {
    // Ignore - dotenv not available or .env doesn't exist
  }
}

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
    })
  ],
  model: 'googleai/gemini-2.5-flash',
});
