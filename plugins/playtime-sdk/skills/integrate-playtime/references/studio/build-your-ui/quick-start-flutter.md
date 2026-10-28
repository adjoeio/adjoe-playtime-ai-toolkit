# Quick-Start Custom UI

> Quick-Start Custom UI combines your Flutter campaign placements with adjoe-managed
> campaign, offer, and installed-campaign views. The v5 methods return `Future`s; await each
> operation and handle errors.

> **Danger: Premium Feature**
>
> Playtime Studio is a premium feature available by agreement with your adjoe Account Manager.
> Contact your AM to enable Studio and obtain separate Android and iOS SDK hashes.

## Initialize the SDK

Complete [Flutter setup](../../getting-started-flutter.md), then initialize with the SDK
hash for the current platform. Never use the Android hash in an iOS build or the iOS hash in
an Android build.

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
import 'package:adjoe/sdk.dart';

await Playtime.initPlaytime(InitOptions(
  sdkHash: 'YOUR_PLATFORM_SDK_HASH',
  userId: 'user_123',
));
```

### InitOptions parameters

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

## Manage TOS Consent

Before using Studio, incorporate adjoe's Terms of Service into your own terms and ask the user
to accept those terms through explicit input. Never infer consent or submit acceptance
automatically. Campaigns remain unavailable until you report the user's acceptance with
`updateTosConsent`. If the user later withdraws consent, report the withdrawal with the same
method.

```dart
await PlaytimeStudio.updateTosConsent(TosConsentAction.ACCEPT);

// If the user later withdraws consent:
await PlaytimeStudio.updateTosConsent(TosConsentAction.WITHDRAW);
```

## Request Usage Permission (Android Only)

Android usage access enables time-based campaigns and play-duration measurement. Request it
after clear user intent and guard the Android-only API. iOS has no usage-access prompt and
does not support Android time-based rewards.

```dart
import 'dart:io' show Platform;

if (Platform.isAndroid) {
  final status = await Playtime.getStatus();
  if (status.isUsagePermissionAccepted != true) {
    await PlaytimeStudio.showPermissionsPrompt();
  }
}
```

Users without usage access can still receive other eligible campaign and reward types.

## Get SDK Campaigns or Offer API Campaigns

Build campaign cards from [SDK Models](sdk-models.md). For a full publisher-built
experience, see the [Advanced Custom UI Visual Guide](custom-ui/visual-guide.md). Preserve
the returned order and pass unmodified campaign objects to later SDK calls.

### SDK Campaigns

Check availability, then fetch campaigns for your placement. Preserve the returned order.

```dart
final status = await Playtime.getStatus();
if (!status.details.campaignsAvailable) {
  // Do not render the placement. Inspect campaignsState for the reason.
  return;
}

final response = await PlaytimeStudio.getCampaigns(CampaignOptions(
  placement: StudioPlacement.navbar,
  category: AppCategory.gaming,
));
final campaigns = response.campaigns;
```

### Offer API Campaigns

Select offers on your backend, then enrich their tokens with SDK models. Keep each Offer API
token and app ID associated with its enriched campaign model. Keep Offer API credentials and
server-side API tokens out of the app. An SDK campaign-availability check is not required for
this route because the Offer API handles eligibility.

```dart
final response = await PlaytimeStudio.getOfferDetails(
  ['token_from_offer_api'],
  CampaignOptions(category: AppCategory.gaming),
);
final campaigns = response.campaigns;
```

See [Offer API](offer-api.md) for the server-side request and token flow.

### CampaignOptions

| Parameter       | Type                | Required | Default              | Description                                                                                                             |
| --------------- | ------------------- | -------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `placement`     | `StudioPlacement?`  | No       | `null`               | Where campaigns are displayed. Use a predefined `StudioPlacement` getter or `StudioPlacement.custom`.                   |
| `category`      | `AppCategory?`      | No       | `AppCategory.gaming` | If omitted, the SDK uses the gaming category. Pass `AppCategory.nonGaming` or `AppCategory.both` for another selection. |
| `displayFormat` | `DisplayFormat?`    | No       | `null`               | How campaigns are visually presented through your custom UI. Use a predefined getter or `DisplayFormat.custom`.         |
| `promotionTag`  | `String?`           | No       | `null`               | Tag used to filter campaigns by promotion.                                                                              |
| `metadata`      | `PlaytimeMetadata?` | No       | `null`               | Request metadata returned in S2S payouts. Contains optional `metadata1` and `metadata2` strings.                        |

See [StudioPlacement, DisplayFormat, and AppCategory](../api-reference.md#option-values) for every predefined value. Any other placement or display-format value passed through `custom` is treated as custom.

## Track the Qualifying Default View

After retrieval, report a default impression when the entire campaign card is visible in the
viewport. The SDK handles deduplication. This view qualifies the later store interaction.

For a campaign selected by the SDK and returned by `getCampaigns`:

```dart
await PlaytimeStudio.executeCampaignImpression(campaign, PlaytimeImpressionType.DEFAULT);
```

For a campaign selected by the Offer API, including one enriched by `getOfferDetails`:

```dart
await PlaytimeStudio.executeOfferImpression('token_from_offer_api', 'app_id_from_offer_api');
```

## Open Managed Campaign or Offer Details

Open adjoe's managed details when the user selects a visible card:

```dart
// Campaign selected by the SDK:
await PlaytimeStudio.showCampaignDetails(campaign);

// Retained identifiers for a campaign selected by the Offer API:
await PlaytimeStudio.showOfferDetails('token_from_offer_api', 'app_id_from_offer_api');
```

These managed details flows report the engaged impression automatically. Do not send a
manual engaged impression when opening them.

## Get Installed Campaigns and Open the Managed View

Fetch installed campaigns to render a compact in-progress placement. Refresh after the app
returns from the store and whenever the view regains focus so reward progress is current.

```dart
final response = await PlaytimeStudio.getInstalledCampaigns(
  InstalledCampaignOptions(category: AppCategory.gaming),
);
final installedCampaigns = response.campaigns;

await PlaytimeStudio.showInstalledCampaigns();
```

Use [SDK Models](sdk-models.md) for installed status, completed rewards, reward totals,
expiration, and milestone fields. The managed installed-campaign view handles the full
progress experience.

### InstalledCampaignOptions

| Parameter  | Type           | Required | Default              | Description                                                                                                             |
| ---------- | -------------- | -------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `category` | `AppCategory?` | No       | `AppCategory.gaming` | If omitted, the SDK uses the gaming category. Pass `AppCategory.nonGaming` or `AppCategory.both` for another selection. |

## Open Chatbot (Optional)

Open support for a campaign, or omit the campaign for general support:

```dart
await PlaytimeStudio.openChatbot(campaign);
await PlaytimeStudio.openChatbot(null);
```

## Check Status and Handle Errors

Use `details.campaignsAvailable` as the primary signal for whether to show SDK campaigns.

```dart
final status = await Playtime.getStatus();

if (status.isInitialized && status.details.campaignsAvailable) {
  // Campaigns can be shown.
}
```

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

All SDK methods return `Future`s and can fail with a `PlatformException`. Read the `details`
map to decide whether to retry and to categorize the error for diagnostics.

```dart
import 'package:flutter/services.dart';

try {
  final response = await PlaytimeStudio.getCampaigns(CampaignOptions(
    placement: StudioPlacement.navbar,
  ));
  final campaigns = response.campaigns;
} on PlatformException catch (e) {
  final details = e.details as Map?;
  final isRetryable = (details?['isRetryable'] as bool?) ?? false;
}
```

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

## Teardown

```dart
await Playtime.teardown();
```

Use `teardown()` to deinitialize the SDK and release all internal resources. Call this when the user logs out or when Playtime is no longer needed in the current session.

> **Warning**
>
> After calling `teardown()`, you must call `initPlaytime` again before using any other SDK method.
> Teardown does not replace UA values already recorded by the backend.

On Android, campaign operations resolve current campaign objects through an internal cache
keyed by `campaignUUID`. Do not construct campaign objects manually or reuse stale objects
after teardown; initialize again and fetch fresh campaigns.

## Set Up Server-to-Server Payouts

Finally, set up [Server-to-Server (S2S) payouts](https://test-docs.adjoe.zone/rewarded-solutions/setting-up-rewarding/server-to-server-payouts) so your backend can receive payout callbacks and distribute rewards to users.
