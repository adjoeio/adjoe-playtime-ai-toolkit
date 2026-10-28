# Migrate to v5

Follow this guide to migrate a Flutter Catalog integration from v4 to v5. Version 5
separates initialization options from catalog options and uses explicit asynchronous
initialization.

---

## 1. Dependency Changes

Update the Git dependency in `pubspec.yaml` to version 5.0.0:

```yaml
dependencies:
  adjoe:
    git:
      url: https://github.com/adjoeio/adjoe-flutter-sdk
      ref: v5.0.0
```

Fetch the package and update the native dependencies as described in
[Get Started](https://test-docs.adjoe.zone/rewarded-solutions/sdks/getting-started-flutter/). Confirm that Android resolves
`io.adjoe:adjoe-sdk-android:5.0.0` and iOS resolves `PlaytimeSDK` 5.0.0. Run
`flutter clean`, then rebuild both native apps; a Dart hot reload does not install the new
native code.

The public entry point moved from `package:adjoe/adjoe.dart` to `package:adjoe/sdk.dart`.

```dart
import 'package:adjoe/sdk.dart';
```

---

## 2. Initialization

Initialize Playtime as early as possible in the app lifecycle and wait for initialization
to complete successfully before calling any other SDK method.

Replace the v4 `Playtime.setPlaytimeOptions(PlaytimeOptions)` call with
`Playtime.initPlaytime(InitOptions)`. The SDK hash moves from `PlaytimeOptions` onto
`InitOptions`, and the returned `Future` must complete before you call any other SDK method.

**Before (v4):**

```dart
await Playtime.setPlaytimeOptions(PlaytimeOptions(
  sdkHash: 'YOUR_SDK_HASH',
  userId: 'user_123',
));
```

**After (v5):**

```dart
await Playtime.initPlaytime(InitOptions(
  sdkHash: 'YOUR_SDK_HASH',
  userId: 'user_123',
  country: 'DE',
));
```

At app start, v5 waits five seconds and then sends a lightweight session-start event for
reporting. The event contains no personal user data and identifies only an anonymous
user. It does not initialize or create a Playtime user.

`country` is an optional ISO 3166-1 alpha-2 code used to map a user to their reward
currency. Set it only when your integration supports multiple currencies, and set it only
once per user because the backend does not accept replacements. The SDK trims and
uppercases the value. Invalid non-empty values cause initialization to fail.

---

## 3. Show Catalog

In v4, user-acquisition and placement values were passed to `showCatalogWithOptions` through
a `PlaytimeParams` object. In v5, UA fields move to `InitOptions` and placement moves to
`CatalogOptions`. Call `executeImpressionEvent` every time the catalog entry point becomes
visible, before calling `showCatalog`.

**Before (v4):**

```dart
await Playtime.showCatalogWithOptions(PlaytimeOptions(
  params: PlaytimeParams(
    placement: 'navbar',
    uaNetwork: 'network',
    uaChannel: 'channel',
  ),
));
```

**After (v5):**

```dart
await Playtime.executeImpressionEvent(CatalogPlacement.navbar);

await Playtime.showCatalog(CatalogOptions(
  placement: CatalogPlacement.navbar,
  category: AppCategory.gaming,
));
```

`executeImpressionEvent` measures how many users see the catalog entry point and the
conversion from a placement view to a catalog open. Pass the predefined `CatalogPlacement`
that describes the entry point, or use `CatalogPlacement.custom` when none applies. Await
it before `showCatalog` so the local impression record is ready. Analytics delivery
remains fire-and-forget and does not add network delay. `showCatalog` fails if no
impression call was made within the previous 30 minutes. Repeated calls safely refresh the
visibility record while duplicate analytics events are suppressed. The impression
placement and the placement passed to `showCatalog` are independent and do not need to
match.

---

## 4. Options Restructuring

The v4 `PlaytimeOptions` and `PlaytimeParams` objects mixed SDK identity, user
acquisition, and catalog presentation fields. In v5, split them into two calls:

| v4 field                                       | v5 location                      |
| ---------------------------------------------- | -------------------------------- |
| `sdkHash`, `userId`                            | `Playtime.initPlaytime(options)` |
| `language`, user profile, extensions           | `Playtime.initPlaytime(options)` |
| `uaNetwork`, `uaChannel` (`PlaytimeParams`)    | `Playtime.initPlaytime(options)` |
| `placement`, `promotionTag` (`PlaytimeParams`) | `Playtime.showCatalog(options)`  |

`PlaytimeParams` is removed entirely. All UA parameters now belong to the initialization
options. Placement belongs to the catalog options.

Each UA field transitions independently from null to its first non-null value. Once the
backend records a non-null value for a field, it cannot be cleared or changed. Later
`initPlaytime` calls, including calls after `teardown`, do not replace it.

`uaCampaignName` replaces the v4 `uaSubPublisherEncrypted` value; the v4
`uaSubPublisherCleartext` has no v5 replacement.

---

## 5. Type-Safe Placements

Use the predefined `CatalogPlacement` getters included with v5. You can also pass a custom
value through `CatalogPlacement.custom`.

```dart
await Playtime.showCatalog(CatalogOptions(
  placement: CatalogPlacement.navbar,
  category: AppCategory.gaming,
));
```

---

## 6. Status

v4 Flutter already exposed `getStatus()`. v5 keeps the single awaitable call and returns the
same shape you read in v4, so continue reading everything from one status object rather than
separate getters:

| Value             | v5 access                                    |
| ----------------- | -------------------------------------------- |
| User ID           | `(await Playtime.getStatus()).userId`        |
| SDK version       | `(await Playtime.getStatus()).version`       |
| Initialized flag  | `(await Playtime.getStatus()).isInitialized` |
| TOS accepted flag | `(await Playtime.getStatus()).isTosAccepted` |

Fetch the status once when reading multiple values:

```dart
final status = await Playtime.getStatus();
final userId = status.userId;
final version = status.version;
```

---

## 7. Error Handling

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

---

## Complete option migration reference

### Map every v4 option

Audit the existing integration before removing `PlaytimeOptions` or `PlaytimeParams`. Preserve
each value at its v5 destination, and ask the publisher whether any newly available optional
fields should be configured.

| v4 field or concept                      | v5 destination or action                                        |
| ---------------------------------------- | --------------------------------------------------------------- |
| SDK hash                                 | `InitOptions.sdkHash`                                           |
| User ID                                  | `InitOptions.userId`                                            |
| Gender and birthday                      | `InitOptions.userProfile.gender` and `.birthday`                |
| Extension/sub-ID values                  | `InitOptions.extensions.subId1` through `subId5`                |
| Language                                 | `InitOptions.language`                                          |
| UA network                               | `InitOptions.uaNetwork`                                         |
| UA channel                               | `InitOptions.uaChannel`                                         |
| `uaSubPublisherEncrypted`                | `InitOptions.uaCampaignName`                                    |
| `uaSubPublisherCleartext`                | Removed with no v5 replacement                                  |
| Country used for reward-currency mapping | `InitOptions.country`                                           |
| String placement                         | Typed `CatalogPlacement` or `StudioPlacement`                   |
| Category                                 | The applicable Catalog, Campaign, or Installed Campaign options |
| Promotion tag                            | `CatalogOptions.promotionTag` or `CampaignOptions.promotionTag` |
| Display format                           | `CampaignOptions.displayFormat`                                 |
| Request-level S2S metadata               | `CatalogOptions.metadata` or `CampaignOptions.metadata`         |

The three UA fields are stored independently. Each can change from null to its first non-null
value, but cannot subsequently be cleared or replaced. Country can also be set only once per
user. Teardown does not reset these backend values.

Use the complete tables below as the source of truth rather than copying only the fields shown in
the minimal migration examples.

### InitOptions

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

### CatalogOptions

| Parameter      | Type                | Required | Default              | Description                                                                                                                                                                                    |
| -------------- | ------------------- | -------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `placement`    | `CatalogPlacement?` | No       | `null`               | Where the catalog is triggered from. Use a predefined getter (`CatalogPlacement.navbar`, `CatalogPlacement.icon`, `CatalogPlacement.earnTab`, and more) or `CatalogPlacement.custom('value')`. |
| `category`     | `AppCategory?`      | No       | `AppCategory.gaming` | If omitted, the SDK uses the gaming category. Pass `AppCategory.nonGaming` or `AppCategory.both` for another selection.                                                                        |
| `promotionTag` | `String?`           | No       | `null`               | Tag used to filter campaigns by promotion.                                                                                                                                                     |
| `metadata`     | `PlaytimeMetadata?` | No       | `null`               | Request metadata returned in S2S payouts. Contains optional `metadata1` and `metadata2` strings.                                                                                               |

See [CatalogPlacement and AppCategory](https://test-docs.adjoe.zone/rewarded-solutions/sdks/api-reference#option-values) for every predefined value. Any value passed through `custom` is treated as custom.

## Migration Checklist

1. Update the `adjoe` Git dependency to `v5.0.0` and change the import to `package:adjoe/sdk.dart`.
2. Replace `Playtime.setPlaytimeOptions(PlaytimeOptions)` with `Playtime.initPlaytime(InitOptions)`.
3. Wait for `initPlaytime` to complete before calling other SDK methods.
4. Account for the anonymous session-start event sent five seconds after app start.
5. Call `executeImpressionEvent` every time the catalog entry point becomes visible.
6. Move UA fields to `InitOptions` and placement to `CatalogOptions`; `PlaytimeParams` is removed.
7. Set each UA field with its intended first non-null value; later initialization or teardown cannot replace it.
8. Use the v5 placement getters and provide the catalog category.
9. Replace individual status getters with `await Playtime.getStatus()`.
10. Catch `PlatformException` and retry only retryable failures.
11. Confirm Android SDK 5.0.0 resolution and `PlaytimeSDK` 5.0.0 pod resolution.
12. Confirm iOS App Attest uses the `production` environment for Debug and Release builds.
13. Rebuild new Android and iOS binaries, then test initialization, `getStatus()`, the catalog, and `teardown()`.

---

