# Quick-Start Custom UI

Quick-Start Custom UI combines your React Native campaign placements with adjoe-managed campaign,
offer, and installed-campaign views. The React Native v5 bridge exposes Promise-based methods;
await each operation and handle rejected Promises.

> **Danger: Premium Feature**
>
> Playtime Studio is a premium feature available by agreement with your adjoe Account Manager.
> Contact your AM to enable Studio and obtain separate Android and iOS SDK hashes.

## Initialize the SDK

Complete [React Native setup](../../getting-started-react-native.md), then initialize with the SDK
hash for the current platform. Never use the Android hash in an iOS build or the iOS hash in an
Android build.

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

```tsx
import Playtime, { PlaytimeStudio } from 'react-native-adjoe-sdk';

await Playtime.initPlaytime({
  sdkHash: 'YOUR_PLATFORM_SDK_HASH',
  userId: 'user_123',
});
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

```tsx
import { TosConsentAction } from 'react-native-adjoe-sdk';

await PlaytimeStudio.updateTosConsent(TosConsentAction.ACCEPT);

// If the user later withdraws consent:
await PlaytimeStudio.updateTosConsent(TosConsentAction.WITHDRAW);
```

## Request Usage Permission (Android Only)

Android usage access enables time-based campaigns and play-duration measurement. Request it
after clear user intent and guard the Android-only API. iOS has no usage-access prompt and does
not support Android time-based rewards.

```tsx
import { Platform } from 'react-native';

if (Platform.OS === 'android') {
  const status = await Playtime.getStatus();
  if (!status.isUsagePermissionAccepted) {
    await PlaytimeStudio.showPermissionsPrompt();
  }
}
```

Users without usage access can still receive other eligible campaign and reward types.

## Get SDK Campaigns or Offer API Campaigns

Build campaign cards from [SDK Models](sdk-models.md). For a full publisher-built experience,
see the [Advanced Custom UI Visual Guide](custom-ui/visual-guide.md). Preserve the returned
order and pass unmodified campaign objects to later SDK calls.

### SDK Campaigns

Check availability, then fetch campaigns for your placement. Preserve the returned order.

```tsx
import {
  AppCategory,
  StudioPlacement,
  type CampaignOptions,
} from 'react-native-adjoe-sdk';

const status = await Playtime.getStatus();
if (!status.details.campaignsAvailable) {
  // Do not render the placement. Inspect campaignsState for the reason.
  return;
}

const campaignOptions: CampaignOptions = {
  placement: StudioPlacement.Navbar,
  category: AppCategory.GAMING,
};
const response = await PlaytimeStudio.getCampaigns(campaignOptions);
const campaigns = response.campaigns;
```

### Offer API Campaigns

Select offers on your backend, then enrich their tokens with SDK models. Keep each Offer API token
and app ID associated with its enriched campaign model. Keep Offer API credentials and server-side
API tokens out of the app. An SDK campaign-availability check is not required for this route
because the Offer API handles eligibility.

```tsx
const offer = { token: 'token_from_offer_api', appID: 'app_id_from_offer_api' };
const response = await PlaytimeStudio.getOfferDetails([offer.token], campaignOptions);
const campaigns = response.campaigns;
```

See [Offer API](offer-api.md) for the server-side request and token flow.

### CampaignOptions

| Parameter       | Type                       | Required | Default              | Description                                                                                                         |
| --------------- | -------------------------- | -------- | -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `placement`     | `StudioPlacement \| null`  | No       | `null`               | Where campaigns are displayed. Use a predefined `StudioPlacement` value or a custom string.                         |
| `category`      | `AppCategory`              | No       | `AppCategory.GAMING` | If omitted, the SDK uses the gaming category. Specify `NON_GAMING` or `BOTH` to request another category selection. |
| `displayFormat` | `DisplayFormat \| null`    | No       | `null`               | How campaigns are visually presented through your custom UI. Use a predefined value or custom string.               |
| `promotionTag`  | `string \| null`           | No       | `null`               | Tag used to filter campaigns by promotion.                                                                          |
| `metadata`      | `PlaytimeMetadata \| null` | No       | `null`               | Request metadata returned in S2S payouts. Contains optional `metadata1` and `metadata2` strings.                    |

See [StudioPlacement, DisplayFormat, and AppCategory](../api-reference.md#option-values) for every predefined value. Any other placement or display-format string is treated as custom.

## Track the Qualifying Default View

After retrieval, report a default impression when the entire campaign card is visible in the
viewport. The SDK handles deduplication. This view qualifies the later store interaction.

For a campaign selected by the SDK and returned by `getCampaigns`:

```tsx
import { PlaytimeImpressionType } from 'react-native-adjoe-sdk';

await PlaytimeStudio.executeCampaignImpression(campaign, PlaytimeImpressionType.DEFAULT);
```

For a campaign selected by the Offer API, including one enriched by `getOfferDetails`:

```tsx
await PlaytimeStudio.executeOfferImpression(offer.token, offer.appID);
```

## Open Managed Campaign or Offer Details

Open adjoe's managed details when the user selects a visible card:

```tsx
// Campaign selected by the SDK:
await PlaytimeStudio.showCampaignDetails(campaign);

// Retained identifiers for a campaign selected by the Offer API:
await PlaytimeStudio.showOfferDetails(offer.token, offer.appID);
```

These managed details flows report the engaged impression automatically. Do not send a manual
engaged impression when opening them.

## Get Installed Campaigns and Open the Managed View

Fetch installed campaigns to render a compact in-progress placement. Refresh after the app
returns from the store and whenever the view regains focus so reward progress is current.

```tsx
const response = await PlaytimeStudio.getInstalledCampaigns({
  category: AppCategory.GAMING,
});
const installedCampaigns = response.campaigns;

await PlaytimeStudio.showInstalledCampaigns();
```

Use [SDK Models](sdk-models.md) for installed status, completed rewards, reward totals,
expiration, and milestone fields. The managed installed-campaign view handles the full progress
experience.

### InstalledCampaignOptions

| Parameter  | Type          | Required | Default              | Description                                                                                                         |
| ---------- | ------------- | -------- | -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `category` | `AppCategory` | No       | `AppCategory.GAMING` | If omitted, the SDK uses the gaming category. Specify `NON_GAMING` or `BOTH` to request another category selection. |

## Open Chatbot (Optional)

Open support for a campaign, or omit the campaign for general support:

```tsx
await PlaytimeStudio.openChatbot(campaign);
await PlaytimeStudio.openChatbot();
```

## Check Status and Handle Errors

Use `details.campaignsAvailable` as the primary signal for whether to show SDK campaigns.

```tsx
const status = await Playtime.getStatus();

if (status.isInitialized && status.details.campaignsAvailable) {
  // Campaigns can be shown.
}
```

`PlaytimeStatus` describes the SDK state and whether campaigns are available for the user.

| Field                        | Type                           | Description                                              |
| ---------------------------- | ------------------------------ | -------------------------------------------------------- |
| `version`                    | `string`                       | SDK version string.                                      |
| `isInitialized`              | `boolean`                      | Whether `initPlaytime` completed successfully.           |
| `userId`                     | `string \| null \| undefined`  | User ID passed in `InitOptions`.                         |
| `isTosAccepted`              | `boolean`                      | Whether the user accepted the Terms of Service.          |
| `isUsagePermissionAccepted`  | `boolean \| null \| undefined` | Android usage-access state. The field is omitted on iOS. |
| `details.isFraud`            | `boolean`                      | Whether the user is flagged as potentially fraudulent.   |
| `details.campaignsAvailable` | `boolean`                      | Primary signal for whether to show campaigns.            |
| `details.campaignsState`     | `PlaytimeCampaignsState[]`     | Reasons campaigns are unavailable.                       |
| `details.testGroup`          | `number \| null \| undefined`  | A/B test group identifier.                               |

Use the numeric enum constants when checking campaign states:

```ts
status.details.campaignsState.includes(PlaytimeCampaignsState.VPN_DETECTED);
```

Available values are `READY`, `BLOCKED`, `VPN_DETECTED`, `GEO_MISMATCH`, and
`NOT_INITIALIZED` on `PlaytimeCampaignsState`.

> **Note: Test users**
>
> Test users can still get campaigns from `getCampaigns()` while `campaignsAvailable` is `false`, for example in a blocked or mismatched country. This happens only for test users. For real users, `campaignsAvailable` is reliable.

> **Warning**
>
> The `isFraud` flag is informational. Do not hide campaigns based on it; the SDK manages the
> experience for flagged users.

All SDK methods return Promises and can reject with a structured `PlaytimeException`. Use
`isRetryable` to decide whether to retry and retain the categorized error for diagnostics.

```tsx
import { isPlaytimeException } from 'react-native-adjoe-sdk';

try {
  const response = await PlaytimeStudio.getCampaigns(campaignOptions);
  const campaigns = response.campaigns;
} catch (error: unknown) {
  if (isPlaytimeException(error)) {
    console.warn(error.code, error.errorType, error.isRetryable, error.message);
  }
}
```

All SDK methods can reject with a `PlaytimeException` containing these fields:

| Field         | Type                | Description                                  |
| ------------- | ------------------- | -------------------------------------------- |
| `code`        | `string \| null`    | Native error identifier when available.      |
| `errorType`   | `PlaytimeErrorType` | Categorized error type.                      |
| `isRetryable` | `boolean`           | Whether the operation can be safely retried. |
| `message`     | `string`            | Human-readable error description.            |

`PlaytimeErrorType` has the string values `NETWORK`, `NETWORK_VPN`, `API`,
`RESPONSE_FORMAT`, `SDK_CONFIG`, and `UNKNOWN`. Use `isPlaytimeException(error)` before reading
these fields from a caught `unknown` value.

## Teardown

```tsx
await Playtime.teardown();
```

Use `teardown()` to deinitialize the SDK and release all internal resources. Call this when the user logs out or when Playtime is no longer needed in the current session.

> **Warning**
>
> After calling `teardown()`, you must call `initPlaytime` again before using any other SDK method.
> Teardown does not replace UA values already recorded by the backend.

On Android, campaign operations resolve current campaign objects through an internal cache keyed
by `campaignUUID`. Do not construct campaign objects manually or reuse stale objects after
teardown; initialize again and fetch fresh campaigns.

## Set Up Server-to-Server Payouts

Finally, set up [Server-to-Server (S2S) payouts](https://test-docs.adjoe.zone/rewarded-solutions/setting-up-rewarding/server-to-server-payouts) so your backend can receive payout callbacks and distribute rewards to users.
