# Quick-Start Custom UI

> Quick-Start Custom UI lets you render native campaign placements while adjoe handles campaign
> details and the installed-campaigns view. Campaigns are ranked by eCPM; preserve the order
> returned by the SDK or Offer API.

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

do {
    try await Playtime.initPlaytime(
        options: InitOptions(
            sdkHash: "YOUR_SDK_HASH",
            userId: "user_123"
        )
    )
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

## Fetch SDK Campaigns

Build campaign cards from [SDK Models](sdk-models.md). For a full publisher-built experience,
see the [Advanced Custom UI Visual Guide](custom-ui/visual-guide.md). Preserve the returned
order and pass unmodified campaign objects to later SDK calls.

Check SDK status, fetch campaigns, and configure the default impression immediately after
retrieval. Send it when the entire card is visible in the viewport; the SDK handles deduplication.

```swift
let status = try await Playtime.getStatus()
guard status.details.campaignsAvailable else {
    // Use campaignsState to decide which unavailable state to show.
    return
}

let response = try await PlaytimeStudio.getCampaigns(
    campaignOptions: CampaignOptions(
        placement: .navbar,
        category: .gaming,
        displayFormat: .carousel
    )
)
let campaigns = response.campaigns

// Call this only after geometry measurement shows 100% visibility.
guard let campaign = campaigns.first else { return }
try await PlaytimeStudio.executeCampaignImpression(
    campaign: campaign,
    impressionType: .default
)
```

Measure each card and the scroll-view viewport with `GeometryReader`, calculate their
intersection area, and send the impression only after the entire card is visible.

### Render SDK campaign cards

> **Note**
>
> The SwiftUI samples on this page use `AsyncImage` (iOS 15) and `foregroundStyle` (iOS 17),
> while the SDK supports iOS 14. For older deployment targets, use your own image loader and
> `foregroundColor`.

```swift
import SwiftUI

struct GameCardView: View {
    let campaign: PlaytimeCampaign

    private var hasPromotion: Bool {
        guard let total = campaign.eventConfig?.totalCoinsPossible,
              let original = campaign.eventConfig?.totalOriginalCoinsPossible else {
            return false
        }
        return total > original
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            AsyncImage(url: URL(string: campaign.iconImage ?? "")) { image in
                image.resizable().aspectRatio(contentMode: .fill)
            } placeholder: {
                Color.gray.opacity(0.3)
            }
            .frame(width: 160, height: 160)
            .clipShape(RoundedRectangle(cornerRadius: 16))

            if let total = campaign.eventConfig?.totalCoinsPossible {
                HStack(spacing: 4) {
                    if hasPromotion,
                       let original = campaign.eventConfig?.totalOriginalCoinsPossible {
                        Text("\(original)").strikethrough().foregroundStyle(.secondary)
                    }
                    Text("Up to \(total) Points")
                }
                .font(.caption)
            }

            Text(campaign.appName)
                .font(.subheadline)
                .fontWeight(.semibold)
                .lineLimit(2)
        }
        .frame(width: 160)
        .onTapGesture {
            Task {
                try? await PlaytimeStudio.showCampaignDetails(campaign: campaign)
            }
        }
    }
}
```

`showCampaignDetails` opens the managed details flow and sends the engaged impression
automatically. Do not send a duplicate engaged impression.

### CampaignOptions and InstalledCampaignOptions

| Parameter       | Type               | Required | Default   | Description                                                                                                          |
| --------------- | ------------------ | -------- | --------- | -------------------------------------------------------------------------------------------------------------------- |
| `placement`     | `StudioPlacement`  | No       | `nil`     | Where campaigns are displayed. Use a predefined value or `.custom("value")`.                                         |
| `category`      | `AppCategory`      | No       | `.gaming` | If omitted, the SDK uses the gaming category. Specify `.nonGaming` or `.both` to request another category selection. |
| `displayFormat` | `DisplayFormat`    | No       | `nil`     | How campaigns are visually presented through your custom UI. Use a predefined value or `.custom("value")`.           |
| `promotionTag`  | `String`           | No       | `nil`     | Tag for user-level promotions. See [User Level Promos](https://test-docs.adjoe.zone/rewarded-solutions/sdks/studio/resources/user-level-promos).                           |
| `metadata`      | `PlaytimeMetadata` | No       | `nil`     | Two optional free-form strings, `metadata1` and `metadata2`, that the SDK sends to adjoe with the campaign request.  |

See [StudioPlacement, DisplayFormat, and AppCategory](../api-reference.md#option-values) for every predefined value and custom-value syntax. `PlaytimeMetadata` contains optional `metadata1` and `metadata2` strings returned in S2S payouts.

## Fetch Offer API Campaigns

Fetch and rank campaigns on your backend. Retain each offer's token and app ID when enriching
it with `getOfferDetails`; those identifiers are required for both the qualifying impression
and managed details flow. An SDK status check is not required for this retrieval path because
the API handles eligibility.

```swift
import SwiftUI

// Model decoded from your backend's Offer API response.
struct OfferAPIItem: Identifiable {
    let id = UUID()
    let appID: String
    let appName: String
    let coins: Int
    let iconURL: String
    let token: String
}

struct EnrichedOffer: Identifiable {
    let offer: OfferAPIItem
    let campaign: PlaytimeCampaign

    var id: UUID { offer.id }
}

let offers: [OfferAPIItem] = fetchRankedOffersFromBackend()
let response = try await PlaytimeStudio.getOfferDetails(
    tokens: offers.map { $0.token },
    campaignOptions: CampaignOptions(
        placement: .navbar,
        displayFormat: .carousel
    )
)
// Match by token: the response can omit or reorder offers.
let offersByToken = Dictionary(offers.map { ($0.token, $0) }, uniquingKeysWith: { first, _ in first })
let enrichedOffers = response.campaigns.compactMap { campaign in
    offersByToken[campaign.token].map { offer in
        EnrichedOffer(offer: offer, campaign: campaign)
    }
}

struct OfferCardView: View {
    let item: EnrichedOffer

    private var offer: OfferAPIItem { item.offer }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            AsyncImage(url: URL(string: item.campaign.iconImage ?? offer.iconURL)) { image in
                image.resizable().aspectRatio(contentMode: .fill)
            } placeholder: {
                Color.gray.opacity(0.3)
            }
            .frame(width: 160, height: 160)
            .clipShape(RoundedRectangle(cornerRadius: 16))

            if let total = item.campaign.eventConfig?.totalCoinsPossible {
                Text("Up to \(total) Points")
                    .font(.caption)
                    .fontWeight(.medium)
            }

            Text(item.campaign.appName)
                .font(.subheadline)
                .fontWeight(.semibold)
                .lineLimit(2)
        }
        .frame(width: 160)
        .onTapGesture {
            Task {
                try? await PlaytimeStudio.showOfferDetails(
                    token: offer.token,
                    appID: offer.appID
                )
            }
        }
    }
}
```

Use the containing scroll view's geometry to require full card visibility. At that threshold, call
`executeOfferImpression(token: offer.token, appID: offer.appID)` once. Do not substitute
`executeCampaignImpression` merely because `item.campaign` contains enriched display data.

`showOfferDetails` sends the engaged impression automatically. Do not send a duplicate
engaged impression. See the [Offer API](offer-api.md) for request and response details.

## Show Installed Campaigns

Fetch installed campaigns when you need their SDK models for an indicator, count, or preview.
Open adjoe's managed installed-campaigns view when users want to return to active games and
review their reward progress.

```swift
import SwiftUI

let response = try await PlaytimeStudio.getInstalledCampaigns(
    options: InstalledCampaignOptions(category: .gaming)
)
let installedCampaigns = response.campaigns

Button("My Games") {
    Task {
        try? await PlaytimeStudio.showInstalledCampaigns()
    }
}
```

Common installed-campaign fields are `status`, `appName`, `iconImage`, `isCompleted`,
`eventConfig.totalCoinsCollected`, `eventConfig.totalCoinsPossible`, and
`rewardingExpiresAt`. The managed view handles installed-campaign rendering and opening the
installed apps.

### InstalledCampaignOptions

| Parameter  | Type          | Required | Default   | Description                                                                                                          |
| ---------- | ------------- | -------- | --------- | -------------------------------------------------------------------------------------------------------------------- |
| `category` | `AppCategory` | No       | `.gaming` | If omitted, the SDK uses the gaming category. Specify `.nonGaming` or `.both` to request another category selection. |

## Open Chatbot (Optional)

Open the adjoe chatbot for support related to a campaign.

```swift
try await PlaytimeStudio.openChatbot(campaign: campaign)
```

## Handle Status and Errors

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
