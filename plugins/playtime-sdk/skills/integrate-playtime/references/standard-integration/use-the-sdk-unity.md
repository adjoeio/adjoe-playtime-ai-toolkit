# Use the SDK

This guide covers the Standard Unity integration flow for displaying the Playtime
catalog. The v5 methods are asynchronous and report their result through `onSuccess` and
`onError` callbacks, which run on the Unity main thread.

Add the namespace to each C# script that uses the SDK. The public API shipped with the
Unity wrapper at 5.0.0 is the source of truth.

```csharp
using io.adjoe.sdk;
```

> **Note: Editor builds**
>
> The SDK methods do not run in the Unity editor; they log a message and return. Test on a
> physical Android or iOS build.

## Initialize the SDK

Initialize the SDK early so it can fetch campaign data. Select the SDK hash for the
current native platform; never reuse a hash from another application or platform.

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
using io.adjoe.sdk;

string sdkHash;
#if UNITY_ANDROID
sdkHash = "YOUR_ANDROID_SDK_HASH";
#elif UNITY_IOS
sdkHash = "YOUR_IOS_SDK_HASH";
#endif

InitOptions options = new InitOptions()
    .SetSdkHash(sdkHash)
    .SetUserId("user_123");

Playtime.InitPlaytime(
    options,
    () => Debug.Log("Playtime initialized."),
    error => Debug.Log($"Init failed: {error.Message}"));
```

`UserId` is required before displaying the catalog. If the user is not known at app
startup, initialize again with the user ID after login and before calling `ShowCatalog`.

Optional profile and extension data use the exported value types:

```csharp
InitOptions options = new InitOptions()
    .SetSdkHash(sdkHash)
    .SetUserId("user_123")
    .SetUserProfile(new PlaytimeUserProfile()
        .SetGender(PlaytimeGender.FEMALE)
        .SetBirthday("1990-05-15"))
    .SetExtensions(new PlaytimeExtensions()
        .SetSubId1("partner_user_123"))
    .SetLanguage("en")
    .SetUaNetwork("network")
    .SetUaChannel("channel")
    .SetUaCampaignName("campaign");
```

`SetExtensions` supports `SetSubId1` through `SetSubId5`. Profile birthdays accept a
calendar date or an ISO 8601 string.

### InitOptions Parameters

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

## Check SDK Status

Use `GetStatus` after initialization to verify that campaigns are available:

```csharp
Playtime.GetStatus(
    status =>
    {
        if (status.IsInitialized && status.Details.CampaignsAvailable)
        {
            // The catalog can be shown.
        }
    },
    error => Debug.Log($"GetStatus failed: {error.Message}"));
```

An initialized SDK can still report no campaigns because of targeting, app
configuration, device eligibility, or temporary inventory. Use the typed values in
`status.Details.CampaignsState` to determine why campaigns are unavailable. Compare
against the `PlaytimeCampaignsState` enum values, such as
`PlaytimeCampaignsState.VPN_DETECTED`, instead of comparing strings.

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

## Record the Placement Impression

Call `ExecuteImpressionEvent` every time the button or placement that opens the catalog becomes visible. Call it before `ShowCatalog` so the local impression record is available before the catalog checks it. Analytics delivery stays fire-and-forget, so this does not add network delay. The SDK must be initialized with a user ID before this call.

This required step records how many users see the catalog entry point so you can measure conversion from placement views to catalog opens. Pass the predefined `CatalogPlacement` that describes the entry point, or use `CatalogPlacement.Custom` when none applies.

```csharp
Playtime.ExecuteImpressionEvent(
    CatalogPlacement.Navbar,
    () => Debug.Log("Impression recorded."),
    error => Debug.Log($"ExecuteImpressionEvent failed: {error.Message}"));
```

The success callback runs after the impression is recorded locally and does not wait for
analytics delivery. `ShowCatalog` fails with `IMPRESSION_NOT_EXECUTED` if
`ExecuteImpressionEvent` has not been called within the previous 30 minutes. Repeated calls
safely refresh the visibility record while duplicate analytics events are suppressed. The
placement passed here and the placement in `ShowCatalog` are independent and do not need to
match.

## Show the Catalog

Pass catalog-specific options to `ShowCatalog`:

```csharp
CatalogOptions options = new CatalogOptions()
    .SetPlacement(CatalogPlacement.Navbar)
    .SetCategory(AppCategory.GAMING);

Playtime.ShowCatalog(
    options,
    () => Debug.Log("Catalog launched."),
    error => Debug.Log($"ShowCatalog failed: {error.Message}"));
```

Keep the launch button disabled while the native catalog is being presented to prevent
duplicate presentations.

### CatalogOptions Parameters

Build `CatalogOptions` with the fluent setters. All fields are optional.

| Setter            | Type               | Default              | Description                                                                                                                                                                                   |
| ----------------- | ------------------ | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SetPlacement`    | `CatalogPlacement` | unset                | Where the catalog is triggered from. Use a predefined value (`CatalogPlacement.Navbar`, `CatalogPlacement.Icon`, `CatalogPlacement.EarnTab`, and more) or `CatalogPlacement.Custom("value")`. |
| `SetCategory`     | `AppCategory`      | `AppCategory.GAMING` | If omitted, the SDK uses the gaming category. Pass `AppCategory.NON_GAMING` or `AppCategory.BOTH` for another selection.                                                                      |
| `SetPromotionTag` | `string`           | unset                | Tag used to filter campaigns by promotion.                                                                                                                                                    |

See [CatalogPlacement and AppCategory](https://test-docs.adjoe.zone/rewarded-solutions/sdks/api-reference#option-values) for every predefined value. Any value passed through `Custom` is treated as custom.

## Handle Errors

Every method reports failures through its `onError` callback with a `PlaytimeException`:

```csharp
void OnError(PlaytimeException error)
{
    Debug.Log($"{error.ErrorType} {error.Code} {error.Message}");
    // Retry only when error.IsRetryable is true.
}
```

Retry only when `IsRetryable` is `true`. Ask the user to disable a VPN for
`PlaytimeErrorType.NETWORK_VPN`; verify integration options for
`PlaytimeErrorType.SDK_CONFIG`; and report persistent
`PlaytimeErrorType.RESPONSE_FORMAT` or `PlaytimeErrorType.UNKNOWN` errors to adjoe.

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

Release SDK state when the current user signs out or when you need to reset the
integration:

```csharp
Playtime.Teardown(
    () => Debug.Log("Teardown complete."),
    error => Debug.Log($"Teardown failed: {error.Message}"));
```

Use `teardown()` to deinitialize the SDK and release all internal resources. Call this when the user logs out or when Playtime is no longer needed in the current session.

> **Warning**
>
> After calling `teardown()`, you must call `initPlaytime` again before using any other SDK method.
> Teardown does not replace UA values already recorded by the backend.

## Set Up Server-to-Server Payouts

Finally, set up [Server-to-Server (S2S) payouts](https://test-docs.adjoe.zone/rewarded-solutions/setting-up-rewarding/server-to-server-payouts) so your backend can receive payout callbacks and distribute rewards to users.

## API Reference

See the [Playtime API Reference](https://test-docs.adjoe.zone/rewarded-solutions/sdks/api-reference) for option values and platform API links.

## Verification Checklist

1. Use the Android and iOS SDK hashes only in their corresponding native builds.
2. Wait for the `InitPlaytime` success callback before calling another SDK method.
3. Initialize again with `UserId` if it was unavailable at app startup.
4. Confirm `GetStatus` reports `IsInitialized` and the intended user ID.
5. Use `Details.CampaignsAvailable` as the primary availability signal.
6. Inspect `Details.CampaignsState` when campaigns are unavailable.
7. Call `ExecuteImpressionEvent` every time the catalog entry point becomes visible.
8. Record the impression before opening the catalog so `ShowCatalog` does not fail with `IMPRESSION_NOT_EXECUTED`.
9. Pass only presentation fields in the catalog options.
10. Prevent duplicate catalog presentations while a launch is in progress.
11. Handle every `PlaytimeException` and retry only retryable failures.
12. Call `Teardown` on logout and initialize again before the next use.
13. Test initialization, status, impression refresh, catalog presentation, errors, and
    teardown on physical Android and iOS builds.
