# Migrate to v5

Follow this guide to migrate your Flutter Studio integration from v4 to v5. The methods keep
the `Future` and `async`/`await` style.

## What's changing

v5 makes initialization explicit, replaces the shared `PlaytimeOptions` with
purpose-specific options, and gives Studio methods clearer names. It also adds required TOS
consent and structured error handling.

The main integration rule is: wait for `initPlaytime` to complete successfully before
calling any other SDK or Studio method.

## What you need to update

### 1. Update the dependency

Point the `adjoe` package at the 5.0.0 release as described in
[Get Started](https://test-docs.adjoe.zone/rewarded-solutions/sdks/getting-started-flutter/), then run `flutter pub get`. The package wraps
`io.adjoe:adjoe-sdk-android:5.0.0` on Android and `PlaytimeSDK` 5.0.0 on iOS. Run
`pod install` in `ios/` and rebuild both native targets after the upgrade.

The entry points are the ready-to-use `Playtime` and `PlaytimeStudio` instances from the
package:

```dart
import 'package:adjoe/sdk.dart';
```

### 2. Replace implicit initialization

Initialize Playtime as early as possible and await the result before calling any other SDK
or Studio method.

Replace `setPlaytimeOptions` and the combined `PlaytimeOptions` object with
`initPlaytime(InitOptions)`.

**Before (v4):**

```dart
final options = PlaytimeOptions(
  sdkHash: 'YOUR_SDK_HASH',
  userId: 'user_123',
);

await Playtime.setPlaytimeOptions(options);
```

**After (v5):**

```dart
final options = InitOptions(
  sdkHash: 'YOUR_SDK_HASH',
  userId: 'user_123',
  uaNetwork: 'network',
  uaChannel: 'channel',
);

await Playtime.initPlaytime(options);
```

At app start, v5 waits five seconds and then sends a lightweight session-start event for
reporting. The event contains no personal user data and identifies only an anonymous user.
It does not initialize or create a Playtime user.

### 3. Split initialization options from campaign options

| Concern                   | v4                                                         | v5                                                              |
| ------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------- |
| Initialization            | `PlaytimeOptions` with `setPlaytimeOptions`                | `InitOptions` with `initPlaytime`                               |
| Available/offer campaigns | `PlaytimeOptions` passed to campaign and token-based calls | `CampaignOptions` passed to `getCampaigns` or `getOfferDetails` |
| Installed campaigns       | `PlaytimeOptions` passed to `getInstalledCampaigns`        | `InstalledCampaignOptions` passed to `getInstalledCampaigns`    |
| Placement/presentation    | String placement and display values in `PlaytimeParams`    | Typed placement and presentation fields in `CampaignOptions`    |

**Before (v4):**

```dart
final response = await PlaytimeStudio.getCampaigns(options);
```

**After (v5):**

```dart
final campaignOptions = CampaignOptions(
  placement: StudioPlacement.navbar,
  category: AppCategory.gaming,
);

final response = await PlaytimeStudio.getCampaigns(campaignOptions);

final installed = await PlaytimeStudio.getInstalledCampaigns(
  InstalledCampaignOptions(category: AppCategory.gaming),
);
```

- UA fields move to `InitOptions`. Each field independently records its first non-null value and cannot later be cleared or changed.
- Placement uses the typed placement value in `CampaignOptions`.
- To change mutable, non-UA initialization values, call `initPlaytime` again and await successful completion.

### 4. Update renamed methods

#### Campaign impressions (formerly "engagements")

| v4                                         | v5                                          |
| ------------------------------------------ | ------------------------------------------- |
| `executeEngagement(campaign, type)`        | `executeCampaignImpression(campaign, type)` |
| `executeEngagementWithToken(appID, token)` | `executeOfferImpression(token, appID)`      |

```dart
// v4
await PlaytimeStudio.executeEngagement(campaign, 'DEFAULT');

// v5
await PlaytimeStudio.executeCampaignImpression(
  campaign,
  PlaytimeImpressionType.DEFAULT,
);
```

#### Details and installed views

| v4                                      | v5                               |
| --------------------------------------- | -------------------------------- |
| `showAppDetails(campaign: campaign)`    | `showCampaignDetails(campaign)`  |
| `showAppDetailsWithToken(token, appId)` | `showOfferDetails(token, appID)` |
| `showInstalledApps()`                   | `showInstalledCampaigns()`       |

#### Offer API

| v4                              | v5                                         |
| ------------------------------- | ------------------------------------------ |
| `getCampaigns(tokens, options)` | `getOfferDetails(tokens, campaignOptions)` |

### 5. Change view tracking from 50% to full visibility

> **Warning: Update impression tracking for v5**
>
> - **Card visibility:** In v4, send the view when at least 50% of the campaign card is
>   visible. When migrating to v5, update your visibility check to send the view only when
>   100% of the campaign card is visible in the viewport.
> - **Before installation:** Send `executeCampaignImpression` with
>   `PlaytimeImpressionType.DEFAULT` for an SDK campaign, or `executeOfferImpression` for an
>   Offer API item, before `openInStore`. An engaged impression does not satisfy this
>   requirement, and `openInStore` can fail without the qualifying view.
> - **Custom details:** Send `PlaytimeImpressionType.ENGAGED` when the user opens
>   publisher-built campaign details.

### 6. Add TOS consent handling

Before using Studio, incorporate adjoe's Terms of Service into your own terms and ask the user
to accept those terms through explicit input. Never infer consent or submit acceptance
automatically. Campaigns remain unavailable until you report the user's acceptance with
`updateTosConsent`. If the user later withdraws consent, report the withdrawal with the same
method.

```dart
await PlaytimeStudio.updateTosConsent(TosConsentAction.ACCEPT);
await PlaytimeStudio.updateTosConsent(TosConsentAction.WITHDRAW);
```

### 7. Update error handling

Rejected native calls surface as a Dart `PlatformException`. Catch it with
`on PlatformException` and read the structured values from `e.details`:

```dart
try {
  await PlaytimeStudio.getCampaigns(campaignOptions);
} on PlatformException catch (e) {
  final details = e.details as Map?;
  final errorType = details?['errorType'] as String?;
  final isRetryable = details?['isRetryable'] as bool?;
  final code = details?['code'];
}
```

### 8. Replace removed APIs and configuration

- Read usage-access state from `Playtime.getStatus()` instead of a separate permissions call.
- Engagement types are now `PlaytimeImpressionType`.

Read permission state from status and guard the Android-only prompt:

```dart
if (Platform.isAndroid) {
  final status = await Playtime.getStatus();
  if (status.isUsagePermissionAccepted != true) {
    await PlaytimeStudio.showPermissionsPrompt();
  }
}
```

Android usage access is required to measure play duration and serve time-based reward behavior. iOS has no usage-access prompt and does not support Android time-based rewards. Other eligible campaign and reward types remain available independently.

The following features previously required enabling through the Monetize Dashboard. In v5, they are enabled by default:

| Feature                  | Description                                                 |
| ------------------------ | ----------------------------------------------------------- |
| View tracking            | Impression tracking is always active                        |
| Install validation       | Views are required before a click is counted                |
| Engaged click            | Available without dashboard configuration                   |
| Pending installs         | Install detection after `openInStore` is automatic          |
| Inline installs (Studio) | In-app store UI is available without config where supported |

v5 adds an inline-install argument to `openInStore`. Request the supported inline store
experience directly:

```dart
await PlaytimeStudio.openInStore(campaign, true);
```

The second argument requests the supported native inline store flow. Availability varies by platform and SDK configuration; when it is unavailable, or when you pass `false`, the external native store flow opens.

#### Reward notifications

Reward notifications are disabled by default in v5. To use them on Android, contact your
Technical Account Manager (TAM) and ask them to enable the configuration for your app.

## Migration checklist

1. Point the `adjoe` package at 5.0.0 and run `flutter pub get` and `pod install`.
2. Replace `setPlaytimeOptions` with `initPlaytime`.
3. Await the `initPlaytime` result before calling other SDK or Studio methods.
4. Account for the anonymous session-start event sent five seconds after app start.
5. Contact your TAM if you want reward notifications enabled on Android.
6. Split `PlaytimeOptions` into `InitOptions`, `CampaignOptions`, and `InstalledCampaignOptions`.
7. Set each UA field with its intended first non-null value; later initialization or teardown cannot replace it.
8. Rename engagement methods to campaign or offer impression methods.
9. For custom UI, change the view threshold from 50% to 100% card visibility, and send the required `PlaytimeImpressionType.DEFAULT` campaign impression or token-based offer impression before `openInStore`.
10. Rename `showAppDetails` and `showInstalledApps` to their campaign equivalents.
11. Replace token-based `getCampaigns` with `getOfferDetails`.
12. Add explicit TOS management through `updateTosConsent`.
13. Read the `e.details` fields in your `on PlatformException` handler.
14. Read usage-access state from `getStatus`, and keep `showPermissionsPrompt` Android-only.
15. Remove assumptions that the formerly configurable features must be enabled in the dashboard.
16. Rebuild and test both native targets.

## Need help?

- [API Reference](https://test-docs.adjoe.zone/rewarded-solutions/sdks/api-reference): full v5 method signatures and types
- [Studio Changelog](https://test-docs.adjoe.zone/rewarded-solutions/sdks/studio/changelog): complete list of Studio changes
- Contact your Account Manager for migration support
- [Quick-Start Custom UI](https://test-docs.adjoe.zone/rewarded-solutions/sdks/studio/build-your-ui/quick-start-flutter/): use the managed Studio views
- [Custom UI](https://test-docs.adjoe.zone/rewarded-solutions/sdks/studio/build-your-ui/custom-ui/use-sdk-flutter/): build and track your own Studio UI

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

### CampaignOptions

### CampaignOptions

| Parameter       | Type                | Required | Default              | Description                                                                                                             |
| --------------- | ------------------- | -------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `placement`     | `StudioPlacement?`  | No       | `null`               | Where campaigns are displayed. Use a predefined `StudioPlacement` getter or `StudioPlacement.custom`.                   |
| `category`      | `AppCategory?`      | No       | `AppCategory.gaming` | If omitted, the SDK uses the gaming category. Pass `AppCategory.nonGaming` or `AppCategory.both` for another selection. |
| `displayFormat` | `DisplayFormat?`    | No       | `null`               | How campaigns are visually presented through your custom UI. Use a predefined getter or `DisplayFormat.custom`.         |
| `promotionTag`  | `String?`           | No       | `null`               | Tag used to filter campaigns by promotion.                                                                              |
| `metadata`      | `PlaytimeMetadata?` | No       | `null`               | Request metadata returned in S2S payouts. Contains optional `metadata1` and `metadata2` strings.                        |

See [StudioPlacement, DisplayFormat, and AppCategory](https://test-docs.adjoe.zone/rewarded-solutions/sdks/api-reference#option-values) for every predefined value. Any other placement or display-format value passed through `custom` is treated as custom.

### InstalledCampaignOptions

| Parameter  | Type           | Required | Default              | Description                                                                                                             |
| ---------- | -------------- | -------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `category` | `AppCategory?` | No       | `AppCategory.gaming` | If omitted, the SDK uses the gaming category. Pass `AppCategory.nonGaming` or `AppCategory.both` for another selection. |
