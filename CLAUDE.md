# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Inbox Zero is an AI-powered email management SaaS application. It helps users reach inbox zero through AI automation, unsubscription management, reply tracking, and email analytics. The project is a monorepo using Turborepo with pnpm workspaces.

## Build & Development Commands

```bash
# Development
pnpm dev                    # Start dev server with Turbopack
pnpm build                  # Production build
pnpm lint                   # Run Biome linter (biome check .)

# Testing
pnpm test                   # Run unit/integration tests (Vitest)
pnpm test-ai                # Run AI tests (requires real LLM, set RUN_AI_TESTS=true)
pnpm test __tests__/file.test.ts  # Run single test file

# Database
cd apps/web && pnpm prisma migrate dev   # Run migrations
cd apps/web && pnpm prisma studio         # Open Prisma Studio

# Setup
pnpm install                # Install dependencies
npm run setup               # Interactive environment setup
```

## Architecture

### Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes, Server Actions (next-safe-action), Prisma ORM
- **Database**: PostgreSQL
- **Cache/Queue**: Redis (Upstash), QStash for background jobs
- **AI**: Vercel AI SDK with multi-provider support (Anthropic, OpenAI, Google, etc.)
- **Auth**: Better Auth with Google/Microsoft OAuth
- **Email**: Gmail API, Microsoft Graph API

### Project Structure
```
inbox-zero/
├── apps/
│   ├── web/                     # Main Next.js app
│   │   ├── app/                 # Next.js App Router
│   │   │   ├── (app)/           # Authenticated app routes
│   │   │   ├── api/             # API endpoints
│   │   │   └── (landing)/       # Marketing pages
│   │   ├── components/          # React components
│   │   ├── utils/               # Utilities
│   │   │   ├── actions/         # Server actions
│   │   │   ├── ai/              # AI/LLM logic
│   │   │   ├── llms/            # LLM provider utilities
│   │   │   ├── gmail/           # Gmail API wrappers
│   │   │   └── outlook/         # Outlook integration
│   │   ├── hooks/               # React hooks
│   │   ├── store/               # Jotai atoms
│   │   ├── prisma/              # DB schema & migrations
│   │   └── __tests__/           # AI/E2E tests
│   └── unsubscriber/            # Fastify browser automation service
├── packages/                    # Shared packages (tinybird, resend, etc.)
└── .cursor/rules/               # Development guidelines
```

### Key Architectural Patterns

**API Routes**: Always use middleware wrappers
```typescript
// User-scoped operations
export const GET = withAuth(async (request) => {
  const { userId } = request.auth;
});

// Email account-scoped operations
export const GET = withEmailAccount(async (request) => {
  const { emailAccountId, userId } = request.auth;
});
```

**Server Actions**: Use next-safe-action with Zod validation
```typescript
export const createAction = actionClient
  .metadata({ name: "actionName" })
  .schema(zodSchema)
  .action(async ({ ctx: { emailAccountId }, parsedInput }) => {
    // Implementation
  });
```

**Data Fetching**: SWR on client, export response types from API routes
```typescript
// In API route
export type GetExampleResponse = Awaited<ReturnType<typeof getData>>;

// In client hook
const { data } = useSWR<GetExampleResponse>("/api/user/example");
```

**Database Queries**: Always scope to authenticated user/account
```typescript
// Always include ownership filter
const rule = await prisma.rule.findUnique({
  where: { id: ruleId, emailAccount: { id: emailAccountId } }
});
```

**Gmail/Outlook API**: Use wrapper functions, never call provider APIs directly
```typescript
import { getMessages } from "@/utils/gmail/message";
// NOT: gmail.users.messages.list(...)
```

## Code Conventions

- TypeScript with strict null checks
- Import alias: `@/` for project root
- Prisma import: `import prisma from "@/utils/prisma"`
- Colocate tests with source files (`utils/example.test.ts`), AI/E2E tests in `__tests__/`
- Helper functions go at bottom of files, not top
- Infer types from Zod schemas: `z.infer<typeof schema>`
- Use `LoadingContent` component for async data display
- Use shadcn/ui components when available
- Prefer self-documenting code over comments

## Testing

- Framework: Vitest
- Mock Prisma: `import prisma from "@/utils/__mocks__/prisma"`
- Test helpers: `import { getEmail, getEmailAccount, getRule } from "@/__tests__/helpers"`
- Mock server-only: `vi.mock("server-only", () => ({}))`
- Do not mock the Logger

## Environment Variables

When adding new env vars:
1. Add to `apps/web/.env.example`
2. Add validation to `apps/web/env.ts`
3. Add to `turbo.json` if needed for build
4. Client-side vars must be prefixed with `NEXT_PUBLIC_`

## Security Requirements

- All API routes handling user data MUST use `withAuth` or `withEmailAccount` middleware
- All database queries MUST include user/account filtering
- Cron endpoints MUST validate with `hasCronSecret()` or `hasPostCronSecret()`
- Use `SafeError` for user-facing errors (prevents information disclosure)
- Validate request bodies with Zod schemas

## Additional Documentation

- `.cursor/rules/` - Detailed patterns for fullstack workflow, security, testing, LLM implementation
- `ARCHITECTURE.md` - Detailed architecture overview
- `docs/hosting/` - Self-hosting and deployment guides
