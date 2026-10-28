---
name: integrate-playtime
description: Integrate the adjoe Playtime SDK into a new or existing iOS, Android, React Native, Flutter, or Unity app. Use when a user asks to add Playtime, an adjoe offerwall, a Standard Catalog, Playtime Studio, native game placements, reward campaigns.
---

# integrate-playtime: Playtime SDK integration

Use this skill to guide or implement a Playtime SDK integration. It covers two integration types:

1. **Standard Catalog** — adjoe provides and presents the complete Playtime catalog (offerwall).
2. **Playtime Studio** — the app fetches campaigns and builds an in-app Playtime experience. Choose one UI path: Quick-Start Custom UI with managed details, Drop-In UI, or Advanced Custom UI.

The canonical technical guidance is in the linked Playtime SDK documentation. Do not copy or invent SDK APIs, versions, setup requirements, or implementation details; read the applicable reference after identifying the platform and integration type.

## Arguments

Available as `$ARGUMENTS` when invoked as a slash command:

- `platform` (optional): `ios`, `android`, `react-native`, `flutter`, or `unity`.
- `integration_type` (optional): `standard-catalog` or `studio`.
- `studio_ui` (optional): `quick-start`, `drop-in`, or `custom`. Required only for Playtime Studio.

## 1. Determine the platform before consulting implementation references

Inspect the working directory first. Select the **outermost project that owns the build**, using the first matching rule below:

1. **React Native** — root `package.json` includes `react-native` or `react-native-adjoe-sdk`.
2. **Flutter** — root `pubspec.yaml` includes the `adjoe` package or the Flutter SDK.
3. **Unity** — a Unity project with the Playtime files under `Assets/Adjoe`.
4. **Android** — a root or app-module `build.gradle` or `build.gradle.kts` applies `com.android.application`.
5. **iOS** — root `Package.swift`, `Podfile`, `.xcodeproj`, or `.xcworkspace` exists.

If a React Native, Flutter, or Unity project contains `ios/` and `android/` folders, select the wrapper platform. If multiple independent top-level apps match, or no platform can be detected, ask the user which platform to integrate before reading a platform-specific guide.

State the detected platform and the evidence used. Do not change project files until the platform is unambiguous.

## 2. Determine the integration type

Use the integration type supplied by the user. Otherwise inspect existing app code and configuration for signals:

- `showCatalog`, `showCatalogWithOptions`, or an offerwall entry point indicates **Standard Catalog**.
- `PlaytimeStudio`, `getCampaigns`, `getInstalledCampaigns`, `showAppDetails`, or native campaign-card UI indicates **Playtime Studio**.

If no clear signal exists, ask the user to choose:

- **Standard Catalog** — fastest option; adjoe presents the catalog.
- **Playtime Studio** — use Playtime campaigns in the app's own UI.

For Studio, determine the UI path before implementation:

- **Quick-Start Custom UI** — fetch and render campaign cards, then open adjoe's managed campaign details and installed-campaign flow.
- **Drop-In UI (Shelf)** — use Playtime's embedded, self-sizing Shelf UI on native Android or iOS.
- **Advanced Custom UI** — build the campaign list, installed-games views, details, install flow, and required engagement tracking in the app.

If the existing product UI or user request does not identify one, ask which Studio UI path is intended. Do not silently substitute one path for another.

## 3. Complete shared platform setup

After the platform and integration type are known, read the matching platform setup guide and complete the platform’s dependency installation, app configuration, and required platform setup before proceeding. This shared setup is required for both Standard Catalog and Playtime Studio.

| Platform     | Setup                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------- |
| Android      | [Android Get Started](references/getting-started-android.mdx)           |
| iOS          | [iOS Get Started](references/getting-started-ios.mdx)                   |
| React Native | [React Native Get Started](references/getting-started-react-native.mdx) |
| Flutter      | [Flutter Get Started](references/getting-started-flutter.mdx)           |
| Unity        | [Unity Get Started](references/getting-started-unity.mdx)               |

## 4. Read the matching integration references

After the platform and integration type are known, read the matching local integration reference.
Also read [Best Practices](references/studio/best-practices.md) for every
integration.

### Standard Catalog

| Platform     | Integration guidance                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Android      | [Android Catalog Integration](references/standard-integration/use-the-sdk-android.mdx)           |
| iOS          | [iOS Catalog Integration](references/standard-integration/use-the-sdk-ios.mdx)                   |
| React Native | [React Native Catalog Integration](references/standard-integration/use-the-sdk-react-native.mdx) |
| Flutter      | [Flutter Catalog Integration](references/standard-integration/use-the-sdk-flutter.mdx)           |
| Unity        | [Unity Catalog Integration](references/standard-integration/use-the-sdk-unity.mdx)               |

### Playtime Studio

| Platform     | Quick-Start Custom UI                                                                                                      | Advanced Custom UI: use the SDK                                                                                      | Advanced Custom UI: build components                                                                                                  |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Android      | [Android Quick-Start Custom UI](references/studio/build-your-ui/quick-start-android.mdx)           | [Android SDK guide](references/studio/build-your-ui/custom-ui/use-sdk-android.mdx)           | [Android component recipes](references/studio/build-your-ui/custom-ui/build-components-android.mdx)           |
| iOS          | [iOS Quick-Start Custom UI](references/studio/build-your-ui/quick-start-ios.mdx)                   | [iOS SDK guide](references/studio/build-your-ui/custom-ui/use-sdk-ios.mdx)                   | [iOS component recipes](references/studio/build-your-ui/custom-ui/build-components-ios.mdx)                   |
| React Native | [React Native Quick-Start Custom UI](references/studio/build-your-ui/quick-start-react-native.mdx) | [React Native SDK guide](references/studio/build-your-ui/custom-ui/use-sdk-react-native.mdx) | [React Native component recipes](references/studio/build-your-ui/custom-ui/build-components-react-native.mdx) |
| Flutter      | [Flutter Quick-Start Custom UI](references/studio/build-your-ui/quick-start-flutter.mdx)           | [Flutter SDK guide](references/studio/build-your-ui/custom-ui/use-sdk-flutter.mdx)           | [Flutter component recipes](references/studio/build-your-ui/custom-ui/build-components-flutter.mdx)           |
| Unity        | [Unity Quick-Start Custom UI](references/studio/build-your-ui/quick-start-unity.mdx)               | [Unity SDK guide](references/studio/build-your-ui/custom-ui/use-sdk-unity.mdx)               | [Unity component recipes](references/studio/build-your-ui/custom-ui/build-components-unity.mdx)               |

For the chosen Studio UI path, also read:

- [Studio overview](references/studio/overview.md)
- [Offer API](references/studio/build-your-ui/offer-api.mdx)
- [SDK Models](references/studio/build-your-ui/sdk-models.md)
- [Visual Guide](references/studio/build-your-ui/custom-ui/visual-guide.md)
- [API Reference](references/studio/api-reference.md)

For Quick-Start and Advanced Custom UI, follow the
[Custom UI best practices](references/studio/best-practices.md#custom-ui) and
SDK Models. For Advanced Custom UI, also follow the selected platform's component guide. Ask the
user to make any implementation choices identified by those references; do not invent product or
design decisions.

### Studio Drop-In UI (Shelf)

Read the matching canonical local guide only for native Android or iOS. Drop-In UI is not
available for React Native, Flutter, or Unity.

| Platform | Integration guidance                                                                   |
| -------- | -------------------------------------------------------------------------------------- |
| Android  | [Android Drop-In UI](references/studio/drop-in-ui-android.mdx) |
| iOS      | [iOS Drop-In UI](references/studio/drop-in-ui-ios.mdx)         |

## 5. Implement the selected flow

Follow the selected platform’s canonical reference exactly. In every implementation:

1. Confirm the app is configured in the Monetize Dashboard and obtain the correct `sdkHash`; keep it associated with the matching bundle ID or package name.
2. Add the SDK dependency and complete all platform requirements from the setup reference.
3. Build a complete `InitOptions` object from the current user and app context. Preserve the stable user identifier used for reward attribution.
   Before editing code, review the selected guide's complete options table with the user and ask
   which optional fields they need. Do not silently omit a requested option or invent a value.
4. Initialize via `initPlaytime` as early as possible in the lifecycle and wait for it to complete before calling another SDK method.
5. Handle initialization and SDK errors; do not treat a successful build as successful integration.
6. Reinitialize after logout or teardown before using Playtime again.

For Standard Catalog, add the catalog entry point only after the reference-prescribed initialization succeeds. Use SDK availability/status signals to control an optional entry point, but never use a fraud flag to hide campaigns or drive UX.

For Studio, implement the behavior required by the chosen UI path. In particular, do not omit campaign engagement tracking: the canonical UI guides specify when to call the engagement API. On Android, prompt for usage permission early when the platform reference requires it; without it, users are not eligible for time-based campaigns.

For Studio Drop-In UI, follow the Drop-In UI guide instead of the generic Studio implementation
guidance above. Ask the user to confirm the implementation location and design pattern before
editing; never guess where initialization, consent, or the Shelf host belongs. Do not add a
consent UI without product approval.

Do not hardcode credentials or real user data. Read existing configuration patterns and use the app’s established secret/configuration mechanism.

## 6. Validate

Before declaring the integration complete:

1. Run the project’s appropriate build or test command.
2. Verify initialization with a valid test user and `sdkHash` in the intended sandbox or production environment.
3. Verify the selected experience:
   - **Standard Catalog:** the catalog opens from the app entry point and errors are handled.
   - **Studio Quick Start:** campaigns render, card visibility records engagement, and tapping a card opens the managed details flow.
   - **Studio Advanced Custom UI:** campaigns, installed campaigns, details, install/open behavior, engagement tracking, and every supported reward type returned by representative SDK responses work as specified by the guide.
   - **Studio Drop-In UI:** validate the native Android or iOS Shelf according to its guide, including initialization, explicit ToS consent, placement state, self-sizing, and configured campaign actions.
4. For iOS targets, confirm the required App Attest and production-entitlement configuration. For Android targets, verify applicable usage-permission behavior.

Report the detected platform, chosen integration type/UI path, references used, files changed, commands run, and any remaining dashboard or credential work.
