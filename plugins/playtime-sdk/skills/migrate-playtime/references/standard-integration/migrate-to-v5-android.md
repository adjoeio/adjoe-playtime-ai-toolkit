# Migrate to v5

Follow this guide to migrate your Catalog integration from v4 to v5.

---

## 1. Dependency Changes

The Maven artifact name remains unchanged. Update the version in your `build.gradle.kts`:

```kotlin
// v4
implementation("io.adjoe:adjoe-sdk-android:4.x.x")

// v5
implementation("io.adjoe:adjoe-sdk-android:5.0.0")
```

---

## 2. Initialization

Initialize Playtime as early as possible in the app lifecycle and wait for initialization to complete successfully before calling any other SDK method. Prefer `Application.onCreate` on Android, app launch on iOS, and app startup in React Native.

The initialization method has been renamed from `setPlaytimeOptions` to `initPlaytime`, and uses a new `InitOptions` data class instead of `PlaytimeOptions.Builder`.

v5 removed implicit initialization. `initPlaytime` must complete successfully before you call any other SDK method.

**Before (v4):**

```kotlin
val options = PlaytimeOptions.Builder(context, "YOUR_SDK_HASH")
    .setUserId("user123")
    .build()

Playtime.setPlaytimeOptions(options, object : PlaytimeInitListener {
    override fun onInitCompleted() { /* ready */ }
    override fun onError(exception: PlaytimeException) { /* error */ }
})
```

**After (v5):**

```kotlin
Playtime.initPlaytime(
    InitOptions(sdkHash = "YOUR_SDK_HASH", userId = "user123", country = "DE"),
    object : PlaytimeInitListener {
        override fun onSuccess() { /* ready */ }
        override fun onError(exception: PlaytimeException) { /* error */ }
    }
)
```

At app start, v5 waits five seconds and then sends a lightweight session-start event for reporting. The event contains no personal user data and identifies only an anonymous user. It does not initialize or create a Playtime user.

`country` is an optional ISO 3166-1 alpha-2 code used to map a user to their reward currency. Set it only when your integration supports multiple currencies, and set it only once per user because the backend does not accept replacements. The SDK trims and uppercases the value. Invalid non-empty values cause initialization to fail.

---

## 3. Show Catalog

`showCatalog` now accepts a dedicated `CatalogOptions` object with type-safe placement and category values, instead of the generic `PlaytimeOptions`. Call `executeImpressionEvent` every time the catalog entry point becomes visible, before calling `showCatalog`.

**Before (v4):**

```kotlin
val options = PlaytimeOptions.Builder(context, "YOUR_SDK_HASH")
    .setUserId("user123")
    .build()

Playtime.showCatalog(activity, options, object : PlaytimeCatalogListener {
    override fun onCatalogLaunched() { /* launched */ }
    override fun onError(exception: PlaytimeException) { /* error */ }
})
```

**After (v5):**

```kotlin
Playtime.executeImpressionEvent(
    CatalogPlacement.Navbar,
    object : PlaytimeImpressionEventListener {
        override fun onSuccess() {
            Playtime.showCatalog(
                activity,
                CatalogOptions(
                    placement = CatalogPlacement.Navbar,
                    category = AppCategory.GAMING
                ),
                catalogLaunchListener
            )
        }

        override fun onError(exception: PlaytimeException) { /* error */ }
    }
)
```

`executeImpressionEvent` measures how many users see the catalog entry point and the conversion from a placement view to a catalog open. Pass the predefined `CatalogPlacement` that describes the entry point, or use `Custom("value")` when none applies. Call `showCatalog` from `onSuccess` so the local impression record is ready. Analytics delivery remains fire-and-forget and does not add network delay. `showCatalog` fails if no impression call was made within the previous 30 minutes. Repeated calls safely refresh the visibility record while duplicate analytics events are suppressed. The impression placement and `CatalogOptions.placement` are independent and do not need to match.

---

## 4. Options Restructuring

**v4:** `PlaytimeOptions` (containing userId, sdkHash, params, etc.) was passed to every SDK method.

**v5:**

- `InitOptions` — passed only to `initPlaytime` (sdkHash, userId, userProfile, extensions, language, country, UA params)
- `CatalogOptions` — passed to `showCatalog` (placement, category, promotionTag)

`PlaytimeParams` is removed entirely. All UA parameters (`uaNetwork`, `uaChannel`, `uaCampaignName`) are now set in `InitOptions`. Placement is now type-safe (`CatalogPlacement`) and lives in `CatalogOptions`.

Each UA field transitions independently from `null` to its first non-null value. Once the backend records a non-null value for a field, it cannot be cleared or changed. Later `initPlaytime` calls, including calls after `teardown`, do not replace it.

---

## 5. Remove v4 Auto-Initialization Configuration

If you disabled SDK warm-up in v4, you can safely remove the obsolete `io.adjoe.Playtime.AUTO_INIT_ENABLED` `<meta-data>` entry from `AndroidManifest.xml`; v5 no longer uses it. This cleanup is unnecessary if you never added the entry.

---

## 6. Type-Safe Placements

String-based placements have been replaced with type-safe enums:

```kotlin
// v4 — string-based
PlaytimeParams.Builder().setPlacement("navbar").build()

// v5 — type-safe enum
CatalogOptions(placement = CatalogPlacement.Navbar)
```

Use the predefined placement that best describes the entry point, or use `Custom("your_value")` when none applies.

---

## 7. Status: Consolidated Getters

Individual status methods have been consolidated under `Playtime.getStatus()`:

| v4 Method                   | v5 Equivalent                        |
| --------------------------- | ------------------------------------ |
| `Playtime.getUserId()`      | `Playtime.getStatus().userId`        |
| `Playtime.getVersion()`     | `Playtime.getStatus().version`       |
| `Playtime.isInitialized()`  | `Playtime.getStatus().isInitialized` |
| `Playtime.hasAcceptedTOS()` | `Playtime.getStatus().isTosAccepted` |

---

## 8. Other v5 Changes

### Reward Notifications

Reward notifications are disabled by default in v5. If you want to use them, contact your Technical Account Manager (TAM) to have the configuration enabled.

### Notification Permission Prompt

In v4, opening the catalog on Android 13 and later showed the system `POST_NOTIFICATIONS` permission dialog. In v5 the SDK no longer requests this permission by default. If you want the SDK to request it, contact your TAM to have the configuration enabled, or request the permission from your own app.

### Removed APIs

The following APIs have been removed entirely in v5 (no replacement):

- `getCatalogIntent()` — use `showCatalog()` instead
- `sendUserEvent()` — no longer supported
- `setUAParams()` — pass UA params in `InitOptions` instead
- All 4 `init()` overloads — use `initPlaytime()` instead

---

## 9. Error Handling

Error handling has been redesigned around a structured `PlaytimeException` class with machine-readable fields.

**Before (v4):**

```kotlin
// v4 — simple exception with message, plus a separate not-initialized type
try {
    Playtime.showCatalog(activity, options, listener)
} catch (e: PlaytimeNotInitializedException) {
    // SDK not initialized
} catch (e: PlaytimeException) {
    Log.e("Playtime", e.message ?: "Unknown error")
}
```

**After (v5):**

```kotlin
// v5 — structured exception with code, type, and retryability
Playtime.showCatalog(activity, catalogOptions, object : PlaytimeCatalogLaunchListener {
    override fun onError(exception: PlaytimeException) {
        Log.e("Playtime", "Code: ${exception.code}")
        Log.e("Playtime", "Type: ${exception.errorType}")
        Log.e("Playtime", "Message: ${exception.message}")

        if (exception.isRetryable) {
            // Safe to retry the operation
        }
    }
})
```

All failures can be handled as `PlaytimeException`. `PlaytimeNotInitializedException` remains a specialized subclass for operations attempted before initialization completes.

---

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

### CatalogOptions

| Parameter      | Type               | Required | Default              | Description                                                                                                                                      |
| -------------- | ------------------ | -------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `placement`    | `CatalogPlacement` | No       | `null`               | Where the catalog is triggered from. See [API Reference](https://test-docs.adjoe.zone/rewarded-solutions/sdks/api-reference#catalogplacement) for predefined values, or use `.Custom("value")`. |
| `category`     | `AppCategory`      | No       | `AppCategory.GAMING` | If omitted, the SDK uses the gaming category. Specify `NON_GAMING` or `BOTH` to request another category selection.                              |
| `promotionTag` | `String`           | No       | `null`               | Tag for user-level promotions. See [User Level Promos](https://test-docs.adjoe.zone/rewarded-solutions/sdks/resources/user-level-promos).                                                       |
| `metadata`     | `PlaytimeMetadata` | No       | `null`               | Request metadata returned in S2S payouts. Contains optional `metadata1` and `metadata2` strings.                                                 |

See [CatalogPlacement and AppCategory](https://test-docs.adjoe.zone/rewarded-solutions/sdks/api-reference#option-values) for every predefined value and custom-value syntax.

## Migration Checklist

1. Update dependency version to `5.0.0`
2. Replace `PlaytimeOptions.Builder` + `setPlaytimeOptions` with `InitOptions` + `initPlaytime`
3. Wait for `initPlaytime` to complete before calling other SDK methods
4. Account for the anonymous session-start event sent five seconds after app start
5. Set each UA field with its intended first non-null value; later initialization or teardown cannot replace it
6. Call `executeImpressionEvent` every time the catalog entry point becomes visible
7. Replace `showCatalog` to use `CatalogOptions` with type-safe placements
8. If you disabled SDK warm-up in v4, remove the obsolete `io.adjoe.Playtime.AUTO_INIT_ENABLED` manifest entry
9. Contact your TAM if you want reward notifications or the notification permission prompt enabled
10. Replace individual status getters (`getUserId`, `getVersion`, etc.) with `getStatus()`
11. Remove any usage of `getCatalogIntent`, `sendUserEvent`, `setUAParams`
12. Update error handling to use the new structured `PlaytimeException`
13. Build and test your integration thoroughly

---

