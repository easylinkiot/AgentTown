# Store Assets

Generated assets for App Store and Google Play.

## Prerequisites

1. Start iOS simulator and run AgentTown.
2. Capture 3 distinct screens:
- `marketing/store-assets/raw/screen-world-map.png`
- `marketing/store-assets/raw/screen-mini-apps.png`
- `marketing/store-assets/raw/screen-team-chat.png`

Example:

```bash
xcrun simctl io booted screenshot marketing/store-assets/raw/screen-world-map.png
xcrun simctl io booted screenshot marketing/store-assets/raw/screen-mini-apps.png
xcrun simctl io booted screenshot marketing/store-assets/raw/screen-team-chat.png
```

## Generate

```bash
python3 -m venv .venv-marketing
source .venv-marketing/bin/activate
pip install pillow
python scripts/generate_store_assets.py
```

## Output

- Logos:
  - `marketing/store-assets/generated/logo/`
- iOS screenshots:
  - `fastlane/screenshots/en-US/`
  - `fastlane/screenshots/zh-Hans/`
- Android listing images:
  - `fastlane/metadata/android/images/`
  - `fastlane/metadata/android/en-US/images/phoneScreenshots/`
  - `fastlane/metadata/android/zh-CN/images/phoneScreenshots/`

Notes:
- Current screenshots are auto-composed from simulator captures.
- The generator will fail if any raw screenshots are duplicated.
- For final release, replace with the exact live flows you want to feature.
