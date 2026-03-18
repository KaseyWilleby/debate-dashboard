# NewsAPI Setup for Dynamic Extemp Topics

The extemp topic generator now fetches real current events from the past month using NewsAPI.

## Setup Instructions

### 1. Get a Free NewsAPI Key

1. Visit [https://newsapi.org/register](https://newsapi.org/register)
2. Sign up for a free account
3. Copy your API key from the dashboard

### 2. Add the API Key to Your Environment

Add the following line to your `.env` file:

```
NEWS_API_KEY=your_actual_api_key_here
```

### 3. Firebase Secrets (for Production)

For the live site, you need to add the NEWS_API_KEY as a Firebase secret:

```bash
firebase apphosting:secrets:set NEWS_API_KEY
# Paste your API key when prompted
```

Then grant access to your backend:

```bash
firebase apphosting:secrets:grantaccess NEWS_API_KEY --backend debate-dashboard
```

## How It Works

1. When a user clicks "Generate Topics" for Extemp
2. The system fetches the latest news headlines from NewsAPI
   - Domestic: Top headlines from the United States
   - Foreign: Top international headlines
3. The AI generates 3 unique questions based on these actual recent events
4. Each generation produces different topics from the current news cycle

## Free Tier Limits

- NewsAPI Free Tier: 100 requests per day
- Each topic generation uses 1 request
- More than enough for typical daily usage

## Fallback

If NewsAPI is unavailable or the API key is missing, the system falls back to a curated list of general extemp questions.
