# Quick-Start Custom UI

> Quick-Start Custom UI lets you embed native campaign placements while adjoe handles the detail screen, install flow, and reward tracking. Fetch campaigns, show them in your UI, and open adjoe's managed views when users tap.

> **Danger: Premium Feature**
>
> Playtime Studio is a premium feature available by agreement with your adjoe Account Manager.
> Contact your AM to enable Studio and obtain your Android SDK hash.

### Why Quick-Start Custom UI?

Campaigns are ranked by **eCPM**, so the highest-earning games appear first. Publishers who embed campaign cards alongside an Installed Games section see higher engagement and retention — users interact with games directly in your app's UI rather than switching to a separate offerwall.

    ![Game shelf without promotion](/img/playtime-studio/integration/game-shelf-no-promotion.png)

      Campaign Cards

    ![Campaign detail view managed by adjoe](/img/playtime-studio/integration/detail-view-hero.png)

      Detail View (managed by adjoe)

    ![Installed apps section](/img/playtime-studio/integration/installed-app-completed.png)

      Installed Games

---

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

```kotlin
import io.adjoe.sdk.Playtime
import io.adjoe.sdk.InitOptions
import io.adjoe.sdk.PlaytimeInitListener
import io.adjoe.sdk.PlaytimeException

Playtime.initPlaytime(
    InitOptions(sdkHash = "YOUR_SDK_HASH", userId = "user_123"),
    object : PlaytimeInitListener {
        override fun onSuccess() { /* SDK ready */ }
        override fun onError(e: PlaytimeException) { /* handle */ }
    }
)
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

```kotlin
PlaytimeStudio.updateTosConsent(TosConsentAction.ACCEPT, object : PlaytimeTosListener {
    override fun onUpdated() { /* consent accepted */ }
    override fun onError(e: PlaytimeException) { /* handle */ }
})

// Call this if the user later withdraws consent.
PlaytimeStudio.updateTosConsent(TosConsentAction.WITHDRAW, tosListener)
```

## Request Android Usage Permission

Android usage access enables time-based campaigns and play-duration measurement. Request it
after explaining the benefit and in response to clear user intent. Users without usage access
can still receive eligible non-time-based campaigns.

```kotlin
if (!Playtime.getStatus().isUsagePermissionAccepted) {
    PlaytimeStudio.showPermissionsPrompt(activity, object : PlaytimePermissionsListener {
        override fun onReceived() { /* prompt result received */ }
        override fun onError(e: PlaytimeException) { /* handle */ }
    })
}
```

## Get SDK Campaigns or Offer API Campaigns

Build campaign cards from [SDK Models](sdk-models.md). For a full publisher-built experience,
see the [Advanced Custom UI Visual Guide](custom-ui/visual-guide.md). Preserve the returned
order and pass unmodified campaign objects to later SDK calls.

Fetch campaigns, render them as cards, report the default impression when visible, and open
the managed detail view on tap.

**Option A: Get Campaigns with the SDK**

Check status first, then fetch campaigns:

```kotlin
val status = Playtime.getStatus()
if (status.details.campaignsAvailable) {
    val options = CampaignOptions(
        placement = StudioPlacement.Navbar,
        category = AppCategory.GAMING
    )

    PlaytimeStudio.getCampaigns(options, object : PlaytimeCampaignsListener {
        override fun onReceived(response: PlaytimeCampaignsResponse) {
            val campaigns = response.campaigns
            // Render the campaigns in this order.
        }

        override fun onError(exception: PlaytimeException) { /* handle error */ }
    })
}
```

When your viewport observer reports that the entire card is visible, invoke the tracking
callback once per campaign. Composition or `LaunchedEffect` alone does not establish viewport
coverage.

```kotlin
fun onCampaignFullyVisible(campaign: PlaytimeCampaign) {
    PlaytimeStudio.executeCampaignImpression(
        campaign,
        PlaytimeImpressionType.DEFAULT,
        object : PlaytimeExecuteImpressionListener {
            override fun onFinished() { /* tracked */ }
            override fun onAlreadyEngaging() { /* an impression for this item is already in progress */ }
            override fun onError(exception: PlaytimeException) { /* handle error */ }
        }
    )
}
```

Open the managed campaign details when the user taps the card:

```kotlin
PlaytimeStudio.showCampaignDetails(activity, campaign, object : PlaytimeDeeplinkListener {
    override fun onOpened() { /* opened */ }
    override fun onError(exception: PlaytimeException) { /* handle error */ }
})
```

**Option B: Get Campaigns with the Offer API**

Fetch campaigns from the Offer API on your backend. You can build cards directly from its
response or call `getOfferDetails` to enrich them with SDK model data. In both cases, retain each
offer's token and app ID and use the offer-specific tracking and managed-detail methods. Keep
Offer API credentials on your server. An SDK status check is not needed for this route because
the Offer API handles eligibility.

**Integration Steps:**

1. Fetch campaigns from the Offer API on your backend
2. Retain `Token` and `AppID` while optionally enriching cards with `getOfferDetails`
3. Call `executeOfferImpression(token, appID)` when the entire card is visible in the viewport
4. Call `showOfferDetails(token, appID)` when a user taps a card

```kotlin
// Model from your backend's Offer API response
data class OfferAPIItem(
    val appID: String,
    val appName: String,
    val coins: Int,
    val iconURL: String,
    val token: String
)

data class EnrichedOffer(
    val offer: OfferAPIItem,
    val campaign: PlaytimeCampaign
)

fun enrichOffers(offers: List<OfferAPIItem>, campaignOptions: CampaignOptions) {
    val offersByToken = offers.associateBy(OfferAPIItem::token)

    PlaytimeStudio.getOfferDetails(
        offers.map(OfferAPIItem::token),
        campaignOptions,
        object : PlaytimeCampaignsListener {
            override fun onReceived(response: PlaytimeCampaignsResponse) {
                val enrichedOffers = response.campaigns.mapNotNull { campaign ->
                    offersByToken[campaign.token]?.let { offer -> EnrichedOffer(offer, campaign) }
                }
                // Render SDK fields from campaign, but retain offer.token and offer.appID.
            }

            override fun onError(exception: PlaytimeException) { /* handle error */ }
        }
    )
}
```

The callbacks below are conceptual: connect them to a threshold-aware viewport observer. Do not
invoke the impression merely because a composable entered composition.

```kotlin
fun onOfferFullyVisible(offer: OfferAPIItem) {
    PlaytimeStudio.executeOfferImpression(
        offer.token,
        offer.appID,
        object : PlaytimeExecuteImpressionListener {
            override fun onFinished() { /* tracked */ }
            override fun onAlreadyEngaging() { /* an impression for this item is already in progress */ }
            override fun onError(exception: PlaytimeException) { /* handle error */ }
        }
    )
}

fun onOfferTapped(activity: android.app.Activity, offer: OfferAPIItem) {
    PlaytimeStudio.showOfferDetails(
        activity,
        offer.token,
        offer.appID,
        object : PlaytimeDeeplinkListener {
            override fun onOpened() { /* opened */ }
            override fun onError(exception: PlaytimeException) { /* handle error */ }
        }
    )
}
```

→ See the [Offer API](offer-api.md) page for REST API details.

The `DEFAULT` campaign impression, or `executeOfferImpression` for an Offer API card, must run
after retrieval when the entire card is visible in the viewport. The SDK handles deduplication.

`showCampaignDetails` and `showOfferDetails` open managed details and report the `ENGAGED`
impression automatically. Do not report a manual engaged impression for these flows.

### Promotions

    ![Game shelf without promotion](/img/playtime-studio/integration/game-shelf-no-promotion.png)

      Without promotion

    ![Game shelf with promotion showing strikethrough](/img/playtime-studio/integration/game-shelf-with-promotion.png)

      With promotion (strikethrough rewards)

When a promotion is active, compare the reward totals to show the original amount with a
strikethrough. Promotion metadata belongs to `campaign.promotion`:

- `campaign.eventConfig?.totalCoinsPossible` — Boosted reward amount (already multiplied)
- `campaign.eventConfig?.totalOriginalCoinsPossible` — Original amount (show with strikethrough)
- `campaign.promotion?.boostFactor` — Multiplier (e.g., 2 = double rewards)
- `campaign.promotion?.endTime` — Promotion end timestamp

### Fields Reference

| Field                                    | Type      | Usage                                                   |
| ---------------------------------------- | --------- | ------------------------------------------------------- |
| `iconImage`                              | `String?` | App icon URL                                            |
| `appName`                                | `String`  | Game name                                               |
| `eventConfig.totalCoinsPossible`         | `Int?`    | Maximum reward (includes promotions)                    |
| `eventConfig.totalOriginalCoinsPossible` | `Int?`    | Original reward (show with strikethrough when promoted) |
| `promotion.boostFactor`                  | `Float?`  | Promotion multiplier                                    |
| `promotion.endTime`                      | `String?` | Promotion end timestamp (ISO 8601)                      |

### CampaignOptions and InstalledCampaignOptions

| Parameter       | Type               | Required | Default              | Description                                                                                                         |
| --------------- | ------------------ | -------- | -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `placement`     | `StudioPlacement`  | No       | `null`               | Where campaigns are displayed. Use a predefined value or `.Custom("value")`.                                        |
| `category`      | `AppCategory`      | No       | `AppCategory.GAMING` | If omitted, the SDK uses the gaming category. Specify `NON_GAMING` or `BOTH` to request another category selection. |
| `displayFormat` | `DisplayFormat`    | No       | `null`               | How campaigns are visually presented through your custom UI. Use a predefined value or `.Custom("value")`.          |
| `promotionTag`  | `String`           | No       | `null`               | Tag for user-level promotions. See [User Level Promos](https://test-docs.adjoe.zone/rewarded-solutions/sdks/studio/resources/user-level-promos).                          |
| `metadata`      | `PlaytimeMetadata` | No       | `null`               | Two optional free-form strings, `metadata1` and `metadata2`, that the SDK sends to adjoe with the campaign request. |

See [StudioPlacement, DisplayFormat, and AppCategory](../api-reference.md#option-values) for every predefined value and custom-value syntax. `PlaytimeMetadata` contains optional `metadata1` and `metadata2` strings returned in S2S payouts.

## Open Installed Games

Open adjoe's managed installed-campaigns view so users can see active games, progress, and
rewards.

Call `showInstalledCampaigns()` from your "My Games" or installed-games entry point.

    ![Installed apps section](/img/playtime-studio/integration/installed-app-completed.png)

```kotlin
PlaytimeStudio.showInstalledCampaigns(activity, object : PlaytimeDeeplinkListener {
    override fun onOpened() { /* opened */ }
    override fun onError(exception: PlaytimeException) { /* handle error */ }
})
```

The managed view owns installed-campaign rendering and opening. If you additionally need a
compact count or preview in your placement, `getInstalledCampaigns` is available; use
`eventConfig.totalCoinsCollected` and `eventConfig.totalCoinsPossible` for totals, refresh on
resume, and still route the main installed-games action to `showInstalledCampaigns`.

### InstalledCampaignOptions

| Parameter  | Type          | Required | Default              | Description                                                                                                         |
| ---------- | ------------- | -------- | -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `category` | `AppCategory` | No       | `AppCategory.GAMING` | If omitted, the SDK uses the gaming category. Specify `NON_GAMING` or `BOTH` to request another category selection. |

## Open Chatbot (Optional)

Open support for a campaign, or pass `null` for general support.

```kotlin
PlaytimeStudio.openChatbot(activity, campaign, object : PlaytimeDeeplinkListener {
    override fun onOpened() { }
    override fun onError(e: PlaytimeException) { }
})

PlaytimeStudio.openChatbot(activity, null, chatbotListener)
```

## Check Status and Handle Errors

Use SDK status as the source of truth for initialization, consent, usage permission, and SDK
campaign availability. Offer API eligibility is handled by the API. `isFraud` is
informational; do not hide campaigns based on it.

```kotlin
val status = Playtime.getStatus()

if (status.isInitialized && status.isTosAccepted && status.details.campaignsAvailable) {
    // SDK campaigns can be fetched and shown.
} else {
    // Inspect status.details.campaignsState for the reason.
}
```

`campaignsState` can contain `READY`, `BLOCKED`, `VPN_DETECTED`, `GEO_MISMATCH`, and
`NOT_INITIALIZED`. Every failure callback receives a `PlaytimeException`; log its `code`,
`errorType`, `isRetryable`, and `message`, and retry only when `isRetryable` is true. Error
types are `NETWORK`, `NETWORK_VPN`, `API`, `RESPONSE_FORMAT`, `SDK_CONFIG`, and `UNKNOWN`.

## Teardown

```kotlin
Playtime.teardown(object : PlaytimeTeardownListener {
    override fun onSuccess() {
        // The SDK is deinitialized.
    }

    override fun onError(error: PlaytimeException) {
        // Handle teardown failure.
    }
})
```

Call when the user logs out or Playtime is no longer needed. After teardown, initialize again,
wait for success, and fetch fresh campaigns before using another SDK method. Do not reuse stale
campaign objects.

## Set Up Server-to-Server Payouts

Finally, set up [Server-to-Server (S2S) payouts](https://test-docs.adjoe.zone/rewarded-solutions/setting-up-rewarding/server-to-server-payouts) so your backend can receive payout callbacks and distribute rewards to users.
