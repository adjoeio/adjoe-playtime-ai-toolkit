# Migrate to v5

> Follow this guide to migrate a React Native Catalog integration from v4.5.2 to v5. The v5 bridge uses Promise-based methods and separates initialization options from catalog options.

---

## 1. Dependency Changes

Update the React Native package from v4.5.2 to v5.0.0:

```bash
npm install --save https://github.com/adjoeio/adjoe-react-native-sdk#v5.0.0
```

React Native autolinking configures the native modules. After changing the package, install the iOS pods:

```bash
npx pod-install
```

Update the explicit Android and iOS native dependencies as described in
[Get Started](https://test-docs.adjoe.zone/rewarded-solutions/sdks/getting-started-react-native/). Confirm that Android resolves
`io.adjoe:adjoe-sdk-android:5.0.0` and iOS resolves `PlaytimeSDK` 5.0.0. Clean and
rebuild both native apps after the upgrade; a JavaScript reload does not install the
new native module.

---

## 2. Initialization

Initialize Playtime as early as possible in the app lifecycle and wait for initialization to complete successfully before calling any other SDK method. Prefer `Application.onCreate` on Android, app launch on iOS, and app startup in React Native.

Replace `setPlaytimeOptions` and the v4 `PlaytimeOptions` object with `initPlaytime(options)` and initialization-specific fields.

v5 removed implicit initialization. The `initPlaytime` Promise must resolve before you call any other SDK method.

**Before (v4.5.2):**

```ts
const options = {
  sdkHash: 'YOUR_SDK_HASH',
  userId: 'user_123',
  country: 'DE',
};

await Playtime.setPlaytimeOptions(options);
```

**After (v5):**

```ts
await Playtime.initPlaytime({
  sdkHash: 'YOUR_SDK_HASH',
  userId: 'user_123',
  country: 'DE',
});
```

At app start, v5 waits five seconds and then sends a lightweight session-start event for reporting. The event contains no personal user data and identifies only an anonymous user. It does not initialize or create a Playtime user.

`country` is an optional ISO 3166-1 alpha-2 code used to map a user to their reward currency. Set it only when your integration supports multiple currencies, and set it only once per user because the backend does not accept replacements. The SDK trims and uppercases the value. Invalid non-empty values cause initialization to fail.

---

## 3. Show Catalog

Replace `showCatalogWithOptions` with `showCatalog`. Pass only catalog presentation fields to the new method. Call `executeImpressionEvent` every time the catalog entry point becomes visible, before calling `showCatalog`.

**Before (v4.5.2):**

```ts
await Playtime.showCatalogWithOptions({
  sdkHash: 'YOUR_SDK_HASH',
  userId: 'user_123',
  placement: 'navbar',
});
```

**After (v5):**

```ts
import { AppCategory, CatalogPlacement } from 'react-native-adjoe-sdk';

await Playtime.executeImpressionEvent(CatalogPlacement.Navbar);

await Playtime.showCatalog({
  placement: CatalogPlacement.Navbar,
  category: AppCategory.GAMING,
});
```

`executeImpressionEvent` measures how many users see the catalog entry point and the conversion from a placement view to a catalog open. Pass the predefined `CatalogPlacement` that describes the entry point, or use a custom string when none applies. Await it before `showCatalog` so the local impression record is ready. Analytics delivery remains fire-and-forget and does not add network delay. `showCatalog` fails if no impression call was made within the previous 30 minutes. Repeated calls safely refresh the visibility record while duplicate analytics events are suppressed. The impression placement and the placement passed to `showCatalog` are independent and do not need to match.

Initialize with `sdkHash` and `userId` before calling `showCatalog`. Do not continue passing those fields as catalog options.

---

## 4. Options Restructuring

The v4 `PlaytimeOptions` object mixed SDK identity, user acquisition, and catalog presentation fields. In v5, split it into two calls:

| v4.5.2 `PlaytimeOptions` field             | v5 location                      |
| ------------------------------------------ | -------------------------------- |
| `sdkHash`, `userId`                        | `Playtime.initPlaytime(options)` |
| `language`, user profile, extensions       | `Playtime.initPlaytime(options)` |
| `uaNetwork`, `uaChannel`, `uaCampaignName` | `Playtime.initPlaytime(options)` |
| `placement`, `category`, `promotionTag`    | `Playtime.showCatalog(options)`  |

`PlaytimeParams` is removed entirely. All UA parameters (`uaNetwork`, `uaChannel`, `uaCampaignName`) now belong to the initialization options. Placement belongs to the catalog options.

Each UA field transitions independently from `null` to its first non-null value. Once the backend records a non-null value for a field, it cannot be cleared or changed. Later `initPlaytime` calls, including calls after `teardown`, do not replace it.

---

## 5. Remove v4 Auto-Initialization Configuration

If you disabled SDK warm-up in v4, you can safely remove the obsolete native configuration; v5 no longer uses it. This cleanup is unnecessary if you never added it:

- Android: remove the `io.adjoe.Playtime.AUTO_INIT_ENABLED` `<meta-data>` entry from `AndroidManifest.xml`.
- iOS: remove the `isAutoInitEnabled` key from `Info.plist` and the obsolete `adjoe-playtime.plist` file.

---

## 6. Type-Safe Placements

Use the predefined `CatalogPlacement` constants included with v5. You can also pass a
plain string for a custom placement.

```ts
import { AppCategory, CatalogPlacement } from 'react-native-adjoe-sdk';

await Playtime.showCatalog({
  placement: CatalogPlacement.Navbar,
  category: AppCategory.GAMING,
});
```

---

## 7. Status: Consolidated Getters

Replace individual v4 status getters with one Promise-based `getStatus()` call:

| v4.5.2 getter               | v5 equivalent                                |
| --------------------------- | -------------------------------------------- |
| `Playtime.getUserId()`      | `(await Playtime.getStatus()).userId`        |
| `Playtime.getVersion()`     | `(await Playtime.getStatus()).version`       |
| `Playtime.isInitialized()`  | `(await Playtime.getStatus()).isInitialized` |
| `Playtime.hasAcceptedTOS()` | `(await Playtime.getStatus()).isTosAccepted` |

Fetch the status once when reading multiple values:

```ts
const status = await Playtime.getStatus();
const { userId, version, isInitialized, isTosAccepted } = status;
```

---

## 8. Other v5 Changes

### Reward Notifications

Reward notifications are disabled by default in v5. If you want to use them, contact your Technical Account Manager (TAM) to have the configuration enabled.

### Removed APIs

The following v4 APIs have been removed entirely in v5:

- `getCatalogIntent()` — use `showCatalog()` instead
- `sendUserEvent()` — no longer supported
- `setUAParams()` — pass UA parameters to `initPlaytime()` instead
- Legacy `init()` methods — use `initPlaytime()` instead

---

## 9. Error Handling

All bridge APIs return Promises and normalize rejected native promises to
`PlaytimeException`. Use the package's exported type guard before reading structured
fields.

```ts
import {
  AppCategory,
  CatalogPlacement,
  isPlaytimeException,
} from 'react-native-adjoe-sdk';

try {
  await Playtime.showCatalog({
    placement: CatalogPlacement.Navbar,
    category: AppCategory.GAMING,
  });
} catch (error: unknown) {
  if (isPlaytimeException(error)) {
    console.warn(error.code, error.errorType, error.message);
    if (error.isRetryable) {
      // Offer a controlled retry.
    }
  } else {
    console.warn('Unexpected Playtime error', error);
  }
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

| Parameter      | Type             | Required | Default              | Description                                                                                                                           |
| -------------- | ---------------- | -------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `placement`    | CatalogPlacement | No       | `nil`/`null`         | Where the catalog is triggered from. Use predefined values (`Navbar`, `Icon`, `EarnTab`, `GameTab`, `HomePage`) or `Custom("value")`. |
| `category`     | AppCategory      | No       | `AppCategory.GAMING` | If omitted, the SDK uses the gaming category. Specify `NON_GAMING` or `BOTH` to request another category selection.                   |
| `promotionTag` | String           | No       | `nil`/`null`         | Tag to filter campaigns by promotion                                                                                                  |
| `metadata`     | PlaytimeMetadata | No       | `null`               | Request metadata returned in S2S payouts. Contains optional `metadata1` and `metadata2` strings.                                      |

See [CatalogPlacement and AppCategory](https://test-docs.adjoe.zone/rewarded-solutions/sdks/api-reference#option-values) for every predefined value. Any other placement string is treated as custom.

## Migration Checklist

1. Update `react-native-adjoe-sdk` from v4.5.2 to v5.0.0.
2. Replace `setPlaytimeOptions` with `initPlaytime`.
3. Wait for `initPlaytime` to resolve before calling other SDK methods.
4. Account for the anonymous session-start event sent five seconds after app start.
5. Call `executeImpressionEvent` every time the catalog entry point becomes visible.
6. Replace `showCatalogWithOptions` with `showCatalog`.
7. Split `PlaytimeOptions` into initialization and catalog options, including moving UA fields to initialization.
8. Set each UA field with its intended first non-null value; later initialization or teardown cannot replace it.
9. If you disabled SDK warm-up in v4, remove the obsolete Android and iOS native configuration.
10. Contact your TAM if you want reward notifications enabled on Android.
11. Use the v5 placement constants and provide the required catalog category.
12. Replace individual status getters with `await Playtime.getStatus()`.
13. Remove calls to APIs removed in v5.
14. Use `isPlaytimeException` for rejected Promise values.
15. Verify autolinking, Android SDK 5.0.0 resolution, and `PlaytimeSDK` 5.0.0 pod resolution.
16. Confirm iOS App Attest is enabled and Debug and Release entitlements use the `production` environment.
17. Build new Android and iOS binaries, then test initialization, `getStatus()`, the catalog, and `teardown()` outside Expo Go.

---

