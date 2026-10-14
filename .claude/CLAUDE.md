# Debate Dashboard - Claude Workspace

## Project Overview

**Debate Dashboard** is a comprehensive web application for managing high school debate tournaments, practice sessions, student performance tracking, and team administration. The platform supports multiple debate formats (Congress, Policy, LD, Public Forum, Speech & Interp) and provides tools for coaches, students, and tournament organizers.

**Deployment**: Firebase App Hosting
**Framework**: Next.js 15 (App Router)
**Database**: Firebase Firestore
**Authentication**: Firebase Auth

## Tech Stack

- **Frontend**: React 18, Next.js 15 (App Router), TypeScript
- **UI Components**: Radix UI, Tailwind CSS, shadcn/ui
- **Forms**: React Hook Form + Zod validation
- **Backend**: Firebase (Firestore, Auth, Storage, Admin SDK)
- **AI Integration**: Google Genkit with Anthropic integration
- **Document Processing**: Cheerio, Mammoth, PDF.js, Puppeteer
- **Data Export**: ExcelJS, docx, file-saver
- **Date Handling**: date-fns (v3.6.0)

## Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── [teamSlug]/               # Team-scoped routes (multi-tenant)
│   │   ├── dashboard/            # Main dashboard and features
│   │   │   ├── tournament-manager/  # Tournament management
│   │   │   ├── learning-hub/     # Educational resources
│   │   │   ├── session-manager/  # Practice session scheduling
│   │   │   ├── team-management/  # Team administration
│   │   │   └── ...               # Other dashboard features
│   │   └── admin-*/              # Admin-specific routes
│   ├── superadmin/               # Super admin dashboard
│   ├── login/                    # Authentication page
│   └── layout.tsx                # Root layout with providers
├── components/
│   ├── ui/                       # Reusable shadcn/ui components
│   ├── dashboard/                # Dashboard-specific components
│   └── auth/                     # Authentication components
├── contexts/                     # React contexts (auth, etc.)
├── firebase/                     # Firebase client/admin utilities
│   ├── firestore/                # Firestore hooks (use-doc, use-collection)
│   └── auth/                     # Auth hooks (use-user)
├── lib/                          # Utility functions and types
│   ├── types.ts                  # TypeScript type definitions
│   ├── utils.ts                  # General utilities
│   └── firebase-admin.ts         # Firebase Admin SDK initialization
└── hooks/                        # Custom React hooks
```

## Recent Work & Current Focus

### Tournament Registration System (Latest)
We've been building comprehensive tournament registration features:

- **Registration Window Controls**: Added `registrationOpens` and `registrationCloses` timestamps to tournaments
- **Separate Student Close Date**: Students can have earlier registration deadlines than coaches (`studentRegistrationCloses`)
- **Registration Control UI**: Tournament edit dialog includes date pickers for all registration windows
- **Student Self-Registration**: Students can sign themselves up for tournaments when windows are open
- **Tournament Sign-Up Navigation**: Added navigation links for all users to access registration
- **Chronological Sorting**: Tournaments display in chronological order on registration pages

### Critical Fixes (Previous Work)
- **Timezone Issues**: Fixed critical timezone bugs in tournament date handling
  - Created `parseLocalDate` utility to handle dates without timezone conversion
  - Fixed tournament calendar, details, and edit flows
  - Added diagnostic scripts to identify and fix corrupted dates
- **Missing Team IDs**: Fixed issues with missing `teamId` fields in database documents
- **React Hooks Errors**: Resolved conditional hook usage in tournament details page

## Date Handling - CRITICAL

**ALWAYS use `parseLocalDate` when working with tournament dates stored in Firestore.**

```typescript
// From lib/utils.ts
import { parseLocalDate } from '@/lib/utils'

// When reading dates from Firestore
const startDate = parseLocalDate(tournament.startDate) // Returns Date object in local time

// When displaying dates
import { format } from 'date-fns'
const displayDate = format(startDate, 'MMM d, yyyy')
```

**Why**: Tournament dates are stored as ISO strings (e.g., "2024-03-15") representing local dates. Using `new Date()` directly causes timezone conversion bugs where dates shift by one day.

**Never**: Use `new Date(dateString)` directly on tournament dates
**Always**: Use `parseLocalDate(dateString)`

## Multi-Tenancy Architecture

The app uses a **team-based multi-tenancy** model:

- Routes are scoped by `[teamSlug]` (e.g., `/westview-debate/dashboard`)
- All Firestore documents include a `teamId` field for data isolation
- Users can belong to multiple teams with different roles
- Each team has independent tournaments, sessions, students, and resources

## Firestore Data Model

### Collections
- `users` - User accounts with multi-team support
- `teams` - Team/organization configurations
- `tournaments` - Tournament information with registration windows
- `entries` - Student tournament registrations
- `sessions` - Practice session schedules
- `appointments` - Student coaching appointments
- `resources` - Learning hub educational materials
- `results` - Tournament performance results

### Important Fields
- **teamId**: Required on all documents for multi-tenant isolation
- **Tournament dates**: Use ISO date strings ("2024-03-15"), parse with `parseLocalDate`
- **Registration windows**: `registrationOpens`, `registrationCloses`, `studentRegistrationCloses`

## Coding Conventions

### TypeScript
- Use strict TypeScript - avoid `any` types
- Define interfaces in `src/lib/types.ts` for shared types
- Use Zod schemas for form validation and runtime type checking

### React Patterns
- Use Server Components by default (App Router)
- Add `'use client'` directive only when needed (hooks, event handlers, context)
- Prefer composition over prop drilling
- Use React Hook Form + Zod for all forms

### Firebase
- Use custom hooks from `src/firebase/`:
  - `useDoc(path)` - Real-time document subscription
  - `useCollection(path)` - Real-time collection subscription
  - `useUser()` - Current authenticated user
- Always include `teamId` in Firestore writes for multi-tenant data
- Use Firebase Admin SDK for server-side operations

### Styling
- Tailwind CSS with utility-first approach
- Use shadcn/ui components from `src/components/ui/`
- Responsive design: mobile-first with `sm:`, `md:`, `lg:` breakpoints
- Dark mode ready (use Tailwind's dark: prefix when needed)

### File Naming
- Components: PascalCase (e.g., `TournamentCard.tsx`)
- Utilities: kebab-case (e.g., `date-utils.ts`)
- Pages: lowercase (e.g., `page.tsx`, `layout.tsx`)

## Common Commands

```bash
# Development
npm run dev                    # Start dev server on localhost:3000
npm run dev:3001              # Start on port 3001 (alternate)
npm run build                 # Production build
npm run typecheck             # Type checking without emit

# AI Development (Genkit)
npm run genkit:dev            # Start Genkit dev UI
npm run genkit:watch          # Start with watch mode

# Linting & Type Checking
npm run lint                  # ESLint
npm run typecheck             # TypeScript type checking

# Firebase
firebase deploy               # Deploy to Firebase App Hosting
firebase use                  # Select Firebase project
firebase hosting:channel:list # List hosting channels
```

## Important Patterns

### Form Handling
```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const formSchema = z.object({
  name: z.string().min(1, "Required"),
})

const form = useForm<z.infer<typeof formSchema>>({
  resolver: zodResolver(formSchema),
  defaultValues: { name: "" },
})
```

### Firestore Queries with Hooks
```typescript
'use client'

import { useCollection } from '@/firebase/firestore/use-collection'

const tournaments = useCollection(`teams/${teamId}/tournaments`)
const loading = tournaments === undefined
const docs = tournaments || []
```

### Date Formatting
```typescript
import { format } from 'date-fns'
import { parseLocalDate } from '@/lib/utils'

// Parse and format tournament dates
const date = parseLocalDate(tournament.startDate)
const display = format(date, 'MMM d, yyyy') // "Mar 15, 2024"
```

## Security Considerations

- **Never commit**: `.env.local`, Firebase service account keys, API keys
- **Firestore Rules**: Enforce `teamId` matching in security rules
- **Authentication**: Use Firebase Auth with role-based access control
- **Input Validation**: Always validate user input with Zod schemas

## Known Issues & Gotchas

1. **Date Timezone Bugs**: Always use `parseLocalDate` for tournament dates (see Date Handling section)
2. **Missing teamId**: Ensure all Firestore writes include `teamId` field
3. **React Hooks**: Don't use hooks conditionally - they must be called in the same order every render
4. **Build Clean**: Pre-build script removes `.next` folder to avoid stale cache issues

## Testing & Debugging

- Use TypeScript type checking (`npm run typecheck`) before commits
- Check browser console for Firebase errors
- Use Firebase Emulator for local testing (when configured)
- Monitor Firestore usage in Firebase Console

## Deployment Notes

- Deployed to Firebase App Hosting
- Build command: `npm run build`
- Environment variables set in Firebase App Hosting settings
- Pre-build cleanup removes `.next` directory

---

**Last Updated**: 2026-10-13
**Project Status**: Active development - Tournament registration system complete
