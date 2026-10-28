# Quick-Start Custom UI

> Quick-Start Custom UI combines your Unity campaign placements with adjoe-managed campaign,
> offer, and installed-campaign views. The v5 methods are asynchronous and report through
> `onSuccess` and `onError` callbacks that run on the Unity main thread.

> **Danger: Premium Feature**
>
> Playtime Studio is a premium feature available by agreement with your adjoe Account Manager.
> Contact your AM to enable Studio and obtain separate Android and iOS SDK hashes.

Add the Studio namespace alongside the core namespace:

```csharp
using io.adjoe.sdk;
using io.adjoe.sdk.studio;
```

## Initialize the SDK

Complete [Unity setup](../../getting-started-unity.md), then initialize with the SDK hash
for the current platform. Never use the Android hash in an iOS build or the iOS hash in an
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

```csharp
InitOptions options = new InitOptions()
    .SetSdkHash("YOUR_PLATFORM_SDK_HASH")
    .SetUserId("user_123");

Playtime.InitPlaytime(
    options,
    () => Debug.Log("Playtime initialized."),
    error => Debug.Log(error.Message));
```

### InitOptions parameters

Build `InitOptions` with the fluent setters. Only `SetSdkHash` is required for the first
initialization.

| Setter              | Type                  | Required | Description                                                                                                                                                                                                                                                                      |
| ------------------- | --------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SetSdkHash`        | `string`              | Yes      | SDK hash from the adjoe dashboard. It must match this app's package name or bundle ID.                                                                                                                                                                                           |
| `SetUserId`         | `string`              | No       | Stable, persistent, non-PII identifier used for reward attribution. It is not required for the first initialization, but initialize again with it before TOS consent or requesting campaigns, and before displaying the Catalog. Generate and persist an ID for anonymous users. |
| `SetUserProfile`    | `PlaytimeUserProfile` | No       | Optional targeting information. See the nested fields below.                                                                                                                                                                                                                     |
| `SetExtensions`     | `PlaytimeExtensions`  | No       | Publisher sub-IDs returned in S2S payout callbacks. See the nested fields below.                                                                                                                                                                                                 |
| `SetLanguage`       | `string`              | No       | ISO 639-1 language code that overrides the device language for SDK content. When unset, the device locale language is applied.                                                                                                                                                   |
| `SetUaNetwork`      | `string`              | No       | User-acquisition network. The backend accepts the first non-null value for this user and does not allow it to be cleared or replaced.                                                                                                                                            |
| `SetUaChannel`      | `string`              | No       | User-acquisition channel, such as `video` or `offerwall`. It has the same first-non-null persistence rule.                                                                                                                                                                       |
| `SetUaCampaignName` | `string`              | No       | User-acquisition campaign name. This replaces v4 `uaSubPublisherEncrypted`; it is sent using that backend field and has the same first-non-null persistence rule.                                                                                                                |

### PlaytimeUserProfile fields

| Setter        | Type             | Required | Description                                                                                 |
| ------------- | ---------------- | -------- | ------------------------------------------------------------------------------------------- |
| `SetGender`   | `PlaytimeGender` | No       | `PlaytimeGender.MALE`, `PlaytimeGender.FEMALE`, or `PlaytimeGender.UNKNOWN`.                |
| `SetBirthday` | `string`         | No       | Birthday used for targeting. Accepts a calendar date (`2002-12-02`) or an ISO 8601 instant. |

### PlaytimeExtensions fields

| Setter                          | Type     | Required | Description                                                 |
| ------------------------------- | -------- | -------- | ----------------------------------------------------------- |
| `SetSubId1` through `SetSubId5` | `string` | No       | Optional publisher values returned in S2S payout callbacks. |

Keep string values URL-safe and do not put PII in user IDs, UA fields, or sub-IDs.

## Manage TOS Consent

Before using Studio, incorporate adjoe's Terms of Service into your own terms and ask the user
to accept those terms through explicit input. Never infer consent or submit acceptance
automatically. Campaigns remain unavailable until you report the user's acceptance with
`updateTosConsent`. If the user later withdraws consent, report the withdrawal with the same
method.

```csharp
PlaytimeStudio.UpdateTosConsent(
    TosConsentAction.ACCEPT,
    () => Debug.Log("Consent accepted."),
    error => Debug.Log(error.Message));

// If the user later withdraws consent:
PlaytimeStudio.UpdateTosConsent(
    TosConsentAction.WITHDRAW,
    () => Debug.Log("Consent withdrawn."),
    error => Debug.Log(error.Message));
```

## Request Usage Permission (Android Only)

Android usage access enables time-based campaigns and play-duration measurement. Request it
after clear user intent and guard the Android-only API. iOS has no usage-access prompt and
does not support Android time-based rewards.

```csharp
#if UNITY_ANDROID
Playtime.GetStatus(
    status =>
    {
        if (status.IsUsagePermissionAccepted != true)
        {
            PlaytimeStudio.ShowPermissionsPrompt(
                () => Debug.Log("Prompt shown."),
                error => Debug.Log(error.Message));
        }
    },
    error => Debug.Log(error.Message));
#endif
```

Users without usage access can still receive other eligible campaign and reward types.

## Get SDK Campaigns or Offer API Campaigns

Build campaign cards from [SDK Models](sdk-models.md). For a full publisher-built
experience, see the [Advanced Custom UI Visual Guide](custom-ui/visual-guide.md). Preserve
the returned order and pass unmodified campaign objects to later SDK calls.

### SDK Campaigns

Check availability, then fetch campaigns for your placement. Preserve the returned order.

```csharp
CampaignOptions options = new CampaignOptions()
    .SetPlacement(StudioPlacement.Navbar)
    .SetCategory(AppCategory.GAMING);

PlaytimeStudio.GetCampaigns(
    options,
    response =>
    {
        PlaytimeCampaign[] campaigns = response.Campaigns;
    },
    error => Debug.Log(error.Message));
```

### Offer API Campaigns

Select offers on your backend, then enrich their tokens with SDK models. Keep each Offer API
token and app ID associated with its enriched campaign model. Keep Offer API credentials and
server-side API tokens out of the app. An SDK campaign-availability check is not required for
this route because the Offer API handles eligibility.

```csharp
PlaytimeStudio.GetOfferDetails(
    new[] { "token_from_offer_api" },
    options,
    response =>
    {
        PlaytimeCampaign[] campaigns = response.Campaigns;
    },
    error => Debug.Log(error.Message));
```

See [Offer API](offer-api.md) for the server-side request and token flow.

### CampaignOptions

Build `CampaignOptions` with the fluent setters. All fields are optional.

| Setter             | Type              | Default              | Description                                                                                                              |
| ------------------ | ----------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `SetPlacement`     | `StudioPlacement` | unset                | Where campaigns are displayed. Use a predefined `StudioPlacement` value or `StudioPlacement.Custom`.                     |
| `SetCategory`      | `AppCategory`     | `AppCategory.GAMING` | If omitted, the SDK uses the gaming category. Pass `AppCategory.NON_GAMING` or `AppCategory.BOTH` for another selection. |
| `SetDisplayFormat` | `DisplayFormat`   | unset                | How campaigns are visually presented through your custom UI. Use a predefined value or `DisplayFormat.Custom`.           |
| `SetPromotionTag`  | `string`          | unset                | Tag used to filter campaigns by promotion.                                                                               |

See [StudioPlacement, DisplayFormat, and AppCategory](../api-reference.md#option-values) for every predefined value. Any other value passed through `Custom` is treated as custom.

## Track the Qualifying Default View

After retrieval, report a default impression when the entire campaign card is visible in the
viewport. The SDK handles deduplication. This view qualifies the later store interaction.

For a campaign selected by the SDK and returned by `GetCampaigns`:

```csharp
PlaytimeStudio.ExecuteCampaignImpression(
    campaign,
    PlaytimeImpressionType.DEFAULT,
    () => Debug.Log("Impression recorded."),
    error => Debug.Log(error.Message));
```

For a campaign selected by the Offer API, including one enriched by `GetOfferDetails`:

```csharp
PlaytimeStudio.ExecuteOfferImpression(
    "token_from_offer_api",
    "app_id_from_offer_api",
    () => Debug.Log("Impression recorded."),
    error => Debug.Log(error.Message));
```

## Open Managed Campaign or Offer Details

Open adjoe's managed details when the user selects a visible card:

```csharp
// Campaign selected by the SDK:
PlaytimeStudio.ShowCampaignDetails(
    campaign,
    () => Debug.Log("Details shown."),
    error => Debug.Log(error.Message));

// Retained identifiers for a campaign selected by the Offer API:
PlaytimeStudio.ShowOfferDetails(
    "token_from_offer_api",
    "app_id_from_offer_api",
    () => Debug.Log("Details shown."),
    error => Debug.Log(error.Message));
```

These managed details flows report the engaged impression automatically. Do not send a
manual engaged impression when opening them.

## Get Installed Campaigns and Open the Managed View

Fetch installed campaigns to render a compact in-progress placement. Refresh after the app
returns from the store and whenever the view regains focus so reward progress is current.

```csharp
InstalledCampaignOptions installedOptions = new InstalledCampaignOptions()
    .SetCategory(AppCategory.GAMING);

PlaytimeStudio.GetInstalledCampaigns(
    installedOptions,
    response =>
    {
        PlaytimeCampaign[] installedCampaigns = response.Campaigns;
    },
    error => Debug.Log(error.Message));

PlaytimeStudio.ShowInstalledCampaigns(
    () => Debug.Log("Installed view shown."),
    error => Debug.Log(error.Message));
```

Use [SDK Models](sdk-models.md) for installed status, completed rewards, reward totals,
expiration, and milestone fields. The managed installed-campaign view handles the full
progress experience.

### InstalledCampaignOptions

| Setter        | Type          | Default              | Description                                                                                                              |
| ------------- | ------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `SetCategory` | `AppCategory` | `AppCategory.GAMING` | If omitted, the SDK uses the gaming category. Pass `AppCategory.NON_GAMING` or `AppCategory.BOTH` for another selection. |

## Open Chatbot (Optional)

Open support for a campaign, or omit the campaign for general support:

```csharp
PlaytimeStudio.OpenChatbot(
    campaign,
    () => Debug.Log("Chatbot opened."),
    error => Debug.Log(error.Message));

PlaytimeStudio.OpenChatbot(
    () => Debug.Log("Chatbot opened."),
    error => Debug.Log(error.Message));
```

## Check Status and Handle Errors

Use `Details.CampaignsAvailable` as the primary signal for whether to show SDK campaigns.

```csharp
Playtime.GetStatus(
    status =>
    {
        if (status.IsInitialized && status.Details.CampaignsAvailable)
        {
            // Campaigns can be shown.
        }
    },
    error => Debug.Log(error.Message));
```

`PlaytimeStatus` describes the SDK state and whether campaigns are available for the user.

| Property                     | Type                       | Description                                            |
| ---------------------------- | -------------------------- | ------------------------------------------------------ |
| `Version`                    | `string`                   | SDK version string.                                    |
| `IsInitialized`              | `bool`                     | Whether `InitPlaytime` completed successfully.         |
| `UserId`                     | `string`                   | User ID passed in `InitOptions`.                       |
| `IsTosAccepted`              | `bool`                     | Whether the user accepted the Terms of Service.        |
| `IsUsagePermissionAccepted`  | `bool?`                    | Android usage-access state. It is `null` on iOS.       |
| `Details.IsFraud`            | `bool`                     | Whether the user is flagged as potentially fraudulent. |
| `Details.CampaignsAvailable` | `bool`                     | Primary signal for whether to show campaigns.          |
| `Details.CampaignsState`     | `PlaytimeCampaignsState[]` | Reasons campaigns are unavailable.                     |
| `Details.TestGroup`          | `int?`                     | A/B test group identifier.                             |

Check campaign states against the `PlaytimeCampaignsState` enum values:

```csharp
Array.IndexOf(status.Details.CampaignsState, PlaytimeCampaignsState.VPN_DETECTED) >= 0;
```

The available values are `READY`, `BLOCKED`, `VPN_DETECTED`, `GEO_MISMATCH`, and
`NOT_INITIALIZED`.

> **Note: Test users**
>
> Test users can still get campaigns from `GetCampaigns()` while `CampaignsAvailable` is `false`, for example in a blocked or mismatched country. This happens only for test users. For real users, `CampaignsAvailable` is reliable.

> **Warning**
>
> The `IsFraud` flag is informational. Do not hide campaigns based on it; the SDK manages the
> experience for flagged users.

Every method reports failures through its `onError` callback with a structured
`PlaytimeException`. Use `IsRetryable` to decide whether to retry and retain the
categorized error for diagnostics.

```csharp
PlaytimeStudio.GetCampaigns(
    options,
    response => { /* ... */ },
    error => Debug.Log($"{error.ErrorType} {error.Code} {error.IsRetryable} {error.Message}"));
```

Every SDK method reports failures through the `onError` callback with a `PlaytimeException`:

| Member        | Type                | Description                                  |
| ------------- | ------------------- | -------------------------------------------- |
| `Code`        | `string`            | Native error identifier when available.      |
| `ErrorType`   | `PlaytimeErrorType` | Categorized error type.                      |
| `IsRetryable` | `bool`              | Whether the operation can be safely retried. |
| `Message`     | `string`            | Human-readable error description.            |

`PlaytimeErrorType` is an enum with the values `NETWORK`, `NETWORK_VPN`, `API`,
`RESPONSE_FORMAT`, `SDK_CONFIG`, and `UNKNOWN`.

```csharp
void OnError(PlaytimeException error)
{
    // Retry only when error.IsRetryable is true.
    Debug.Log($"{error.ErrorType} {error.Code} {error.Message}");
}
```

## Teardown

```csharp
Playtime.Teardown(
    () => Debug.Log("Teardown complete."),
    error => Debug.Log(error.Message));
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
