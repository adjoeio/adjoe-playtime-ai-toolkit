# Use the SDK

> This guide covers the SDK operations for an Advanced Custom UI integration: initialize Playtime, fetch
> campaigns, track impressions, and open new or installed campaigns. To turn the returned models
> into UI, continue with [Build the Components](build-components-ios.md).

> **Danger: Premium Feature**
>
> Playtime Studio is a premium feature available by agreement with your adjoe Account Manager.
> Contact your AM to enable Studio and obtain your iOS SDK hash.

## Initialize the SDK

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

```swift
import PlaytimeSDK

let options = InitOptions(
    sdkHash: "YOUR_SDK_HASH",
    userId: "user_123"
)

do {
    try await Playtime.initPlaytime(options: options)
} catch let error as PlaytimeException {
    // Present or log the initialization error.
} catch {
    // Any other error
}
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

```swift
try await PlaytimeStudio.updateTosConsent(action: .accept)
// Later, if needed:
try await PlaytimeStudio.updateTosConsent(action: .withdraw)
```

## Get Campaigns and Offer Details

Choose one retrieval path. Build campaign cards from [SDK Models](../sdk-models.md) and the
[Visual Guide](visual-guide.md). Preserve the returned order and unmodified campaign objects. Set up
impression tracking immediately after retrieval so every rendered placement and custom details
screen reports the correct event.

### SDK campaigns

Check availability, fetch campaigns, and retain the returned model for rendering and later
SDK calls.

```swift
let status = try await Playtime.getStatus()
guard status.details.campaignsAvailable else {
    // Use campaignsState to decide which unavailable state to show.
    return
}

let response = try await PlaytimeStudio.getCampaigns(
    campaignOptions: CampaignOptions(
        placement: .homePage,
        category: .gaming,
        displayFormat: .carousel
    )
)
let campaigns = response.campaigns
```

**`CampaignOptions` parameters**

| Parameter       | Type               | Required | Default   | Description                                                                                                          |
| --------------- | ------------------ | -------- | --------- | -------------------------------------------------------------------------------------------------------------------- |
| `placement`     | `StudioPlacement`  | No       | `nil`     | Where campaigns are displayed. Use a predefined value or `.custom("value")`.                                         |
| `category`      | `AppCategory`      | No       | `.gaming` | If omitted, the SDK uses the gaming category. Specify `.nonGaming` or `.both` to request another category selection. |
| `displayFormat` | `DisplayFormat`    | No       | `nil`     | How campaigns are visually presented through your custom UI. Use a predefined value or `.custom("value")`.           |
| `promotionTag`  | `String`           | No       | `nil`     | Tag for user-level promotions. See [User Level Promos](https://test-docs.adjoe.zone/rewarded-solutions/sdks/studio/build-your-ui/resources/user-level-promos).                           |
| `metadata`      | `PlaytimeMetadata` | No       | `nil`     | Two optional free-form strings, `metadata1` and `metadata2`, that the SDK sends to adjoe with the campaign request.  |

See [StudioPlacement, DisplayFormat, and AppCategory](https://test-docs.adjoe.zone/rewarded-solutions/sdks/studio/build-your-ui/api-reference#option-values) for every predefined value and custom-value syntax. `PlaytimeMetadata` contains optional `metadata1` and `metadata2` strings returned in S2S payouts.

### Offer API campaigns with SDK details

Fetch and rank campaigns on your backend, then pass their tokens to `getOfferDetails` for
SDK models containing images, descriptions, and reward information.

```swift
struct EnrichedOffer {
    let token: String
    let appID: String
    let campaign: PlaytimeCampaign
}

let offers = [(token: "token_from_offer_api", appID: "app_id")]
let tokens = offers.map { $0.token }
let response = try await PlaytimeStudio.getOfferDetails(
    tokens: tokens,
    campaignOptions: CampaignOptions(
        placement: .homePage,
        displayFormat: .carousel
    )
)
// Match by token: the response can omit or reorder offers.
let offersByToken = Dictionary(offers.map { ($0.token, $0) }, uniquingKeysWith: { first, _ in first })
let enrichedOffers = response.campaigns.compactMap { campaign in
    offersByToken[campaign.token].map { offer in
        EnrichedOffer(token: offer.token, appID: offer.appID, campaign: campaign)
    }
}

```

Keep each Offer API token and app ID associated with its enriched campaign model. See the
[Offer API](../offer-api.md) for the backend response and ranking flow.

## Track Default and Engaged Impressions

After retrieving campaigns, report `.default` when the entire campaign card is visible in the
viewport. The SDK handles deduplication.

```swift
try await PlaytimeStudio.executeCampaignImpression(
    campaign: campaign,
    impressionType: .default
)
```

For an Offer API campaign, use the retained token and app ID:

```swift
try await PlaytimeStudio.executeOfferImpression(token: offer.token, appID: offer.appID)
```

When the user opens your custom details screen, report the additional engaged impression:

```swift
try await PlaytimeStudio.executeCampaignImpression(
    campaign: campaign,
    impressionType: .engaged
)
```

Build cards and details from [SDK Models](../sdk-models.md) and the
[iOS component recipes](build-components-ios.md). Do not construct campaign objects yourself.

## Open a Campaign in the Store

Call `openInStore` only after recording a qualifying view: `.default` through
`executeCampaignImpression` for an SDK campaign, or `executeOfferImpression` with the retained
token and app ID for an Offer API campaign. An `.engaged` impression does not satisfy this
prerequisite, and `openInStore` can fail without the qualifying view.

> **Warning: Record a view before openInStore**
>
> Require full card visibility before enabling the store action. Opening your custom details screen does not replace this requirement.

```swift
try await PlaytimeStudio.openInStore(
    campaign: campaign,
    useInlineInstall: true
)
```

`useInlineInstall: true` requests the in-app App Store sheet. Pass `false` to open the
external App Store app.

## Get Installed Campaigns

Use installed campaign models to build an "In Progress" section.

```swift
let response = try await PlaytimeStudio.getInstalledCampaigns(
    options: InstalledCampaignOptions(category: .gaming)
)
let installedCampaigns = response.campaigns
```

Use [SDK Models](../sdk-models.md) to render installation status, completion, collected rewards,
expiration, and milestone progress. Refresh after returning from the store and whenever the view
regains focus.

### InstalledCampaignOptions

| Parameter  | Type          | Required | Default   | Description                                                                                                          |
| ---------- | ------------- | -------- | --------- | -------------------------------------------------------------------------------------------------------------------- |
| `category` | `AppCategory` | No       | `.gaming` | If omitted, the SDK uses the gaming category. Specify `.nonGaming` or `.both` to request another category selection. |

## Open an Installed Campaign

Reopen an installed app so the user can continue earning rewards:

```swift
try await PlaytimeStudio.openInstalledCampaign(campaign: installedCampaign)
```

## Open Chatbot (Optional)

Open the adjoe chatbot for support related to a campaign.

```swift
try await PlaytimeStudio.openChatbot(campaign: campaign)
```

## Check Status and Handle Errors

Use `getStatus` before SDK campaign retrieval and whenever the UI needs to explain campaign
availability.

```swift
do {
    let status = try await Playtime.getStatus()

    if status.isInitialized && status.details.campaignsAvailable {
        // Campaigns can be requested and displayed.
    } else {
        // campaignsState is a list; it can hold more than one reason.
        let states = status.details.campaignsState
        if states.contains(.blocked) || states.contains(.vpnDetected) || states.contains(.geoMismatch) {
            // Show an appropriate unavailable state.
        }
    }
} catch let error as PlaytimeException {
    // Handle the typed SDK error.
} catch {
    // Handle any other error.
}
```

| Campaign state | Meaning                                              |
| -------------- | ---------------------------------------------------- |
| `.ready`       | Campaigns are available                              |
| `.blocked`     | The user cannot receive campaigns                    |
| `.vpnDetected` | Campaigns are unavailable while a VPN is detected    |
| `.geoMismatch` | The user's location does not match the target region |

## Teardown (Optional)

Call teardown when the user logs out or Playtime is no longer needed.

```swift
try await Playtime.teardown()
```

After teardown, `initPlaytime` must complete again before any other SDK method is used.

## Set Up Server-to-Server Payouts

Finally, set up [Server-to-Server (S2S) payouts](https://test-docs.adjoe.zone/rewarded-solutions/setting-up-rewarding/server-to-server-payouts) so your backend can receive payout callbacks and distribute rewards to users.

See [Best Practices](../../best-practices.md) for campaign refreshing, performance,
and viewport tracking guidance.
