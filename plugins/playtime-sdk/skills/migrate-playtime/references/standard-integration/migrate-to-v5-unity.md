# Migrate to v5

Follow this guide to migrate a Unity Catalog integration from v4 to v5. Version 5
separates initialization options from catalog options and uses explicit asynchronous
initialization. The methods keep the `onSuccess` and `onError` callback style.

---

## 1. Dependency Changes

Import the Playtime SDK 5.0.0 `.unitypackage` as described in
[Get Started](https://test-docs.adjoe.zone/rewarded-solutions/sdks/getting-started-unity/), then run the External Dependency Manager to
resolve the native dependencies. Confirm that Android resolves
`io.adjoe:adjoe-sdk-android:5.0.0` and iOS resolves `PlaytimeSDK` 5.0.0. Rebuild both
player targets after the upgrade.

The namespace is unchanged:

```csharp
using io.adjoe.sdk;
```

---

## 2. Initialization

Initialize Playtime as early as possible and wait for the success callback before calling
any other SDK method.

Replace the v4 `SetPlaytimeOptions` call and the combined `PlaytimeOptions` object with
`InitPlaytime(InitOptions)`. v5 removed implicit initialization.

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
    .SetUserId("user_123");

Playtime.InitPlaytime(
    options,
    () => Debug.Log("Playtime initialized."),
    error => Debug.Log(error.Message));
```

At app start, v5 waits five seconds and then sends a lightweight session-start event for
reporting. The event contains no personal user data and identifies only an anonymous
user. It does not initialize or create a Playtime user.

> **Note: No country field**
>
> The Unity `InitOptions` does not expose a `country` field.

---

## 3. Show Catalog

In v4, placement and user-acquisition values were passed to `ShowCatalogWithOptions` or
`SetUAParams` through `PlaytimeOptions` and `PlaytimeParams`. In v5, UA fields move to
`InitOptions` and placement moves to `CatalogOptions`. v5 also adds a required
`ExecuteImpressionEvent` call: run it every time the catalog entry point becomes visible,
before calling `ShowCatalog`.

**Before (v4):**

```csharp
Playtime.ShowCatalogWithOptions(
    options,
    () => Debug.Log("Catalog launched."),
    error => Debug.Log(error.Message));
```

**After (v5):**

```csharp
Playtime.ExecuteImpressionEvent(
    CatalogPlacement.Navbar,
    () => Debug.Log("Impression recorded."),
    error => Debug.Log(error.Message));

CatalogOptions catalogOptions = new CatalogOptions()
    .SetPlacement(CatalogPlacement.Navbar)
    .SetCategory(AppCategory.GAMING);

Playtime.ShowCatalog(
    catalogOptions,
    () => Debug.Log("Catalog launched."),
    error => Debug.Log(error.Message));
```

`ExecuteImpressionEvent` measures how many users see the catalog entry point and the
conversion from a placement view to a catalog open. Pass the predefined `CatalogPlacement`
that describes the entry point, or use `CatalogPlacement.Custom` when none applies. Call it
before `ShowCatalog` so the local impression record is ready. Analytics delivery stays
fire-and-forget and does not add network delay. `ShowCatalog` fails with
`IMPRESSION_NOT_EXECUTED` if no impression call was made within the previous 30 minutes.
Repeated calls safely refresh the visibility record while duplicate analytics events are
suppressed. The impression placement and the placement passed to `ShowCatalog` are
independent and do not need to match.

Keep the launch button disabled while the catalog is being presented.

---

## 4. Options Restructuring

The v4 `PlaytimeOptions` and `PlaytimeParams` objects mixed SDK identity, user
acquisition, and catalog presentation fields. In v5, split them into two calls:

| v4 field                                       | v5 location                      |
| ---------------------------------------------- | -------------------------------- |
| `sdkHash`, `userId`                            | `Playtime.InitPlaytime(options)` |
| `language`, user profile, extensions           | `Playtime.InitPlaytime(options)` |
| `uaNetwork`, `uaChannel` (`PlaytimeParams`)    | `Playtime.InitPlaytime(options)` |
| `placement`, `promotionTag` (`PlaytimeParams`) | `Playtime.ShowCatalog(options)`  |

`PlaytimeParams` and the `SetUAParams` method are removed. All UA parameters now belong to
the initialization options. Placement belongs to the catalog options.

Each UA field transitions independently from null to its first non-null value. Once the
backend records a non-null value for a field, it cannot be cleared or changed. Later
`InitPlaytime` calls, including calls after `Teardown`, do not replace it.

---

## 5. Type-Safe Placements

Use the predefined `CatalogPlacement` values included with v5. You can also pass a custom
value through `CatalogPlacement.Custom`.

```csharp
CatalogOptions options = new CatalogOptions()
    .SetPlacement(CatalogPlacement.Navbar)
    .SetCategory(AppCategory.GAMING);
```

---

## 6. Status: Consolidated Getter

Replace the individual v4 getters with one `GetStatus` call:

| v4 getter                 | v5 equivalent          |
| ------------------------- | ---------------------- |
| `Playtime.GetUserID(...)` | `status.UserId`        |
| version getters           | `status.Version`       |
| initialization getters    | `status.IsInitialized` |
| TOS getters               | `status.IsTosAccepted` |

```csharp
Playtime.GetStatus(
    status =>
    {
        Debug.Log($"{status.UserId} {status.Version} {status.IsInitialized}");
    },
    error => Debug.Log(error.Message));
```

---

## 7. Error Handling

v4 callbacks received a plain `Exception`. In v5, the `onError` callback receives a
structured `PlaytimeException`:

```csharp
void OnError(PlaytimeException error)
{
    Debug.Log($"{error.ErrorType} {error.Code} {error.Message}");
    // Retry only when error.IsRetryable is true.
}
```

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

### CatalogOptions

Build `CatalogOptions` with the fluent setters. All fields are optional.

| Setter            | Type               | Default              | Description                                                                                                                                                                                   |
| ----------------- | ------------------ | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SetPlacement`    | `CatalogPlacement` | unset                | Where the catalog is triggered from. Use a predefined value (`CatalogPlacement.Navbar`, `CatalogPlacement.Icon`, `CatalogPlacement.EarnTab`, and more) or `CatalogPlacement.Custom("value")`. |
| `SetCategory`     | `AppCategory`      | `AppCategory.GAMING` | If omitted, the SDK uses the gaming category. Pass `AppCategory.NON_GAMING` or `AppCategory.BOTH` for another selection.                                                                      |
| `SetPromotionTag` | `string`           | unset                | Tag used to filter campaigns by promotion.                                                                                                                                                    |

See [CatalogPlacement and AppCategory](https://test-docs.adjoe.zone/rewarded-solutions/sdks/api-reference#option-values) for every predefined value. Any value passed through `Custom` is treated as custom.

## Migration Checklist

1. Import the Playtime SDK 5.0.0 `.unitypackage` and resolve the native dependencies.
2. Replace `SetPlaytimeOptions` with `InitPlaytime(InitOptions)`.
3. Wait for the `InitPlaytime` success callback before calling other SDK methods.
4. Account for the anonymous session-start event sent five seconds after app start.
5. Move UA fields to `InitOptions` and placement to `CatalogOptions`; `PlaytimeParams` and `SetUAParams` are removed.
6. Set each UA field with its intended first non-null value; later initialization or teardown cannot replace it.
7. Call `ExecuteImpressionEvent` every time the catalog entry point becomes visible, before `ShowCatalog`.
8. Replace `ShowCatalogWithOptions` with `ShowCatalog(CatalogOptions)`.
9. Use the v5 placement values and provide the catalog category.
10. Replace individual getters with `GetStatus`.
11. Read `PlaytimeException` fields in `onError` and retry only retryable failures.
12. Confirm Android SDK 5.0.0 resolution and `PlaytimeSDK` 5.0.0 pod resolution.
13. Confirm iOS App Attest uses the `production` environment for Debug and Release builds.
14. Rebuild new Android and iOS player targets, then test initialization, `GetStatus`, the catalog, and `Teardown`.

---

