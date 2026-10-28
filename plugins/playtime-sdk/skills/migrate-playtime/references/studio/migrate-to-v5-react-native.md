# Migrate to v5

Follow this guide to migrate your React Native Studio integration from v4 to v5.

## What's changing

v5 makes initialization explicit, replaces the shared `PlaytimeOptions` and
`PlaytimeParams` with purpose-specific options, and gives Studio methods clearer names.
It also adds required TOS consent and structured error handling while keeping the
Promise-based wrapper API.

The main integration rule is: wait for `initPlaytime` to complete successfully before
calling any other SDK or Studio method.

## What you need to update

### 1. Update the dependency

Update the React Native package and install the iOS pods:

```bash
npm install --save https://github.com/adjoeio/adjoe-react-native-sdk#v5.0.0
npx pod-install
```

React Native autolinking configures the bridge. Update the explicit Android and iOS
native dependencies as described in [Get Started](https://test-docs.adjoe.zone/rewarded-solutions/sdks/getting-started-react-native/).
Confirm Android resolves `io.adjoe:adjoe-sdk-android:5.0.0` and iOS resolves
`PlaytimeSDK` 5.0.0. Clean and rebuild both native apps after the upgrade; a JavaScript
reload does not install the new native module.

### 2. Replace implicit initialization

Initialize Playtime as early as possible in the app lifecycle and wait for initialization to complete successfully before calling any other SDK method. Prefer `Application.onCreate` on Android, app launch on iOS, and app startup in React Native.

Replace `setPlaytimeOptions` and the combined `PlaytimeOptions` object with `initPlaytime(InitOptions)`.

v5 removed implicit initialization. The `initPlaytime` Promise must resolve before you call any other SDK or Studio method.

**Before (v4):**

```tsx
await Playtime.setPlaytimeOptions({
  sdkHash: 'YOUR_SDK_HASH',
  userId: 'user_123',
  country: 'DE',
  params: { placement: 'Navbar', promotionTag: 'promotion-id' },
});
```

**After (v5):**

```tsx
await Playtime.initPlaytime({
  sdkHash: 'YOUR_SDK_HASH',
  userId: 'user_123',
  uaNetwork: 'network',
  uaChannel: 'channel',
});
```

At app start, v5 waits five seconds and then sends a lightweight session-start event for reporting. The event contains no personal user data and identifies only an anonymous user. It does not initialize or create a Playtime user.

`country` is an optional ISO 3166-1 alpha-2 code used to map a user to their reward currency. Set it only when your integration supports multiple currencies, and set it only once per user because the backend does not accept replacements. Invalid non-empty values cause initialization to fail.

If you disabled SDK warm-up or auto-initialization in v4, remove the obsolete native
configuration. Remove `io.adjoe.Playtime.AUTO_INIT_ENABLED` from `AndroidManifest.xml`,
remove `isAutoInitEnabled` from `Info.plist`, and delete `adjoe-playtime.plist`. No cleanup
is needed if you never added these settings.

### 3. Split initialization options from campaign options

| Concern                   | v4                                                         | v5                                                              |
| ------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------- |
| Initialization            | `PlaytimeOptions` with `setPlaytimeOptions`                | `InitOptions` with `initPlaytime`                               |
| Available/offer campaigns | `PlaytimeOptions` passed to campaign and token-based calls | `CampaignOptions` passed to `getCampaigns` or `getOfferDetails` |
| Installed campaigns       | `PlaytimeOptions` passed to `getInstalledCampaigns`        | `InstalledCampaignOptions` passed to `getInstalledCampaigns`    |
| Placement/presentation    | String placement and display values in `PlaytimeParams`    | Typed placement and presentation fields in `CampaignOptions`    |

**Before (v4):**

```tsx
const options = {
  sdkHash: 'YOUR_SDK_HASH',
  userId: 'user_123',
  params: { placement: 'Navbar', promotionTag: 'summer-promotion' },
};

await Playtime.setPlaytimeOptions(options);
await PlaytimeStudio.getCampaigns(options);
```

**After (v5):**

```tsx
import {
  AppCategory,
  StudioPlacement,
  type CampaignOptions,
} from 'react-native-adjoe-sdk';

const campaignOptions: CampaignOptions = {
  placement: StudioPlacement.Navbar,
  category: AppCategory.GAMING,
};

const campaigns = await PlaytimeStudio.getCampaigns(campaignOptions);
const installed = await PlaytimeStudio.getInstalledCampaigns({
  category: AppCategory.GAMING,
});
```

- `PlaytimeParams` has been removed.
- UA fields move to `InitOptions`. Each field independently records its first non-null value and cannot later be cleared or changed.
- Placement uses the typed placement value in `CampaignOptions`.
- To change mutable, non-UA initialization values, call `initPlaytime` explicitly again and wait for successful completion.

### 4. Update renamed methods

#### Campaign impressions (formerly "engagements")

| v4                                         | v5                                          |
| ------------------------------------------ | ------------------------------------------- |
| `executeEngagement(campaign, type)`        | `executeCampaignImpression(campaign, type)` |
| `executeEngagementWithToken(appID, token)` | `executeOfferImpression(token, appID)`      |

```tsx
import { PlaytimeImpressionType } from 'react-native-adjoe-sdk';

// v4
await PlaytimeStudio.executeEngagement(campaign, 'default');

// v5
await PlaytimeStudio.executeCampaignImpression(campaign, PlaytimeImpressionType.DEFAULT);
```

#### Deeplinks and details

| v4                                              | v5                               |
| ----------------------------------------------- | -------------------------------- |
| `showAppDetails(campaign)`                      | `showCampaignDetails(campaign)`  |
| `showAppDetailsWithToken(token, campaignAppId)` | `showOfferDetails(token, appID)` |
| `showInstalledApps()`                           | `showInstalledCampaigns()`       |

```tsx
// v4
await PlaytimeStudio.showAppDetailsWithToken(token, appID);

// v5
await PlaytimeStudio.showOfferDetails(token, appID);
```

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
>   publisher-built campaign details. No dashboard configuration is required.

### 6. Add TOS consent handling

Before using Studio, incorporate adjoe's Terms of Service into your own terms and ask the user
to accept those terms through explicit input. Never infer consent or submit acceptance
automatically. Campaigns remain unavailable until you report the user's acceptance with
`updateTosConsent`. If the user later withdraws consent, report the withdrawal with the same
method.

```tsx
import { TosConsentAction } from 'react-native-adjoe-sdk';

await PlaytimeStudio.updateTosConsent(TosConsentAction.ACCEPT);
await PlaytimeStudio.updateTosConsent(TosConsentAction.WITHDRAW);
```

### 7. Update error handling

All bridge APIs return Promises and normalize native rejections to `PlaytimeException`. Use the
exported type guard before reading structured fields.

```tsx
import { isPlaytimeException } from 'react-native-adjoe-sdk';

try {
  await PlaytimeStudio.getCampaigns(campaignOptions);
} catch (error: unknown) {
  if (isPlaytimeException(error)) {
    console.warn(error.code, error.errorType, error.isRetryable, error.message);
  }
}
```

### 8. Remove obsolete APIs and configuration

- `PlaytimeStudio.getPermissions()` — use the Promise-based `Playtime.getStatus()` instead
- `PlaytimeEngagementType` / `EngagementType` — use the v5 impression type
- Native `context` parameters — removed from Studio methods because context is stored after initialization

Read permission state from status and guard the Android-only prompt:

```tsx
const status = await Playtime.getStatus();

if (Platform.OS === 'android' && !status.isUsagePermissionAccepted) {
  await PlaytimeStudio.showPermissionsPrompt();
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

No dashboard configuration changes are needed for these features in v5. Android and iOS can present different native store experiences; use the wrapper's supported `openInStore` arguments for each platform.

Request the supported inline store experience directly:

```tsx
await PlaytimeStudio.openInStore(campaign, true);
```

#### Reward notifications

Reward notifications are disabled by default in v5. To use them on Android, contact your
Technical Account Manager (TAM) and ask them to enable the configuration for your app.

#### Verify the native projects

1. Confirm React Native autolinking detects `react-native-adjoe-sdk`.
2. Confirm Android resolves Playtime SDK 5.0.0 and guard `showPermissionsPrompt()` with `Platform.OS === 'android'`.
3. Run `pod install --repo-update`, confirm iOS resolves `PlaytimeSDK` 5.0.0, and verify App Attest uses the `production` environment for Debug and Release.
4. Build new Android and iOS binaries. Expo Go cannot load this native module.
5. Test initialization, consent, status, impressions, details, `openInStore`, and `Playtime.teardown()` on both platforms. After teardown, call `initPlaytime` again before using the SDK.

## Migration checklist

1. Update `react-native-adjoe-sdk` to v5.0.0 and install the iOS pods.
2. Replace `setPlaytimeOptions` with `initPlaytime`.
3. Wait for `initPlaytime` to resolve before calling other SDK or Studio methods.
4. Account for the anonymous session-start event sent five seconds after app start.
5. Contact your TAM if you want reward notifications enabled on Android.
6. Split `PlaytimeOptions` into `InitOptions`, `CampaignOptions`, and `InstalledCampaignOptions`.
7. Set each UA field with its intended first non-null value; later initialization or teardown cannot replace it.
8. If you disabled SDK warm-up in v4, remove the obsolete Android and iOS native configuration.
9. Rename engagement methods to campaign or offer impression methods.
10. For custom UI, change the view threshold from 50% to 100% card visibility, and send the required `PlaytimeImpressionType.DEFAULT` campaign impression or token-based offer impression before `openInStore`.
11. Rename app detail and installed app deeplinks to their campaign equivalents.
12. Replace token-based `getCampaigns` with `getOfferDetails`.
13. Add explicit TOS management through `updateTosConsent`.
14. Use `isPlaytimeException` for rejected Promise values.
15. Remove deprecated API usage, replace `getPermissions` with `getStatus`, and keep `showPermissionsPrompt` Android-only.
16. Remove assumptions that the formerly configurable features must be enabled in the dashboard.
17. Verify autolinking and pods, then rebuild and test both native apps outside Expo Go.

## Need help?

- [API Reference](https://test-docs.adjoe.zone/rewarded-solutions/sdks/api-reference) — full v5 method signatures and types
- [Studio Changelog](https://test-docs.adjoe.zone/rewarded-solutions/sdks/studio/changelog) — complete list of Studio changes
- Contact your Account Manager for migration support
- [Quick-Start Custom UI](https://test-docs.adjoe.zone/rewarded-solutions/sdks/studio/build-your-ui/quick-start-react-native/) - use the managed Studio views
- [Custom UI](https://test-docs.adjoe.zone/rewarded-solutions/sdks/studio/build-your-ui/custom-ui/use-sdk-react-native/) - build and track your own Studio UI

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

### CampaignOptions and InstalledCampaignOptions

### CampaignOptions

| Parameter       | Type                       | Required | Default              | Description                                                                                                         |
| --------------- | -------------------------- | -------- | -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `placement`     | `StudioPlacement \| null`  | No       | `null`               | Where campaigns are displayed. Use a predefined `StudioPlacement` value or a custom string.                         |
| `category`      | `AppCategory`              | No       | `AppCategory.GAMING` | If omitted, the SDK uses the gaming category. Specify `NON_GAMING` or `BOTH` to request another category selection. |
| `displayFormat` | `DisplayFormat \| null`    | No       | `null`               | How campaigns are visually presented through your custom UI. Use a predefined value or custom string.               |
| `promotionTag`  | `string \| null`           | No       | `null`               | Tag used to filter campaigns by promotion.                                                                          |
| `metadata`      | `PlaytimeMetadata \| null` | No       | `null`               | Request metadata returned in S2S payouts. Contains optional `metadata1` and `metadata2` strings.                    |

See [StudioPlacement, DisplayFormat, and AppCategory](https://test-docs.adjoe.zone/rewarded-solutions/sdks/api-reference#option-values) for every predefined value. Any other placement or display-format string is treated as custom.

### InstalledCampaignOptions

| Parameter  | Type          | Required | Default              | Description                                                                                                         |
| ---------- | ------------- | -------- | -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `category` | `AppCategory` | No       | `AppCategory.GAMING` | If omitted, the SDK uses the gaming category. Specify `NON_GAMING` or `BOTH` to request another category selection. |
