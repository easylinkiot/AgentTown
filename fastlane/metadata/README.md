# Store Listing Metadata

This folder contains listing text for iOS and Android.

## iOS

- `fastlane/metadata/ios/en-US/`
- `fastlane/metadata/ios/zh-Hans/`

Used by `deliver` when uploading metadata.

## Android

- `fastlane/metadata/android/en-US/`
- `fastlane/metadata/android/zh-CN/`

Used by `supply` when uploading metadata.

## Update Checklist

1. Verify URLs (`support_url`, `privacy_url`, `marketing_url`).
2. Review keywords against App Store limits.
3. Update `release_notes.txt` / changelog before each release.
