# Use the SDK

This guide covers the Standard Flutter integration flow for displaying the Playtime
catalog. The v5 methods return `Future`s, so call them with `await` and handle errors.

Import the SDK entry point and the option and value types from the package. The
declarations shipped with the `adjoe` package at `v5.0.0` are the source of truth.

```dart
import 'package:adjoe/sdk.dart';
```

## Initialize the SDK

Initialize the SDK early so it can fetch campaign data. Select the SDK hash for the
current native platform; never reuse a hash from another application or platform.

> **Info: Initialization behavior**
>
> Initialize Playtime as early as possible in the app lifecycle: preferably from
> `Application.onCreate` on Android, during app launch on iOS, or during React Native app startup.
> If the user identity is not available then, initialize again as soon as it is available.
>
> The SDK does not initialize implicitly. Wait for `initPlaytime` to complete successfully before
> calling any other SDK method.

To change a mutable, non-UA initialization value, call `initPlaytime` again and wait for it to
complete.

The backend records `uaNetwork`, `uaChannel`, and `uaCampaignName` independently. Each field can
change from `null` to its first non-null value, but that recorded value cannot be cleared or
replaced. Teardown and re-initialization do not reset it.

```dart
import 'dart:io' show Platform;
import 'package:adjoe/sdk.dart';

final sdkHash = Platform.isAndroid
    ? 'YOUR_ANDROID_SDK_HASH'
    : 'YOUR_IOS_SDK_HASH';

await Playtime.initPlaytime(InitOptions(
  sdkHash: sdkHash,
  userId: 'user_123',
));
```

`userId` is required before displaying the catalog. If the user is not known at app
startup, initialize again with the user ID after login and before calling `showCatalog`.

Optional profile and extension data use the exported value types:

```dart
final options = InitOptions(
  sdkHash: sdkHash,
  userId: 'user_123',
  userProfile: PlaytimeUserProfile(
    gender: PlaytimeGender.FEMALE,
    birthday: '1990-05-15',
  ),
  extensions: PlaytimeExtensions(
    subId1: 'partner_user_123',
  ),
  language: 'en',
  country: 'DE',
  uaNetwork: 'network',
  uaChannel: 'channel',
  uaCampaignName: 'campaign',
);

await Playtime.initPlaytime(options);
```

`extensions` supports `subId1` through `subId5`. Profile birthdays accept a calendar date
or an ISO 8601 string.

### InitOptions Parameters

| Parameter        | Type                  | Required | Default       | Description                                                                                                                                                                                                                                                                                      |
| ---------------- | --------------------- | -------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `sdkHash`        | `String`              | Yes      | —             | SDK hash from the adjoe dashboard. It must match this app's package name or bundle ID.                                                                                                                                                                                                           |
| `userId`         | `String`              | No       | `null`/`nil`  | Stable, persistent, non-PII identifier used for reward attribution. It is not required for the first initialization, but initialize again with it before TOS consent or requesting campaigns. It is also required before displaying the Catalog. Generate and persist an ID for anonymous users. |
| `userProfile`    | `PlaytimeUserProfile` | No       | `null`/`nil`  | Optional targeting information. See the nested fields below.                                                                                                                                                                                                                                     |
| `extensions`     | `PlaytimeExtensions`  | No       | `null`/`nil`  | Publisher sub-IDs returned in S2S payout callbacks. See the nested fields below.                                                                                                                                                                                                                 |
| `language`       | `String`              | No       | Device locale | ISO 639-1 language code that overrides the device language for SDK content.                                                                                                                                                                                                                      |
| `uaNetwork`      | `String`              | No       | `null`/`nil`  | User-acquisition network. The backend accepts the first non-null value for this user and does not allow it to be cleared or replaced.                                                                                                                                                            |
| `uaChannel`      | `String`              | No       | `null`/`nil`  | User-acquisition channel, such as `video` or `offerwall`. It has the same first-non-null persistence rule.                                                                                                                                                                                       |
| `uaCampaignName` | `String`              | No       | `null`/`nil`  | User-acquisition campaign name. This replaces v4 `uaSubPublisherEncrypted`; it is sent using that backend field and has the same first-non-null persistence rule. v4 `uaSubPublisherCleartext` has no v5 replacement.                                                                            |
| `country`        | `String`              | No       | `null`/`nil`  | ISO 3166-1 alpha-2 code used to map a user to a reward currency. Use only for multiple cash currencies. The SDK trims and uppercases it. It can be set only once per user and does not override device location.                                                                                 |

### PlaytimeUserProfile fields

| Parameter  | Type                              | Required | Description                                                                                  |
| ---------- | --------------------------------- | -------- | -------------------------------------------------------------------------------------------- |
| `gender`   | `PlaytimeGender`                  | No       | Male, female, or unknown, using the platform's corresponding enum value.                     |
| `birthday` | Platform date / ISO 8601 `String` | No       | Birthday used for targeting. React Native accepts an ISO 8601 string; native SDKs use dates. |

### PlaytimeExtensions fields

| Parameter                 | Type     | Required | Description                                                 |
| ------------------------- | -------- | -------- | ----------------------------------------------------------- |
| `subId1` through `subId5` | `String` | No       | Optional publisher values returned in S2S payout callbacks. |

Keep string values URL-safe and do not put PII in user IDs, UA fields, or sub-IDs.

## Check SDK Status

Use `getStatus()` after initialization to verify that campaigns are available:

```dart
final status = await Playtime.getStatus();

if (status.isInitialized && status.details.campaignsAvailable) {
  // The catalog can be shown.
}
```

An initialized SDK can still report no campaigns because of targeting, app
configuration, device eligibility, or temporary inventory. Use the typed values in
`status.details.campaignsState` to determine why campaigns are unavailable. Compare
against the `PlaytimeCampaignsState` enum values, such as
`PlaytimeCampaignsState.VPN_DETECTED`, instead of comparing strings.

`PlaytimeStatus` describes the SDK state and whether campaigns are available for the user.

| Field                        | Type                           | Description                                            |
| ---------------------------- | ------------------------------ | ------------------------------------------------------ |
| `version`                    | `String`                       | SDK version string.                                    |
| `isInitialized`              | `bool`                         | Whether `initPlaytime` completed successfully.         |
| `userId`                     | `String?`                      | User ID passed in `InitOptions`.                       |
| `isTosAccepted`              | `bool`                         | Whether the user accepted the Terms of Service.        |
| `isUsagePermissionAccepted`  | `bool?`                        | Android usage-access state. It is `null` on iOS.       |
| `details.isFraud`            | `bool`                         | Whether the user is flagged as potentially fraudulent. |
| `details.campaignsAvailable` | `bool`                         | Primary signal for whether to show campaigns.          |
| `details.campaignsState`     | `List<PlaytimeCampaignsState>` | Reasons campaigns are unavailable.                     |
| `details.testGroup`          | `int?`                         | A/B test group identifier.                             |

Check campaign states against the `PlaytimeCampaignsState` enum values:

```dart
status.details.campaignsState.contains(PlaytimeCampaignsState.VPN_DETECTED);
```

The available values are `READY`, `BLOCKED`, `VPN_DETECTED`, `GEO_MISMATCH`, and
`NOT_INITIALIZED`.

> **Note: Test users**
>
> Test users can still get campaigns from `getCampaigns()` while `campaignsAvailable` is `false`, for example in a blocked or mismatched country. This happens only for test users. For real users, `campaignsAvailable` is reliable.

> **Warning**
>
> The `isFraud` flag is informational. Do not hide campaigns based on it; the SDK manages the
> experience for flagged users.

## Record the Placement Impression

Call `executeImpressionEvent` every time the button or placement that opens the catalog becomes visible. Await it before `showCatalog` so the local impression record is available before the catalog checks it. Analytics delivery remains fire-and-forget, so this does not add network delay.

This required step records how many users see the catalog entry point so you can measure conversion from placement views to catalog opens. Pass the predefined `CatalogPlacement` that describes the entry point, or use `CatalogPlacement.custom` when none applies.

```dart
await Playtime.executeImpressionEvent(CatalogPlacement.navbar);
```

The call resolves after the impression is recorded locally and does not wait for
analytics delivery. `showCatalog` fails if `executeImpressionEvent` has not been called
within the previous 30 minutes. Repeated calls safely refresh the visibility record
while duplicate analytics events are suppressed. The placement passed here and the
placement in `showCatalog` are independent and do not need to match.

## Show the Catalog

Pass catalog-specific options to `showCatalog`:

```dart
await Playtime.showCatalog(CatalogOptions(
  placement: CatalogPlacement.navbar,
  category: AppCategory.gaming,
));
```

Keep the launch button disabled while the native catalog is being presented to prevent
duplicate presentations.

### CatalogOptions Parameters

| Parameter      | Type                | Required | Default              | Description                                                                                                                                                                                    |
| -------------- | ------------------- | -------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `placement`    | `CatalogPlacement?` | No       | `null`               | Where the catalog is triggered from. Use a predefined getter (`CatalogPlacement.navbar`, `CatalogPlacement.icon`, `CatalogPlacement.earnTab`, and more) or `CatalogPlacement.custom('value')`. |
| `category`     | `AppCategory?`      | No       | `AppCategory.gaming` | If omitted, the SDK uses the gaming category. Pass `AppCategory.nonGaming` or `AppCategory.both` for another selection.                                                                        |
| `promotionTag` | `String?`           | No       | `null`               | Tag used to filter campaigns by promotion.                                                                                                                                                     |
| `metadata`     | `PlaytimeMetadata?` | No       | `null`               | Request metadata returned in S2S payouts. Contains optional `metadata1` and `metadata2` strings.                                                                                               |

See [CatalogPlacement and AppCategory](https://test-docs.adjoe.zone/rewarded-solutions/sdks/api-reference#option-values) for every predefined value. Any value passed through `custom` is treated as custom.

## Handle Errors

Rejected native calls surface as a Dart `PlatformException`. Catch it and read the
structured values from `e.details`:

```dart
import 'package:flutter/services.dart';

try {
  await Playtime.showCatalog(CatalogOptions(
    placement: CatalogPlacement.navbar,
    category: AppCategory.gaming,
  ));
} on PlatformException catch (e) {
  final details = e.details as Map?;
  final errorType = details?['errorType'] as String?;
  final isRetryable = (details?['isRetryable'] as bool?) ?? false;
  // Retry only when isRetryable is true.
}
```

Retry only when `isRetryable` is `true`. Ask the user to disable a VPN for the
`NETWORK_VPN` error type; verify integration options for `SDK_CONFIG`; and report
persistent `RESPONSE_FORMAT` or `UNKNOWN` errors to adjoe.

Rejected native calls surface as a Dart `PlatformException`. Catch it with
`on PlatformException` and read the structured values from `e.details`, which is a map:

| `e.details` key | Type     | Description                                  |
| --------------- | -------- | -------------------------------------------- |
| `code`          | `String` | Native error identifier when available.      |
| `errorType`     | `String` | Categorized error type (see values below).   |
| `isRetryable`   | `bool`   | Whether the operation can be safely retried. |
| `message`       | `String` | Human-readable error description.            |

`errorType` holds one of the string values `NETWORK`, `NETWORK_VPN`, `API`,
`RESPONSE_FORMAT`, `SDK_CONFIG`, or `UNKNOWN`. The top-level `PlatformException.message`
carries the same human-readable text.

```dart
try {
  await Playtime.showCatalog(options);
} on PlatformException catch (e) {
  final details = e.details as Map?;
  final errorType = details?['errorType'] as String?;
  final isRetryable = (details?['isRetryable'] as bool?) ?? false;
  final code = details?['code'] as String?;
  // Retry only when isRetryable is true.
}
```

## Teardown (Optional)

Release SDK state when the current user signs out or when you need to reset the
integration:

```dart
await Playtime.teardown();
```

Use `teardown()` to deinitialize the SDK and release all internal resources. Call this when the user logs out or when Playtime is no longer needed in the current session.

> **Warning**
>
> After calling `teardown()`, you must call `initPlaytime` again before using any other SDK method.
> Teardown does not replace UA values already recorded by the backend.

## Set Up Server-to-Server Payouts

Finally, set up [Server-to-Server (S2S) payouts](https://test-docs.adjoe.zone/rewarded-solutions/setting-up-rewarding/server-to-server-payouts) so your backend can receive payout callbacks and distribute rewards to users.

## API Reference

See the [Playtime API Reference](https://test-docs.adjoe.zone/rewarded-solutions/sdks/api-reference) for option values and platform API links.

## Verification Checklist

1. Use the Android and iOS SDK hashes only in their corresponding native builds.
2. Await `initPlaytime` before calling another SDK method.
3. Initialize again with `userId` if it was unavailable at app startup.
4. Confirm `getStatus` reports `isInitialized` and the intended user ID.
5. Use `details.campaignsAvailable` as the primary availability signal.
6. Inspect `details.campaignsState` when campaigns are unavailable.
7. Record an impression every time the catalog entry point becomes visible.
8. Await the local impression before opening the catalog.
9. Pass only presentation fields in the catalog options.
10. Prevent duplicate catalog presentations while a launch is in progress.
11. Handle every `PlatformException` and retry only retryable failures.
12. Call `teardown` on logout and initialize again before the next use.
13. Test initialization, status, impression refresh, catalog presentation, errors, and
    teardown on physical Android and iOS devices.
