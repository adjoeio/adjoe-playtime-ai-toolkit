# Migrate to v5

Follow this guide to migrate your Catalog integration from v4 to v5.

---

## 1. Dependency Changes

The CocoaPod has been renamed. Update your `Podfile`:

```ruby
# v4
pod 'PlaytimeMonetize'

# v5
pod 'PlaytimeSDK', '5.0.0'
```

Then run `pod install` to pull the new dependency.

---

## 2. Initialization

Initialize Playtime as early as possible in the app lifecycle and wait for initialization to complete successfully before calling any other SDK method. Prefer `Application.onCreate` on Android, app launch on iOS, and app startup in React Native.

The initialization method has been renamed from `setPlaytimeOptions` to `initPlaytime`, and uses a new `InitOptions` type instead of `PlaytimeOptions`.

v5 removed implicit initialization. `initPlaytime` must complete successfully before you call any other SDK method.

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

At app start, v5 waits five seconds and then sends a lightweight session-start event for reporting. The event contains no personal user data and identifies only an anonymous user. It does not initialize or create a Playtime user.

`country` is an optional ISO 3166-1 alpha-2 code used to map a user to their reward currency. Set it only when your integration supports multiple currencies, and set it only once per user because the backend does not accept replacements. The SDK trims and uppercases the value. Invalid non-empty values cause initialization to fail with an `.sdkConfig` error.

---

## 3. Show Catalog

`showCatalog` now accepts a dedicated `CatalogOptions` object with type-safe placement and category values, instead of the generic `PlaytimeOptions`. Call `executeImpressionEvent` every time the catalog entry point becomes visible, before calling `showCatalog`.

**Before (v4):**

```swift
let options = PlaytimeOptions(sdkHash: "YOUR_SDK_HASH", userId: "user123")
try await Playtime.showCatalog(options: options)
```

**After (v5):**

```swift
try await Playtime.executeImpressionEvent(catalogPlacement: .navbar)

try await Playtime.showCatalog(
    catalogOptions: CatalogOptions(placement: .navbar, category: .gaming)
)
```

`executeImpressionEvent` measures how many users see the catalog entry point and the conversion from a placement view to a catalog open. Pass the predefined `CatalogPlacement` that describes the entry point, or use `.custom("value")` when none applies. Await it before `showCatalog` so the local impression record is ready. Analytics delivery remains fire-and-forget and does not add network delay. `showCatalog` fails if no impression call was made within the previous 30 minutes. Repeated calls safely refresh the visibility record while duplicate analytics events are suppressed. The impression placement and `CatalogOptions.placement` are independent and do not need to match.

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

If you disabled SDK warm-up in v4, you can safely remove the obsolete `isAutoInitEnabled` key from `Info.plist` and the obsolete `adjoe-playtime.plist` file; v5 no longer uses them. This cleanup is unnecessary if you never added them.

---

## 6. Type-Safe Placements

String-based placements have been replaced with type-safe enums:

```swift
// v4 — string-based
PlaytimeParams(placement: "navbar")

// v5 — type-safe enum
CatalogOptions(placement: .navbar)
```

Use the predefined placement that best describes the entry point, or use `.custom("your_value")` when none applies.

---

## 7. Status: Consolidated Getters

Individual status methods have been consolidated under `Playtime.getStatus()`:

| v4 Method               | v5 Equivalent                  |
| ----------------------- | ------------------------------ |
| `Playtime.getUserId()`  | `Playtime.getStatus().userId`  |
| `Playtime.getVersion()` | `Playtime.getStatus().version` |

```swift
// v4
let userId = Playtime.getUserId()
let version = Playtime.getVersion()

// v5
let status = try await Playtime.getStatus()
let userId = status.userId
let version = status.version
```

---

## 8. Other v5 Changes

### Removed APIs

The following APIs have been removed entirely in v5 (no replacement):

- `getCatalogIntent()` — use `showCatalog()` instead
- `sendUserEvent()` — no longer supported
- `setUAParams()` — pass UA params in `InitOptions` instead
- Legacy `init()` methods — use `initPlaytime()` instead

---

## 9. Error Handling

Error handling has been redesigned. The `PlaytimeError` enum (with ~30 associated-value cases) has been replaced by a structured `PlaytimeException` class.

**Before (v4):**

```swift
// v4 — enum with ~30 associated-value cases
do {
    try await Playtime.showCatalog(options: options)
} catch let error as PlaytimeError {
    switch error {
    case .notInitialized:
        break // handle
    case .networkError(let message):
        // handle
    // ... many more cases
    default:
        break
    }
}
```

**After (v5):**

```swift
// v5 — structured exception class
do {
    try await Playtime.showCatalog(catalogOptions: catalogOptions)
} catch let error as PlaytimeException {
    print("Code: \(error.code)")
    print("Type: \(error.errorType)")     // PlaytimeErrorType enum
    print("Message: \(error.message)")
    print("Retryable: \(error.isRetryable)")

    if error.isRetryable {
        // Safe to retry the operation
    }
} catch {
    // Any other error
}
```

`PlaytimeException` provides:

- `code: String` — machine-readable error code
- `errorType: PlaytimeErrorType` — categorized error type (`.network`, `.networkVPN`, `.api`, `.sdkConfig`, `.responseFormat`, `.unknown`)
- `isRetryable: Bool` — whether the operation can be retried
- `message: String` — human-readable description

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

| Parameter      | Type               | Required | Default   | Description                                                                                                                                      |
| -------------- | ------------------ | -------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `placement`    | `CatalogPlacement` | No       | `nil`     | Where the catalog is triggered from. See [API Reference](https://test-docs.adjoe.zone/rewarded-solutions/sdks/api-reference#catalogplacement) for predefined values, or use `.custom("value")`. |
| `category`     | `AppCategory`      | No       | `.gaming` | If omitted, the SDK uses the gaming category. Specify `.nonGaming` or `.both` to request another category selection.                             |
| `promotionTag` | `String`           | No       | `nil`     | Tag for user-level promotions. See [User Level Promos](https://test-docs.adjoe.zone/rewarded-solutions/sdks/resources/user-level-promos).                                                       |
| `metadata`     | `PlaytimeMetadata` | No       | `nil`     | Request metadata returned in S2S payouts. Contains optional `metadata1` and `metadata2` strings.                                                 |

See [CatalogPlacement and AppCategory](https://test-docs.adjoe.zone/rewarded-solutions/sdks/api-reference#option-values) for every predefined value and custom-value syntax.

## Migration Checklist

1. Update pod from `PlaytimeMonetize` to `PlaytimeSDK` version `5.0.0`
2. Replace `setPlaytimeOptions(options:)` with `initPlaytime(options: InitOptions(...))`
3. Wait for `initPlaytime` to complete before calling other SDK methods
4. Account for the anonymous session-start event sent five seconds after app start
5. Set each UA field with its intended first non-null value; later initialization or teardown cannot replace it
6. Call `executeImpressionEvent` every time the catalog entry point becomes visible
7. Replace `showCatalog(options:)` with `showCatalog(catalogOptions: CatalogOptions(...))`
8. If you disabled SDK warm-up in v4, remove `isAutoInitEnabled` and `adjoe-playtime.plist`
9. Replace string-based placements with type-safe enum values
10. Replace individual status getters (`getUserId`, `getVersion`) with `getStatus()`
11. Remove any usage of `getCatalogIntent`, `sendUserEvent`, `setUAParams`, or legacy `init()` methods
12. Update error handling from `PlaytimeError` enum to structured `PlaytimeException`
13. Build and test your integration thoroughly

---

