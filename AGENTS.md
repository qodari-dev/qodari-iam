# Repository Guidelines

## Project Structure & Module Organization
- `src/app`: Next.js App Router routes (admin, auth, oauth, portal, API routes under `api`), global layout, and styles in `globals.css`.
- `src/components`, `src/hooks`, `src/stores`, `src/utils`: Reusable UI primitives, hooks, Zustand stores, and shared helpers; prefer colocating feature-specific pieces inside their route folder when scope is narrow.
- `src/server`: Server-side code (`api` handlers, cron jobs, `utils`) and database layer in `db` (Drizzle schema, migrations). Drizzle config lives in `drizzle.config.ts`.
- `src/schemas`, `src/clients`, `src/lib`: Validation/types, client integrations, and general utilities. Static assets live in `public/`.

## Build, Test, and Development Commands
- `npm run dev`: Start the Next.js dev server on port 3000.
- `npm run build`: Production build; run before PRs that alter routing or data flows.
- `npm run start`: Serve the production build locally for smoke tests.
- `npm run lint`: ESLint pass using `eslint.config.mjs`; fix or justify warnings before merging.
- `npm run db:generate`: Generate Drizzle SQL migrations from schema changes.
- `npm run db:migrate`: Apply migrations to the target database (ensure `DATABASE_URL` is set).

## Coding Style & Naming Conventions
- TypeScript-first; prefer functional, server-first React components aligned with the App Router.
- 2-space indentation; format with Prettier (Tailwind plugin enabled). Run `npm run lint` before pushing.
- Components/React files use PascalCase, utilities and hooks use camelCase, schemas/types live in `src/schemas`.
- Use `env.ts` for typed environment variables instead of `process.env` in modules.

## Testing Guidelines
- No default automated test harness is committed yet; add coverage for new features when feasible.
- For new tests, prefer colocated `*.test.ts(x)` or `__tests__` folders next to the code under `src/` and keep them deterministic.
- Validate critical flows manually via `npm run dev` or `npm run start` until an automated suite exists.

## Commit & Pull Request Guidelines
- Write concise, imperative commit subjects; conventional prefixes (`feat:`, `fix:`, `chore:`) are helpful for changelogging.
- Before opening a PR: run `npm run lint` and `npm run build`; include `npm run db:generate` output if schema changes and commit the migration files.
- PR descriptions should summarize scope, list key changes, and link issues. Attach screenshots for UI-facing updates and note DB or env prerequisites.

## Security & Configuration Tips
- Keep secrets in `.env.local`; never commit them. Ensure `DATABASE_URL` points to the right environment before running migrations.
- Limit direct database writes to Drizzle models; avoid raw queries unless necessary and reviewed.
- When adding API routes, enforce input validation via existing schemas and keep auth checks close to the handler entry points.
