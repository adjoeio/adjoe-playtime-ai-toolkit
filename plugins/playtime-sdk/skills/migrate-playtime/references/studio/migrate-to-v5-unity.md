# Migrate to v5

Follow this guide to migrate your Unity Studio integration from v4 to v5. The methods keep
the `onSuccess` and `onError` callback style.

## What's changing

v5 makes initialization explicit, replaces the shared `PlaytimeOptions` with
purpose-specific options, and gives Studio methods clearer names. It also adds required TOS
consent and structured error handling.

The main integration rule is: wait for `InitPlaytime` to complete successfully before
calling any other SDK or Studio method.

## What you need to update

### 1. Update the dependency

Import the Playtime SDK 5.0.0 `.unitypackage` as described in
[Get Started](https://test-docs.adjoe.zone/rewarded-solutions/sdks/getting-started-unity/), then run the External Dependency Manager to
resolve the native dependencies. Confirm Android resolves `io.adjoe:adjoe-sdk-android:5.0.0`
and iOS resolves `PlaytimeSDK` 5.0.0. Rebuild both player targets after the upgrade.

Add the Studio namespace alongside the core namespace:

```csharp
using io.adjoe.sdk;
using io.adjoe.sdk.studio;
```

### 2. Replace implicit initialization

Initialize Playtime as early as possible and wait for the success callback before calling
any other SDK or Studio method.

Replace `SetPlaytimeOptions` and the combined `PlaytimeOptions` object with
`InitPlaytime(InitOptions)`.

**Before (v4):**

```csharp
PlaytimeOptions options = new PlaytimeOptions();
options.SetUserId("user_123");

Playtime.SetPlaytimeOptions(
    options,
    () => Debug.Log("Options set."),
    error => Debug.Log(error.Message));
```

**After (v5):**

```csharp
InitOptions options = new InitOptions()
    .SetSdkHash("YOUR_SDK_HASH")
    .SetUserId("user_123")
    .SetUaNetwork("network")
    .SetUaChannel("channel");

Playtime.InitPlaytime(
    options,
    () => Debug.Log("Playtime initialized."),
    error => Debug.Log(error.Message));
```

At app start, v5 waits five seconds and then sends a lightweight session-start event for
reporting. The event contains no personal user data and identifies only an anonymous user.
It does not initialize or create a Playtime user.

### 3. Split initialization options from campaign options

| Concern                   | v4                                                         | v5                                                              |
| ------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------- |
| Initialization            | `PlaytimeOptions` with `SetPlaytimeOptions`                | `InitOptions` with `InitPlaytime`                               |
| Available/offer campaigns | `PlaytimeOptions` passed to campaign and token-based calls | `CampaignOptions` passed to `GetCampaigns` or `GetOfferDetails` |
| Installed campaigns       | `PlaytimeOptions` passed to `GetInstalledCampaigns`        | `InstalledCampaignOptions` passed to `GetInstalledCampaigns`    |
| Placement/presentation    | String placement and display values in `PlaytimeParams`    | Typed placement and presentation fields in `CampaignOptions`    |

**Before (v4):**

```csharp
PlaytimeStudio.GetCampaigns(
    options,
    response => { /* ... */ },
    error => Debug.Log(error.Message));
```

**After (v5):**

```csharp
CampaignOptions campaignOptions = new CampaignOptions()
    .SetPlacement(StudioPlacement.Navbar)
    .SetCategory(AppCategory.GAMING);

PlaytimeStudio.GetCampaigns(
    campaignOptions,
    response => { /* ... */ },
    error => Debug.Log(error.Message));

PlaytimeStudio.GetInstalledCampaigns(
    new InstalledCampaignOptions().SetCategory(AppCategory.GAMING),
    response => { /* ... */ },
    error => Debug.Log(error.Message));
```

- UA fields move to `InitOptions`. Each field independently records its first non-null value and cannot later be cleared or changed.
- Placement uses the typed placement value in `CampaignOptions`.
- To change mutable, non-UA initialization values, call `InitPlaytime` explicitly again and wait for successful completion.

### 4. Update renamed methods

#### Campaign impressions (formerly "engagements")

| v4                                  | v5                                          |
| ----------------------------------- | ------------------------------------------- |
| `ExecuteEngagement(campaign, type)` | `ExecuteCampaignImpression(campaign, type)` |
| `ExecuteEngagement(appID, token)`   | `ExecuteOfferImpression(token, appID)`      |

```csharp
// v4
PlaytimeStudio.ExecuteEngagement(campaign, PlaytimeEngagementType.DEFAULT, onSuccess, onError);

// v5
PlaytimeStudio.ExecuteCampaignImpression(campaign, PlaytimeImpressionType.DEFAULT, onSuccess, onError);
```

#### Details and installed views

| v4                                     | v5                               |
| -------------------------------------- | -------------------------------- |
| `ShowAppDetails(campaign)`             | `ShowCampaignDetails(campaign)`  |
| `ShowAppDetails(token, campaignAppId)` | `ShowOfferDetails(token, appID)` |
| `ShowInstalledApps()`                  | `ShowInstalledCampaigns()`       |

#### Offer API

| v4                              | v5                                         |
| ------------------------------- | ------------------------------------------ |
| `GetCampaigns(tokens, options)` | `GetOfferDetails(tokens, campaignOptions)` |

### 5. Change view tracking from 50% to full visibility

> **Warning: Update impression tracking for v5**
>
> - **Card visibility:** In v4, send the view when at least 50% of the campaign card is
>   visible. When migrating to v5, update your visibility check to send the view only when
>   100% of the campaign card is visible in the viewport.
> - **Before installation:** Send `ExecuteCampaignImpression` with
>   `PlaytimeImpressionType.DEFAULT` for an SDK campaign, or `ExecuteOfferImpression` for an
>   Offer API item, before `OpenInStore`. An engaged impression does not satisfy this
>   requirement, and `OpenInStore` can fail without the qualifying view.
> - **Custom details:** Send `PlaytimeImpressionType.ENGAGED` when the user opens
>   publisher-built campaign details.

### 6. Add TOS consent handling

Before using Studio, incorporate adjoe's Terms of Service into your own terms and ask the user
to accept those terms through explicit input. Never infer consent or submit acceptance
automatically. Campaigns remain unavailable until you report the user's acceptance with
`updateTosConsent`. If the user later withdraws consent, report the withdrawal with the same
method.

```csharp
PlaytimeStudio.UpdateTosConsent(TosConsentAction.ACCEPT, onSuccess, onError);
PlaytimeStudio.UpdateTosConsent(TosConsentAction.WITHDRAW, onSuccess, onError);
```

### 7. Update error handling

v4 callbacks received a plain `Exception`. In v5, the `onError` callback receives a
structured `PlaytimeException`:

```csharp
void OnError(PlaytimeException error)
{
    Debug.Log($"{error.ErrorType} {error.Code} {error.IsRetryable} {error.Message}");
}
```

### 8. Replace removed APIs and configuration

- `PlaytimeStudio.GetPermissions(...)`: read usage-access state from `Playtime.GetStatus()` instead
- `PlaytimeEngagementType`: use `PlaytimeImpressionType`

Read permission state from status and guard the Android-only prompt:

```csharp
#if UNITY_ANDROID
Playtime.GetStatus(
    status =>
    {
        if (status.IsUsagePermissionAccepted != true)
        {
            PlaytimeStudio.ShowPermissionsPrompt(onSuccess, onError);
        }
    },
    error => Debug.Log(error.Message));
#endif
```

Android usage access is required to measure play duration and serve time-based reward behavior. iOS has no usage-access prompt and does not support Android time-based rewards. Other eligible campaign and reward types remain available independently.

The following features previously required enabling through the Monetize Dashboard. In v5, they are enabled by default:

| Feature                  | Description                                                 |
| ------------------------ | ----------------------------------------------------------- |
| View tracking            | Impression tracking is always active                        |
| Install validation       | Views are required before a click is counted                |
| Engaged click            | Available without dashboard configuration                   |
| Pending installs         | Install detection after `OpenInStore` is automatic          |
| Inline installs (Studio) | In-app store UI is available without config where supported |

v5 adds an inline-install argument to `OpenInStore`. Request the supported inline store
experience directly:

```csharp
PlaytimeStudio.OpenInStore(campaign, true, onSuccess, onError);
```

The second argument requests the supported native inline store flow. Availability varies by platform and SDK configuration; when it is unavailable, or when you pass `false`, the external native store flow opens.

#### Reward notifications

Reward notifications are disabled by default in v5. To use them on Android, contact your
Technical Account Manager (TAM) and ask them to enable the configuration for your app.

## Migration checklist

1. Import the Playtime SDK 5.0.0 `.unitypackage` and resolve the native dependencies.
2. Replace `SetPlaytimeOptions` with `InitPlaytime`.
3. Wait for the `InitPlaytime` success callback before calling other SDK or Studio methods.
4. Account for the anonymous session-start event sent five seconds after app start.
5. Contact your TAM if you want reward notifications enabled on Android.
6. Split `PlaytimeOptions` into `InitOptions`, `CampaignOptions`, and `InstalledCampaignOptions`.
7. Set each UA field with its intended first non-null value; later initialization or teardown cannot replace it.
8. Rename engagement methods to campaign or offer impression methods.
9. For custom UI, change the view threshold from 50% to 100% card visibility, and send the required `PlaytimeImpressionType.DEFAULT` campaign impression or token-based offer impression before `OpenInStore`.
10. Rename `ShowAppDetails` and `ShowInstalledApps` to their campaign equivalents.
11. Replace token-based `GetCampaigns` with `GetOfferDetails`.
12. Add explicit TOS management through `UpdateTosConsent`.
13. Read `PlaytimeException` fields in `onError`.
14. Replace `GetPermissions` with `GetStatus`, and keep `ShowPermissionsPrompt` Android-only.
15. Remove assumptions that the formerly configurable features must be enabled in the dashboard.
16. Rebuild and test both native player targets.

## Need help?

- [API Reference](https://test-docs.adjoe.zone/rewarded-solutions/sdks/api-reference): full v5 method signatures and types
- [Studio Changelog](https://test-docs.adjoe.zone/rewarded-solutions/sdks/studio/changelog): complete list of Studio changes
- Contact your Account Manager for migration support
- [Quick-Start Custom UI](https://test-docs.adjoe.zone/rewarded-solutions/sdks/studio/build-your-ui/quick-start-unity/): use the managed Studio views
- [Custom UI](https://test-docs.adjoe.zone/rewarded-solutions/sdks/studio/build-your-ui/custom-ui/use-sdk-unity/): build and track your own Studio UI

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

### CampaignOptions

### CampaignOptions

Build `CampaignOptions` with the fluent setters. All fields are optional.

| Setter             | Type              | Default              | Description                                                                                                              |
| ------------------ | ----------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `SetPlacement`     | `StudioPlacement` | unset                | Where campaigns are displayed. Use a predefined `StudioPlacement` value or `StudioPlacement.Custom`.                     |
| `SetCategory`      | `AppCategory`     | `AppCategory.GAMING` | If omitted, the SDK uses the gaming category. Pass `AppCategory.NON_GAMING` or `AppCategory.BOTH` for another selection. |
| `SetDisplayFormat` | `DisplayFormat`   | unset                | How campaigns are visually presented through your custom UI. Use a predefined value or `DisplayFormat.Custom`.           |
| `SetPromotionTag`  | `string`          | unset                | Tag used to filter campaigns by promotion.                                                                               |

See [StudioPlacement, DisplayFormat, and AppCategory](https://test-docs.adjoe.zone/rewarded-solutions/sdks/api-reference#option-values) for every predefined value. Any other value passed through `Custom` is treated as custom.

### InstalledCampaignOptions

| Setter        | Type          | Default              | Description                                                                                                              |
| ------------- | ------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `SetCategory` | `AppCategory` | `AppCategory.GAMING` | If omitted, the SDK uses the gaming category. Pass `AppCategory.NON_GAMING` or `AppCategory.BOTH` for another selection. |
