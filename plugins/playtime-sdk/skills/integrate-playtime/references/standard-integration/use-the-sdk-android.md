# Use the SDK

This guide covers the complete Catalog integration flow for displaying the Playtime catalog in your app.

## Initialize the SDK

Verify the SDK is installed correctly:

```kotlin
import io.adjoe.sdk.Playtime
```

If the import resolves without errors, proceed with initialization.

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
import io.adjoe.sdk.PlaytimeTeardownListener

val options = InitOptions(
    sdkHash = "YOUR_SDK_HASH",
    userId = "user_123"
)

Playtime.initPlaytime(options, object : PlaytimeInitListener {
    override fun onSuccess() {
        // SDK is ready
    }
    override fun onError(exception: PlaytimeException) {
        // Handle error
    }
})
```

### InitOptions Parameters

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

## Check SDK Status

Before showing the catalog, check `getStatus()` to verify campaign availability.

```kotlin
val status = Playtime.getStatus()

if (status.isInitialized && status.details.campaignsAvailable) {
    // Safe to show catalog
}
```

Check `campaignsAvailable` before showing the catalog. If campaigns are unavailable, use `campaignsState` to understand why and adapt your UI.

**Campaign States:**

| State             | Description                                                    |
| ----------------- | -------------------------------------------------------------- |
| `READY`           | Campaigns are available and can be shown                       |
| `BLOCKED`         | User is blocked from seeing campaigns                          |
| `VPN_DETECTED`    | A VPN was detected; campaigns are unavailable                  |
| `GEO_MISMATCH`    | User's location doesn't match the app's target region          |
| `NOT_INITIALIZED` | The SDK has not completed initialization or has been torn down |

> **Note: Test users**
>
> Test users can still get campaigns from `getCampaigns()` while `campaignsAvailable` is `false`, for example in a blocked or mismatched country. This happens only for test users. For real users, `campaignsAvailable` is reliable.

> **Warning**
>
> The `isFraud` flag is purely informational. Do not hide campaigns based on fraud status — the SDK already manages the experience for flagged users.

## Record the Placement Impression

Call `executeImpressionEvent` every time the button or placement that opens the catalog becomes visible. Continue to `showCatalog` from `onSuccess` so the local impression record is available before the catalog checks it. Analytics delivery remains fire-and-forget, so this does not add network delay.

This required step records how many users see the catalog entry point so you can measure conversion from placement views to catalog opens. Pass the predefined `CatalogPlacement` that describes the entry point, or use `CatalogPlacement.Custom("value")` when none applies.

```kotlin
Playtime.executeImpressionEvent(
    placement = CatalogPlacement.Navbar,
    listener = object : PlaytimeImpressionEventListener {
        override fun onSuccess() {
            Playtime.showCatalog(activity, catalogOptions, catalogLaunchListener)
        }

        override fun onError(exception: PlaytimeException) {
            // Handle or log the error.
        }
    }
)
```

`showCatalog` fails if `executeImpressionEvent` has not been called within the previous 30 minutes. `onSuccess` confirms that the impression was recorded locally; it does not wait for analytics delivery. The placement passed here and the placement in `CatalogOptions` are independent and do not need to match.

## Show the Catalog

`showCatalog` displays the adjoe offerwall UI. It accepts optional `CatalogOptions` for placement and category filtering.

> **Info: userId Required**
>
> `userId` must be set in `InitOptions` before calling `showCatalog`. If you initialize at app start without a userId (e.g., before login), you must call `initPlaytime` again with the userId once it's available.

```kotlin
import io.adjoe.sdk.CatalogOptions
import io.adjoe.sdk.CatalogPlacement
import io.adjoe.sdk.PlaytimeCatalogLaunchListener

val catalogOptions = CatalogOptions(
    placement = CatalogPlacement.Navbar
)

Playtime.showCatalog(activity, catalogOptions, object : PlaytimeCatalogLaunchListener {
    override fun onCatalogLaunched() {
        // Catalog activity was launched
    }
    override fun onError(exception: PlaytimeException) {
        // Handle error
    }
})
```

### CatalogOptions Parameters

| Parameter      | Type               | Required | Default              | Description                                                                                                                                      |
| -------------- | ------------------ | -------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `placement`    | `CatalogPlacement` | No       | `null`               | Where the catalog is triggered from. See [API Reference](https://test-docs.adjoe.zone/rewarded-solutions/sdks/api-reference#catalogplacement) for predefined values, or use `.Custom("value")`. |
| `category`     | `AppCategory`      | No       | `AppCategory.GAMING` | If omitted, the SDK uses the gaming category. Specify `NON_GAMING` or `BOTH` to request another category selection.                              |
| `promotionTag` | `String`           | No       | `null`               | Tag for user-level promotions. See [User Level Promos](https://test-docs.adjoe.zone/rewarded-solutions/sdks/resources/user-level-promos).                                                       |
| `metadata`     | `PlaytimeMetadata` | No       | `null`               | Request metadata returned in S2S payouts. Contains optional `metadata1` and `metadata2` strings.                                                 |

See [CatalogPlacement and AppCategory](https://test-docs.adjoe.zone/rewarded-solutions/sdks/api-reference#option-values) for every predefined value and custom-value syntax.

## Handle Errors

All SDK methods can produce a `PlaytimeException`. Use `isRetryable` to decide whether to retry.

```kotlin
override fun onError(exception: PlaytimeException) {
    val code = exception.code           // e.g., "PlaytimeServerException.FORBIDDEN"
    val type = exception.errorType      // e.g., PlaytimeErrorType.NETWORK
    val retryable = exception.isRetryable
    val message = exception.message

    when (exception.errorType) {
        PlaytimeErrorType.NETWORK -> {} // Retry after delay
        PlaytimeErrorType.NETWORK_VPN -> {} // Ask user to disable VPN
        PlaytimeErrorType.API -> {} // Server error, retry later
        PlaytimeErrorType.SDK_CONFIG -> {} // Check your InitOptions
        PlaytimeErrorType.RESPONSE_FORMAT -> {} // Report to adjoe
        PlaytimeErrorType.UNKNOWN -> {} // Unexpected error
    }
}
```

All SDK methods can produce a `PlaytimeException` with these structured fields:

| Field         | Type              | Description                                                                                                                                               |
| ------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `code`        | String            | Machine-readable error identifier. The format differs per platform, e.g. `"PlaytimeServerException.FORBIDDEN"` (Android) or `"NetworkError.failed"` (iOS) |
| `errorType`   | PlaytimeErrorType | Categorized error type (see below)                                                                                                                        |
| `isRetryable` | Boolean           | Whether the operation can be safely retried                                                                                                               |
| `message`     | String            | Human-readable error description                                                                                                                          |

**Error Types:**

| Error Type                            | Description                                       | Retryable |
| ------------------------------------- | ------------------------------------------------- | --------- |
| `NETWORK` / `.network`                | Network connectivity issue                        | Yes       |
| `NETWORK_VPN` / `.networkVPN`         | VPN detected, blocking requests                   | No        |
| `API` / `.api`                        | Server returned an error                          | Sometimes |
| `RESPONSE_FORMAT` / `.responseFormat` | Unexpected response format                        | No        |
| `SDK_CONFIG` / `.sdkConfig`           | Invalid SDK configuration (e.g., missing sdkHash) | No        |
| `UNKNOWN` / `.unknown`                | Unexpected error                                  | No        |

> **Note: Wrong or unknown SDK hash**
>
> A wrong SDK hash is reported as `API`, not `SDK_CONFIG`, whenever it reaches the server:
>
> - **Android** sends any hash to the server. An unknown hash fails with code `PlaytimeServerException.FORBIDDEN` (HTTP 403).
> - **iOS** first checks that the hash is a valid MD5 hash. If it is not, `initPlaytime` fails right away with `.sdkConfig` and code `InitializationRequestError.invalidSDKHash`, without a network request. A well-formed but unknown hash fails with `.api` and code `NetworkError.failed` (HTTP 403).

## Teardown (Optional)

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

Use `teardown()` to deinitialize the SDK and release all internal resources. Call this when the user logs out or when Playtime is no longer needed in the current session.

> **Warning**
>
> After calling `teardown()`, you must call `initPlaytime` again before using any other SDK method.
> Teardown does not replace UA values already recorded by the backend.

## Set Up Server-to-Server Payouts

Finally, set up [Server-to-Server (S2S) payouts](https://test-docs.adjoe.zone/rewarded-solutions/setting-up-rewarding/server-to-server-payouts) so your backend can receive payout callbacks and distribute rewards to users.

## Complete Example

```kotlin
import io.adjoe.sdk.Playtime
import io.adjoe.sdk.InitOptions
import io.adjoe.sdk.CatalogOptions
import io.adjoe.sdk.CatalogPlacement
import io.adjoe.sdk.PlaytimeInitListener
import io.adjoe.sdk.PlaytimeCatalogLaunchListener
import io.adjoe.sdk.PlaytimeImpressionEventListener
import io.adjoe.sdk.PlaytimeException

// 1. Initialize
val options = InitOptions(
    sdkHash = "YOUR_SDK_HASH",
    userId = "user_123"
)

Playtime.initPlaytime(options, object : PlaytimeInitListener {
    override fun onSuccess() {
        // 2. Check status
        val status = Playtime.getStatus()

        if (status.details.campaignsAvailable) {
            // 3. Record the impression when the catalog entry point becomes visible
            Playtime.executeImpressionEvent(
                placement = CatalogPlacement.Navbar,
                listener = object : PlaytimeImpressionEventListener {
                    override fun onSuccess() {
                        // 4. The local record is ready; analytics delivery remains asynchronous
                        Playtime.showCatalog(
                            activity,
                            CatalogOptions(placement = CatalogPlacement.Navbar),
                            object : PlaytimeCatalogLaunchListener {
                                override fun onCatalogLaunched() { }
                                override fun onError(exception: PlaytimeException) { }
                            }
                        )
                    }

                    override fun onError(exception: PlaytimeException) { }
                }
            )
        }
    }

    override fun onError(exception: PlaytimeException) {
        // Handle initialization error
    }
})

// 5. Teardown (e.g., on logout)
Playtime.teardown(object : PlaytimeTeardownListener {
    override fun onSuccess() { }
    override fun onError(error: PlaytimeException) { }
})
```

## API Reference

Full method signatures and type documentation:

- [Android SDK Reference](https://playtime-api-reference.adjoe.io/monetize/android/5.0.0/basic/index.html)

## Verification Checklist

1. Wait for initialization before calling another SDK method.
2. Confirm status reports that campaigns are available.
3. Record the placement impression whenever the entry point becomes visible.
4. Open the catalog only after the local impression succeeds.
5. Handle structured errors and retry only retryable failures.
6. Test initialization, status, impression recording, catalog presentation, and teardown on a physical device.
