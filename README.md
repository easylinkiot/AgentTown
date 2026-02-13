# AgentTown

AgentTown is an Expo-based, AI-ready application that runs on iOS, Android, and Web from one TypeScript codebase.

## Migrated Features

- Home dashboard with Town entry + WeChat-style chat list
- Chat detail with AI actions:
  - Reply suggestions
  - Task extraction
  - Brainstorm ideas
  - Custom prompt on selected message
- Bot configuration center:
  - Identity/avatar setup
  - Knowledge upload and keyword extraction
  - Skill builder form
  - Skill marketplace install + inspector
  - Editable system instructions ("MyBot Brain")
- Town map gameplay:
  - Procedural lots/markets/trees
  - Select lot + visit NPC
  - In-map NPC chat modal
- Living Room gameplay:
  - House/interests/jobs/assets panels
  - House type switching linked to home state

## Environment

- Node.js `22.22.0` (see `.nvmrc`)
- npm `10+`
- Xcode (for local iOS simulator builds on macOS)
- Android Studio + SDK (for local Android emulator builds)

## Quick Start

```bash
nvm use
npm install
npm run start
```

Optional env for AI:

```bash
cp .env.example .env.local
```

Then set:

```bash
EXPO_PUBLIC_GEMINI_API_KEY=your_key_here
```

Run by platform:

```bash
npm run ios
npm run android
npm run web
```

## Quality Gates

```bash
npm run typecheck
npm run lint
npm run test:ci
npm run build:web
```

## AI-Driven Workflow

1. Create an issue for each feature/fix.
2. Let AI Agent implement changes on a branch.
3. Open PR.
4. CI runs checks (`typecheck`, `lint`, `test`, `web build`).
5. Merge only when checks pass.

## Mobile Build Pipeline

`eas.json` is included for `development`, `preview`, and `production` profiles.

Example commands:

```bash
npx eas-cli login
npx eas-cli build --platform all --profile preview
npx eas-cli build --platform all --profile production
```

To automate EAS in GitHub Actions later, add `EXPO_TOKEN` in repository secrets.
