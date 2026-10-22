---
name: migrate-playtime
description: Migrate an existing adjoe Playtime SDK v4 Standard Catalog or Studio implementation to v5 for iOS, Android, or React Native. Use when a user asks to upgrade or migrate the Playtime SDK from v4 to v5, or mentions deprecated Playtime APIs, setPlaytimeOptions, initPlaytime, PlaytimeCatalog, or PlaytimeStudio.
---

# migrate-playtime: Playtime SDK migration

Use this skill only for an existing Playtime SDK implementation. It does not cover a new Playtime SDK integration.

The linked Playtime documentation is the source of truth. Do not copy, infer, or invent SDK APIs, dependency versions, migration steps, or platform requirements. Detect the platform and installed SDK version before reading a platform-specific migration reference.

## Arguments

Available as `$ARGUMENTS` when invoked as a slash command:

- `platform` (optional): `ios`, `android`, or `react-native`.
- `version` (optional): the installed Playtime SDK version.
- `integration_type` (optional): `standard-catalog` or `studio`.

## 1. Determine the platform

Use the platform supplied by the user when available. Otherwise, inspect the working directory and select the **outermost project that owns the build**, using the first matching rule below:

1. **React Native** — root `package.json` includes `react-native` or `react-native-adjoe-sdk`.
2. **Android** — a root or app-module `build.gradle` or `build.gradle.kts` applies `com.android.application`.
3. **iOS** — root `Package.swift`, `Podfile`, `.xcodeproj`, or `.xcworkspace` exists.

If a React Native project contains `ios/` and `android/` folders, select the wrapper platform. If multiple independent top-level projects match, or no platform can be detected, ask the user which platform they want to migrate. State the selected platform and the evidence used before changing files.

## 2. Determine the installed Playtime SDK version

Use the version supplied by the user when available. Otherwise inspect the selected platform's dependency declaration and its lockfiles. Look for these Playtime SDK identifiers:

| Platform     | Dependency identifiers and version sources                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Android      | `io.adjoe:adjoe-sdk-android` in `build.gradle` or `build.gradle.kts`, then Gradle lockfiles or dependency reports         |
| iOS          | `PlaytimeMonetize` or `PlaytimeSDK` in `Podfile`, `Podfile.lock`, `Package.swift`, or `Package.resolved`                  |
| React Native | `react-native-adjoe-sdk` in `package.json` and the package lockfile; also inspect the native Android and iOS dependencies |

Prefer a resolved lockfile version over a declared range. For React Native, verify the native Android and iOS versions too: the JavaScript wrapper version alone does not prove the native SDK version.

If the version is absent, uses an unresolvable branch or range, or native platforms resolve to different major versions, stop and ask the user to confirm the version to migrate from. Do not assume a version from source API names alone.

## 3. Determine the integration type

Use the integration type supplied by the user when available. Otherwise, inspect the
existing app code and configuration for signals:

- `showCatalog`, `showCatalogWithOptions`, or an offerwall entry point indicates
  **Standard Catalog**.
- `PlaytimeStudio`, `getCampaigns`, `getInstalledCampaigns`, `showAppDetails`, or native
  campaign-card UI indicates **Playtime Studio**.

If the project uses both integration types, migrate each one using its corresponding
reference. If no clear signal exists, ask the user whether they use Standard Catalog, where
adjoe presents the catalog, or Playtime Studio, where the app presents campaign data in its
own UI. Do not select a migration reference until this is clear.

## 4. Confirm the migration is supported

Use semantic major versions, not a string comparison:

- **v4.x:** migrate directly to v5.
- **Version earlier than v4:** this skill does not cover a legacy-to-v4 migration. Do not apply v5 changes; ask the user to migrate to v4 first with the appropriate legacy migration process.
- **v5.x or later:** do not apply the v4-to-v5 migration guides. Confirm the intended target version and find the applicable release guidance.

## 5. Read and apply the migration reference

For each v4.x integration being migrated, read exactly one matching v5 migration reference:

| Integration      | Platform     | v5 migration reference                                                                                                       |
| ---------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Standard Catalog | Android      | [Migrate Catalog Android to v5](references/standard-integration/migrate-to-v5-android.mdx)           |
| Standard Catalog | iOS          | [Migrate Catalog iOS to v5](references/standard-integration/migrate-to-v5-ios.mdx)                   |
| Standard Catalog | React Native | [Migrate Catalog React Native to v5](references/standard-integration/migrate-to-v5-react-native.mdx) |
| Playtime Studio  | Android      | [Migrate Studio Android to v5](references/studio/migrate-to-v5-android.mdx)                          |
| Playtime Studio  | iOS          | [Migrate Studio iOS to v5](references/studio/migrate-to-v5-ios.mdx)                                  |
| Playtime Studio  | React Native | [Migrate Studio React Native to v5](references/studio/migrate-to-v5-react-native.mdx)                |

Follow the selected reference exactly.

Also read [Best Practices](references/studio/best-practices.md). Audit every
existing v4 option before editing code. Review the selected migration guide's **Map every v4
option** section and complete option tables with the user. Preserve existing values at their
documented v5 destinations, ask whether newly available optional fields are needed, and do not
invent values.

1. Update only the Playtime dependency declarations and required native dependencies specified by the selected reference.
2. Make the API changes specified by that reference and resolve resulting build errors without substituting undocumented APIs.
3. Keep the app's existing user identity, credentials, and configuration patterns. Never hardcode an SDK hash or real user data.
4. Initialize as early as possible in the app lifecycle and wait for successful completion before
   invoking another Playtime method.

## 6. Validate

Before declaring the migration complete:

1. Run the project's relevant build and test commands for every affected native platform.
2. Confirm SDK initialization completes, the existing Playtime entry point works, and errors are handled using the selected migration reference.

Report the detected platform, integration type, resolved installed version, migration stages completed, references used, files changed, commands run, and any remaining dashboard, credential, or release work.
