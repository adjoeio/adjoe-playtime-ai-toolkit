# Migrate to v5

Follow this guide to migrate your Studio integration from v4 to v5.

## What's changing

v5 makes initialization explicit, replaces the shared `PlaytimeOptions` and
`PlaytimeParams` with purpose-specific options, and gives Studio methods clearer names.
It also adds required TOS consent and structured error handling.

The main integration rule is: wait for `initPlaytime` to complete successfully before
calling any other SDK or Studio method.

## What you need to update

### 1. Update the dependency

Choose the dependency manager used by your project.

**CocoaPods:** rename the pod in your `Podfile`, then run `pod install --repo-update`.

```ruby
# v4
pod 'PlaytimeMonetize'

# v5
pod 'PlaytimeSDK', '~> 5.0.0'
```

**Swift Package Manager:** remove the v4 Playtime package product, then in Xcode select
**File > Add Package Dependencies**. Enter
`https://github.com/adjoeio/adjoe-monetize-spm`, select version `5.0.0`, and add the v5
package product to your app target.

### 2. Replace implicit initialization

Initialize Playtime as early as possible in the app lifecycle and wait for initialization to complete successfully before calling any other SDK method. Prefer `Application.onCreate` on Android, app launch on iOS, and app startup in React Native.

`setPlaytimeOptions` becomes `initPlaytime`, and initialization fields now belong in
`InitOptions`.

**Before (v4):**

```swift
let options = PlaytimeOptions(sdkHash: "YOUR_SDK_HASH", userId: "user123")
try await Playtime.setPlaytimeOptions(options: options)
```

**After (v5):**

```swift
try await Playtime.initPlaytime(
    options: InitOptions(sdkHash: "YOUR_SDK_HASH", userId: "user123", country: "DE")
)
```

At app start, v5 waits five seconds and then sends a lightweight session-start event for
reporting. The event contains no personal user data, identifies only an anonymous user,
and does not initialize or create a Playtime user.

`country` is an optional ISO 3166-1 alpha-2 code used to map a user to their reward
currency. Set it only when your integration supports multiple currencies, and set it only
once per user because the backend does not accept replacements. Invalid non-empty values
cause initialization to fail with an `.sdkConfig` error.

If you disabled SDK warm-up or auto-initialization in v4, v5 ignores the old
`isAutoInitEnabled` key and `adjoe-playtime.plist` file. Remove both anyway so your
configuration no longer suggests that they control v5 behavior.

### 3. Split initialization options from campaign options

In v4, `PlaytimeOptions` combined initialization and request settings, while
`PlaytimeParams` carried fields such as placement and promotion tag. In v5:

- `InitOptions` configures the SDK and user during `initPlaytime`.
- `CampaignOptions` configures each available-campaign or offer-details request.
- `InstalledCampaignOptions` configures installed-campaign requests.

**Before (v4):**

```swift
let params = PlaytimeParamsBuilder()
    .setPlacement("navbar")
    .setPromotionTag("summer-promotion")
    .build()

let options = PlaytimeOptionsBuilder()
    .setSDKHash("YOUR_SDK_HASH")
    .setUserId("user123")
    .setParams(params)
    .build()

let campaigns = try await PlaytimeStudio.getCampaigns(options: options)
```

**After (v5):**

```swift
try await Playtime.initPlaytime(
    options: InitOptions(sdkHash: "YOUR_SDK_HASH", userId: "user123")
)

let campaignOptions = CampaignOptions(
    placement: .navbar,
    category: .gaming,
    promotionTag: "summer-promotion"
)

let response = try await PlaytimeStudio.getCampaigns(campaignOptions: campaignOptions)
```

Do not pass `PlaytimeOptions` to campaign calls in v5. `PlaytimeOptions` represented the
SDK's overall initialization state; `CampaignOptions` represents only how one Studio
campaign request should be filtered and presented.

UA fields move to `InitOptions`. Each field independently records its first non-null value
and cannot later be cleared or changed. To change mutable, non-UA initialization values,
call `initPlaytime` explicitly again and wait for successful completion.

### 4. Update renamed methods

These APIs keep their purpose but use clearer v5 names:

| Prior use                                      | v4                                         | v5                                                      |
| ---------------------------------------------- | ------------------------------------------ | ------------------------------------------------------- |
| Record an SDK campaign impression              | `executeEngagement(for:, engagementType:)` | `executeCampaignImpression(campaign:, impressionType:)` |
| Record a token-based Offer API impression      | `executeEngagement(appID:, token:)`        | `executeOfferImpression(token:, appID:)`                |
| Open the SDK campaign-managed details deeplink | `showAppDetails(campaign:)`                | `showCampaignDetails(campaign:)`                        |
| Open the Offer API-managed details deeplink    | `showAppDetails(campaignAppId:, token:)`   | `showOfferDetails(token:, appID:)`                      |
| Open the installed-campaigns view              | `showInstalledApps()`                      | `showInstalledCampaigns()`                              |

```swift
// v4
try await PlaytimeStudio.executeEngagement(for: campaign, engagementType: .default)

// v5
try await PlaytimeStudio.executeCampaignImpression(
    campaign: campaign,
    impressionType: .default
)
```

The singular token-based campaign lookup specifically changed from
`getCampaigns(token:options:)` to `getOfferDetails(tokens:campaignOptions:)`. This is a
rename of the SDK method that resolves Offer API tokens, not a broad change to the Offer
API.

`PlaytimeEngagementType` is now `PlaytimeImpressionType`.

### 5. Change view tracking from 50% to full visibility

> **Warning: Update impression tracking for v5**
>
> - **Card visibility:** In v4, send the view when at least 50% of the campaign card is
>   visible. When migrating to v5, update your visibility check to send the view only when
>   100% of the campaign card is visible in the viewport.
> - **Before installation:** Send `executeCampaignImpression` with `.default` for an SDK
>   campaign, or `executeOfferImpression` for an Offer API item, before `openInStore`.
>   `.engaged` does not satisfy this requirement, and `openInStore` can fail without the
>   qualifying view.
> - **Custom details:** Send `.engaged` when the user opens publisher-built campaign details.
>   No dashboard configuration is required.

### 6. Add TOS consent handling

Before using Studio, incorporate adjoe's Terms of Service into your own terms and ask the user
to accept those terms through explicit input. Never infer consent or submit acceptance
automatically. Campaigns remain unavailable until you report the user's acceptance with
`updateTosConsent`. If the user later withdraws consent, report the withdrawal with the same
method.

```swift
try await PlaytimeStudio.updateTosConsent(action: .accept)

// If the user later withdraws consent:
try await PlaytimeStudio.updateTosConsent(action: .withdraw)
```

### 7. Update error handling

All errors are now `PlaytimeException` with structured fields: `code`, `errorType`,
`isRetryable`, and `message`.

```swift
do {
    let response = try await PlaytimeStudio.getCampaigns(
        campaignOptions: campaignOptions
    )
} catch let error as PlaytimeException {
    print("Code: \(error.code)")
    print("Type: \(error.errorType)")

    if error.isRetryable {
        // Safe to retry
    }
} catch {
    // Any other error
}
```

### 8. Remove obsolete APIs and configuration

The following are removals rather than renames:

| Removed API/configuration                                                                                       | Prior use or reason                                    | v5 replacement                                                                                 |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `PlaytimeOptions`                                                                                               | Held initialization and per-request values             | Split values between `InitOptions`, `CampaignOptions`, and `InstalledCampaignOptions`          |
| `PlaytimeParams`                                                                                                | Held UA, placement, and promotion values               | Move UA fields to `InitOptions`; use typed placement and promotion fields in `CampaignOptions` |
| `showPermissionsPrompt()`                                                                                       | Requested a usage permission that iOS does not require | No replacement                                                                                 |
| v4 dashboard flags for view tracking, install validation, engaged clicks, pending installs, and inline installs | Enabled these Studio behaviors                         | No replacement; these behaviors are available by default                                       |

Inline installs no longer require dashboard configuration. Request the in-app App Store
sheet directly:

```swift
try await PlaytimeStudio.openInStore(campaign: campaign, useInlineInstall: true)
```

## Migration checklist

1. Replace the CocoaPod or SPM v4 dependency with the v5 package at version `5.0.0`.
2. Replace `setPlaytimeOptions` with `initPlaytime` and wait for completion.
3. Split v4 `PlaytimeOptions` and `PlaytimeParams` values between `InitOptions`, `CampaignOptions`, and `InstalledCampaignOptions`.
4. Remove the ignored v4 auto-init plist configuration if present.
5. Update the renamed impression, details, installed-campaign, and singular token lookup methods.
6. Add TOS acceptance and withdrawal handling.
7. Change the view threshold from 50% to 100% card visibility, and send the required `.default` or offer impression before `openInStore`.
8. Send `.engaged` when the user opens publisher-built custom details.
9. Update handling from `PlaytimeError` to structured `PlaytimeException` values.
10. Build and test campaign fetch, details, install, and installed-campaign flows.

## Need help?

- [API Reference](https://test-docs.adjoe.zone/rewarded-solutions/sdks/api-reference) - full v5 method signatures and types
- [Studio Changelog](https://test-docs.adjoe.zone/rewarded-solutions/sdks/studio/changelog) - complete list of Studio changes
- Contact your Account Manager for migration support

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

| Parameter       | Type               | Required | Default   | Description                                                                                                          |
| --------------- | ------------------ | -------- | --------- | -------------------------------------------------------------------------------------------------------------------- |
| `placement`     | `StudioPlacement`  | No       | `nil`     | Where campaigns are displayed. Use a predefined value or `.custom("value")`.                                         |
| `category`      | `AppCategory`      | No       | `.gaming` | If omitted, the SDK uses the gaming category. Specify `.nonGaming` or `.both` to request another category selection. |
| `displayFormat` | `DisplayFormat`    | No       | `nil`     | How campaigns are visually presented through your custom UI. Use a predefined value or `.custom("value")`.           |
| `promotionTag`  | `String`           | No       | `nil`     | Tag for user-level promotions. See [User Level Promos](https://test-docs.adjoe.zone/rewarded-solutions/sdks/resources/user-level-promos).                           |
| `metadata`      | `PlaytimeMetadata` | No       | `nil`     | Two optional free-form strings, `metadata1` and `metadata2`, that the SDK sends to adjoe with the campaign request.  |

See [StudioPlacement, DisplayFormat, and AppCategory](https://test-docs.adjoe.zone/rewarded-solutions/sdks/api-reference#option-values) for every predefined value and custom-value syntax. `PlaytimeMetadata` contains optional `metadata1` and `metadata2` strings returned in S2S payouts.

### InstalledCampaignOptions

| Parameter  | Type          | Required | Default   | Description                                                                                                          |
| ---------- | ------------- | -------- | --------- | -------------------------------------------------------------------------------------------------------------------- |
| `category` | `AppCategory` | No       | `.gaming` | If omitted, the SDK uses the gaming category. Specify `.nonGaming` or `.both` to request another category selection. |
