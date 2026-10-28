# Use the SDK

> This guide covers the SDK operations for an Advanced Custom UI integration: initialize
> Playtime, fetch campaigns, track impressions, and open new or installed campaigns. The Unity
> v5 methods use `onSuccess` and `onError` callbacks; handle both. To turn the returned models
> into UI, continue with [Build the Components](build-components-unity.md).

> **Danger: Premium Feature**
>
> Playtime Studio is a premium feature available by agreement with your adjoe Account Manager.
> Contact your AM to enable Studio and obtain separate Android and iOS SDK hashes.

## Initialize the SDK

Complete [Unity setup](../../../getting-started-unity.md), then initialize with the SDK hash
for the current platform. Never use the Android hash in an iOS build or the iOS hash in an
Android build. Wait for the success callback before calling any other SDK or Studio method.

```csharp
using io.adjoe.sdk;
using io.adjoe.sdk.studio;

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

## Handle Usage Access

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

## Get Campaigns and Offer Details

Build campaign cards from [SDK Models](../sdk-models.md) and the
[Visual Guide](visual-guide.md). Preserve the returned order and pass unmodified campaign
objects to later SDK calls.

### SDK Campaigns

Check availability, then fetch campaigns for your custom catalog, carousel, or placement.
Preserve the returned order.

```csharp
Playtime.GetStatus(
    status =>
    {
        if (!status.Details.CampaignsAvailable)
        {
            // Do not render the placement. Inspect CampaignsState for the reason.
            return;
        }

        CampaignOptions campaignOptions = new CampaignOptions()
            .SetPlacement(StudioPlacement.HomePage)
            .SetCategory(AppCategory.GAMING)
            .SetDisplayFormat(DisplayFormat.Carousel);

        PlaytimeStudio.GetCampaigns(
            campaignOptions,
            response => { var campaigns = response.Campaigns; },
            error => Debug.Log(error.Message));
    },
    error => Debug.Log(error.Message));
```

### Offer API Campaigns

Select offers on your backend and pass their tokens to the SDK for complete campaign model
data. Keep each Offer API token and app ID associated with its enriched campaign model. Keep
Offer API credentials and server-side API tokens out of the app. An SDK campaign-availability
check is not required for this route because the Offer API handles eligibility.

```csharp
string[] tokens = { "token_from_offer_api" };

PlaytimeStudio.GetOfferDetails(
    tokens,
    campaignOptions,
    response => { var campaigns = response.Campaigns; },
    error => Debug.Log(error.Message));
```

See [Offer API](../offer-api.md) for the server-side request and token flow.

### CampaignOptions

Build `CampaignOptions` with the fluent setters. All fields are optional.

| Setter             | Type              | Default              | Description                                                                                                              |
| ------------------ | ----------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `SetPlacement`     | `StudioPlacement` | unset                | Where campaigns are displayed. Use a predefined `StudioPlacement` value or `StudioPlacement.Custom`.                     |
| `SetCategory`      | `AppCategory`     | `AppCategory.GAMING` | If omitted, the SDK uses the gaming category. Pass `AppCategory.NON_GAMING` or `AppCategory.BOTH` for another selection. |
| `SetDisplayFormat` | `DisplayFormat`   | unset                | How campaigns are visually presented through your custom UI. Use a predefined value or `DisplayFormat.Custom`.           |
| `SetPromotionTag`  | `string`          | unset                | Tag used to filter campaigns by promotion.                                                                               |

See [StudioPlacement, DisplayFormat, and AppCategory](https://test-docs.adjoe.zone/rewarded-solutions/sdks/studio/build-your-ui/api-reference#option-values) for every predefined value. Any other value passed through `Custom` is treated as custom.

Build cards and details screens from [SDK Models](../sdk-models.md). Preserve unmodified
campaign objects from the current response for later SDK actions; do not construct them
yourself.

## Track Default and Engaged Impressions

Immediately after retrieval, configure your campaign UI to report `DEFAULT` when the entire
card is visible in the viewport. The SDK handles deduplication. This is the qualifying view
required before `OpenInStore`.

```csharp
PlaytimeStudio.ExecuteCampaignImpression(
    campaign,
    PlaytimeImpressionType.DEFAULT,
    () => Debug.Log("Default impression sent."),
    error => Debug.Log(error.Message));
```

For a campaign selected by the Offer API, including one enriched by `GetOfferDetails`, report
the qualifying view with its retained identifiers:

```csharp
PlaytimeStudio.ExecuteOfferImpression(
    token,
    appID,
    () => Debug.Log("Offer impression sent."),
    error => Debug.Log(error.Message));
```

When the user opens the campaign details screen that you built, manually report an engaged
impression. This event is additional and does not replace the qualifying default view.

```csharp
PlaytimeStudio.ExecuteCampaignImpression(
    campaign,
    PlaytimeImpressionType.ENGAGED,
    () => Debug.Log("Engaged impression sent."),
    error => Debug.Log(error.Message));
```

## Open a Campaign in the Store

After the qualifying default view, open the selected campaign in its native store.

> **Warning: Record a view before OpenInStore**
>
> Before calling `OpenInStore`, record `ExecuteCampaignImpression` with `DEFAULT` for a campaign
> selected by the SDK or `ExecuteOfferImpression` for a campaign selected by the Offer API.
> `ENGAGED` does not qualify, and `OpenInStore` can fail without the required view.

```csharp
PlaytimeStudio.OpenInStore(
    campaign,
    true,
    () => Debug.Log("Store opened."),
    error => Debug.Log(error.Message));
```

The second argument requests the supported native inline store flow. Availability varies by
platform and SDK configuration; when it is unavailable, or when you pass `false`, the external
native store flow opens.

## Get Installed Campaigns

Fetch installed campaigns for your custom in-progress experience. Refresh after the app
returns from the store and whenever the view regains focus so progress is current.

```csharp
PlaytimeStudio.GetInstalledCampaigns(
    new InstalledCampaignOptions().SetCategory(AppCategory.GAMING),
    response => { var installedCampaigns = response.Campaigns; },
    error => Debug.Log(error.Message));
```

Use [SDK Models](../sdk-models.md) to render installation status, reward completion, totals,
expiration, sequential and bonus actions, repeatable progress, and platform-specific reward
types.

### InstalledCampaignOptions

| Setter        | Type          | Default              | Description                                                                                                              |
| ------------- | ------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `SetCategory` | `AppCategory` | `AppCategory.GAMING` | If omitted, the SDK uses the gaming category. Pass `AppCategory.NON_GAMING` or `AppCategory.BOTH` for another selection. |

## Open an Installed Campaign

Launch an installed app so the user can continue earning rewards:

```csharp
PlaytimeStudio.OpenInstalledCampaign(
    installedCampaign,
    () => Debug.Log("Installed campaign opened."),
    error => Debug.Log(error.Message));
```

## Open Chatbot (Optional)

Open support for a campaign, or pass `null` for general support:

```csharp
PlaytimeStudio.OpenChatbot(
    campaign,
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

Every `onError` callback receives a structured `PlaytimeException`. Use `IsRetryable` to decide
whether to retry and retain the categorized error for diagnostics.

```csharp
void OnError(PlaytimeException error)
{
    Debug.Log($"{error.ErrorType} {error.Code} {error.IsRetryable} {error.Message}");
}
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

## Teardown (Optional)

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
