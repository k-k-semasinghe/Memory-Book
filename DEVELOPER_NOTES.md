# Memory Book — Developer Notes

This document contains technical information for contributors and maintainers. For user-facing instructions, see [README.md](./README.md).

## Project summary

Memory Book is an Android-first Expo/React Native application using Expo Router, TypeScript, TanStack Query, and Expo SQLite. The core journal is local-first: notes, categories, tags, reminders, and AI metadata are persisted on the device.

Current app version: `0.1.8`  
Android package: `com.memorybook.app`  
Android version code: `9`

There is no iOS distribution at this time. The repository contains iOS-compatible Expo dependencies, but Android is the current supported target.

## Technology stack

- Expo `~58.0.23`
- Expo Router `~58.0.30`
- React Native `0.88.1`
- React `19.3.0`
- TypeScript `~6.0.3`
- TanStack Query for server-style query and mutation state
- Expo SQLite for local persistence
- SQLite FTS5 for full-text search when available
- Expo Notifications for reminders
- Expo Secure Store for AI API keys
- Zustand for search UI state
- Zod and shared parsing helpers for validated data handling

## Repository structure

```text
app/                         Expo Router screens and navigation
src/components/              Reusable UI components
src/constants/               Theme and default categories
src/hooks/                   TanStack Query hooks
src/db/                      SQLite schema, migrations, FTS, repositories
src/ai/                      AI providers, prompts, keys, and service logic
src/notifications.ts         Reminder notification configuration
src/permissions/             Android permission helpers and onboarding
src/stores/                   Local UI state
android/                     Native Android project
eas.json                     EAS build profiles
```

## Local development

### Prerequisites

- Node.js and npm
- Android Studio
- Android SDK and an emulator or physical Android device
- An Expo/EAS account for cloud builds

### Install dependencies

```bash
npm install
```

### Run the project

```bash
npm start
```

To launch the native Android app directly:

```bash
npm run android
```

### Type-check

```bash
npm run typecheck
```

### Build locally

```bash
npx expo run:android
```

## APK testing build

The provided local APK is:

```text
test apk\memory-book-0.1.8.apk
```

Absolute local path used for this workspace:

```text
E:\codes\Memory Book\test apk\memory-book-0.1.8.apk
```

This APK is approximately 37 MB. Do not commit generated APK binaries to the repository unless there is a specific release-storage decision. Use a GitHub Release or EAS artifact instead.

## EAS builds

The `preview` profile is configured to create an installable Android APK:

```bash
npx eas build --platform android --profile preview
```

The `production` profile creates an Android App Bundle for store distribution:

```bash
npx eas build --platform android --profile production
```

The user-facing README download button expects the latest GitHub Release to contain an asset named exactly:

```text
memory-book.apk
```

Permanent download URL:

```text
https://github.com/k-k-semasinghe/Memory-Book/releases/latest/download/memory-book.apk
```

## Application architecture

### Routing and UI

Routes live under `app/`. The root layout initializes the query client, notification listeners, permission onboarding, and the navigation stack. The tab layout provides Home, Timeline, Search, and Scratchpad tabs plus the note-creation floating action button.

Shared components are under `src/components/`, and design tokens are defined in `src/constants/theme.ts`.

### Data layer

`src/db/database.ts` opens `memory-book.db`, enables WAL mode and foreign keys, runs the schema and indexes, applies migrations, seeds default categories, and initializes FTS5.

Repositories under `src/db/repositories/` contain database operations for:

- Notes
- Categories
- Tags
- Reminders
- AI conversations, messages, usage, and processing results

React Query hooks in `src/hooks/` expose these operations to screens and invalidate related queries after mutations.

### Note lifecycle

Notes support normal, scratchpad, archived, deleted, and permanently deleted states. Scratchpad notes use `expires_at` for the seven-day warning flow; they are not automatically deleted when the date passes.

Trash is soft deletion. Permanent deletion and empty-trash actions remove records and related data according to the repository logic.

### Search

The app maintains a `notes_fts` virtual table containing note title, body, tags, category, and extracted keywords. `src/db/fts.ts` rebuilds individual records or the full index after relevant data changes.

The app still has a non-FTS search path, so core search can degrade gracefully if FTS5 is unavailable.

### AI

AI is opt-in. The service layer in `src/ai/service.ts`:

1. Loads local AI configuration.
2. Checks that AI is enabled.
3. Checks network availability.
4. Searches local notes for relevant context.
5. Sends a provider request using the configured key.
6. Stores conversation history and usage locally where applicable.

Supported providers:

- Gemini through Google Generative Language API
- Groq through its OpenAI-compatible chat completions API

Keys are stored through `expo-secure-store`. Never add API keys to source code, environment files committed to Git, screenshots, or an APK.

### Notifications and Android permissions

Reminder behavior is implemented through Expo Notifications and native Android reminder receivers in `android/app/src/main/`. Android permission handling includes notifications, exact alarms, full-screen intents, and overlay-related settings where supported.

Reminder behavior can vary by Android version and device manufacturer because of battery optimization and background-execution policies.

## Configuration files

- [`package.json`](./package.json): scripts and JavaScript dependencies
- [`app.json`](./app.json): Expo app metadata, package identifiers, icon, plugins, and version
- [`eas.json`](./eas.json): preview APK and production AAB profiles
- [`tsconfig.json`](./tsconfig.json): strict TypeScript configuration
- [`babel.config.js`](./babel.config.js): Expo Babel preset

## Development guidelines

- Keep changes focused and preserve existing local-first behavior.
- Reuse existing repositories and hooks rather than placing SQL in screens.
- Keep shared styling in the existing theme tokens.
- Use explicit error messages for failed user actions.
- Update related documentation when behavior or build steps change.
- Run `npm run typecheck` before opening a pull request.
- Test reminder changes on a real Android device when possible.
- Do not commit secrets or generated release credentials.

## Known limitations

- Android is the only supported platform for the current release.
- There is no account system or cloud synchronization.
- Export and encrypted backup are planned but not implemented.
- Encrypted local storage and EXIF/GPS stripping are planned.
- AI requires a user-provided provider key and network access.
- Native reminder reliability depends on Android permissions and battery policies.
- No automated test script is currently defined in `package.json`.

## Release checklist

1. Update the version and Android version code in `app.json`.
2. Run `npm run typecheck`.
3. Build with the `preview` profile for an installable APK.
4. Install and test the APK on a real Android device.
5. Test note creation, search, scratchpad, trash, reminders, permissions, and AI-disabled behavior.
6. Create a GitHub Release with a new version tag.
7. Upload the APK as `memory-book.apk`.
8. Confirm the latest download URL works before sharing it.
