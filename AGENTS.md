# AgentTown Working Agreement

## Stack
- Expo + Expo Router
- React Native + TypeScript
- One codebase for iOS, Android, and Web

## Development Contract
- Keep changes incremental and ship-ready.
- Prefer shared components and shared domain logic.
- Preserve strict TypeScript mode.
- Every behavior change should include tests or a clear test gap note.

## Local Validation
Run these commands before opening PRs:
- `npm run typecheck`
- `npm run lint`
- `npm run test:ci`
- `npm run build:web`
