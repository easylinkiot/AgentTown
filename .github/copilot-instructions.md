# AgentTown AI Development Guidelines

## Goal
Build AgentTown as a single Expo codebase targeting iOS, Android, and Web.

## Rules
- Keep business logic in shared TypeScript modules under `features/` or `lib/`.
- Avoid platform-specific branches unless required by device APIs.
- New UI must run on all three platforms (`ios`, `android`, `web`).
- Add tests for new logic and bug fixes.
- Do not commit secrets. API keys must stay in env vars and server-side services.

## Required Checks
Before marking a task done, run:
- `npm run typecheck`
- `npm run lint`
- `npm run test:ci`

## CI Expectations
- Keep workflows green on pull requests.
- If a change affects routing or navigation, include at least one test that covers the new path.
