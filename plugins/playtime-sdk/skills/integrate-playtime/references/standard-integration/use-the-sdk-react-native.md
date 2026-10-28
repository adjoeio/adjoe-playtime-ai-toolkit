# Use the SDK

> This guide covers the Standard React Native integration flow for displaying the
> Playtime catalog. The v5 bridge is Promise-based, so call its methods with `await` and
> handle rejected promises.

Import the types and constants from the package. The declarations shipped with
`react-native-adjoe-sdk@5.0.0` are the source of truth.

## Initialize the SDK

Import the native module and initialize it early so it can fetch campaign data. Select
the SDK hash for the current native platform; never reuse a hash from another
application or platform.

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

```ts
import { Platform } from 'react-native';
import Playtime, { AppCategory, CatalogPlacement } from 'react-native-adjoe-sdk';

const sdkHash = Platform.select({
  android: 'YOUR_ANDROID_SDK_HASH',
  ios: 'YOUR_IOS_SDK_HASH',
});

if (!sdkHash) {
  throw new Error('Playtime is supported only on Android and iOS.');
}

await Playtime.initPlaytime({
  sdkHash,
  userId: 'user_123',
});
```

`userId` is required before displaying the catalog. If the user is not known at app
startup, initialize again with the user ID after login and before calling
`showCatalog`.

Optional profile and extension data use the exported React Native types:

```ts
import { PlaytimeGender, type InitOptions } from 'react-native-adjoe-sdk';

const options: InitOptions = {
  sdkHash,
  userId: 'user_123',
  userProfile: {
    gender: PlaytimeGender.FEMALE,
    birthday: '1990-05-15',
  },
  extensions: {
    subId1: 'partner_user_123',
  },
  language: 'en',
  country: 'DE',
  uaNetwork: 'network',
  uaChannel: 'channel',
  uaCampaignName: 'campaign',
};
```

`extensions` supports `subId1` through `subId5`. Profile birthdays are ISO 8601 strings.

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

Use `getStatus()` after initialization to verify that campaigns are available:

```ts
const status = await Playtime.getStatus();

if (status.isInitialized && status.details.campaignsAvailable) {
  // The catalog can be shown.
}
```

An initialized SDK can still report no campaigns because of targeting, app
configuration, device eligibility, or temporary inventory. Use the typed values in
`status.details.campaignsState` to determine why campaigns are unavailable. The React
Native bridge exposes numeric `PlaytimeCampaignsState` enum values, so use constants
such as `PlaytimeCampaignsState.VPN_DETECTED` instead of comparing strings.

`PlaytimeStatus` provides information about the SDK state and whether campaigns are available for a user.

**Fields:**

| Field                        | Type    | Description                                             |
| ---------------------------- | ------- | ------------------------------------------------------- |
| `version`                    | String  | SDK version string                                      |
| `isInitialized`              | Boolean | Whether `initPlaytime` has completed successfully       |
| `userId`                     | String? | The userId passed in `InitOptions`                      |
| `isTosAccepted`              | Boolean | Whether the user has accepted Terms of Service          |
| `isUsagePermissionAccepted`  | Boolean | Whether usage data permission is granted (Android only) |
| `details.isFraud`            | Boolean | Whether the user is flagged as potentially fraudulent   |
| `details.campaignsAvailable` | Boolean | Primary signal for whether to show campaigns            |
| `details.campaignsState`     | List    | Why campaigns are unavailable (see below)               |
| `details.testGroup`          | Int?    | A/B test group identifier                               |

**Campaign States:**

| State                           | Description                                           |
| ------------------------------- | ----------------------------------------------------- |
| `READY` / `.ready`              | Campaigns are available and can be shown              |
| `BLOCKED` / `.blocked`          | User is blocked from seeing campaigns                 |
| `VPN_DETECTED` / `.vpnDetected` | A VPN was detected; campaigns are unavailable         |
| `GEO_MISMATCH` / `.geoMismatch` | User's location doesn't match the app's target region |

> **Note: Test users**
>
> Test users can still get campaigns from `getCampaigns()` while `campaignsAvailable` is `false`, for example in a blocked or mismatched country. This happens only for test users. For real users, `campaignsAvailable` is reliable.

> **Warning**
>
> The `isFraud` flag is purely informational. Do not hide campaigns based on fraud status — the SDK already manages the experience for flagged users.

## Record the Placement Impression

Call `executeImpressionEvent` every time the button or placement that opens the catalog becomes visible. Await it before `showCatalog` so the local impression record is available before the catalog checks it. Analytics delivery remains fire-and-forget, so this does not add network delay.

This required step records how many users see the catalog entry point so you can measure conversion from placement views to catalog opens. Pass the predefined `CatalogPlacement` that describes the entry point, or use a custom string when none applies.

```ts
await Playtime.executeImpressionEvent(CatalogPlacement.Navbar);
```

The Promise resolves after the impression is recorded locally and does not wait for
analytics delivery. `showCatalog` fails if `executeImpressionEvent` has not been called
within the previous 30 minutes. Repeated calls safely refresh the visibility record
while duplicate analytics events are suppressed. The placement passed here and the
placement in `showCatalog` are independent and do not need to match.

## Show the Catalog

Pass catalog-specific options to `showCatalog`:

```ts
await Playtime.showCatalog({
  placement: CatalogPlacement.Navbar,
  category: AppCategory.GAMING,
});
```

Keep the launch button disabled while the native catalog is being presented to prevent
duplicate presentations.

### CatalogOptions Parameters

| Parameter      | Type             | Required | Default              | Description                                                                                                                           |
| -------------- | ---------------- | -------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `placement`    | CatalogPlacement | No       | `nil`/`null`         | Where the catalog is triggered from. Use predefined values (`Navbar`, `Icon`, `EarnTab`, `GameTab`, `HomePage`) or `Custom("value")`. |
| `category`     | AppCategory      | No       | `AppCategory.GAMING` | If omitted, the SDK uses the gaming category. Specify `NON_GAMING` or `BOTH` to request another category selection.                   |
| `promotionTag` | String           | No       | `nil`/`null`         | Tag to filter campaigns by promotion                                                                                                  |
| `metadata`     | PlaytimeMetadata | No       | `null`               | Request metadata returned in S2S payouts. Contains optional `metadata1` and `metadata2` strings.                                      |

See [CatalogPlacement and AppCategory](https://test-docs.adjoe.zone/rewarded-solutions/sdks/api-reference#option-values) for every predefined value. Any other placement string is treated as custom.

## Handle Errors

The wrapper normalizes rejected native promises to `PlaytimeException`. Use the
exported type guard before reading structured fields:

```ts
import {
  AppCategory,
  CatalogPlacement,
  isPlaytimeException,
  PlaytimeErrorType,
} from 'react-native-adjoe-sdk';

try {
  await Playtime.showCatalog({
    placement: CatalogPlacement.Navbar,
    category: AppCategory.GAMING,
  });
} catch (error: unknown) {
  if (isPlaytimeException(error)) {
    console.warn(error.code, error.errorType, error.isRetryable, error.message);
  } else {
    console.warn('Unexpected Playtime error', error);
  }
}
```

Retry only when `isRetryable` is `true`. Ask the user to disable a VPN for
`PlaytimeErrorType.NETWORK_VPN`; verify integration options for
`PlaytimeErrorType.SDK_CONFIG`; and report persistent
`PlaytimeErrorType.RESPONSE_FORMAT` or `PlaytimeErrorType.UNKNOWN` errors to adjoe.

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

Release SDK state when the current user signs out or when you need to reset the
integration:

```ts
await Playtime.teardown();
```

Use `teardown()` to deinitialize the SDK and release all internal resources. Call this when the user logs out or when Playtime is no longer needed in the current session.

> **Warning**
>
> After calling `teardown()`, you must call `initPlaytime` again before using any other SDK method.
> Teardown does not replace UA values already recorded by the backend.

## Set Up Server-to-Server Payouts

Finally, set up [Server-to-Server (S2S) payouts](https://test-docs.adjoe.zone/rewarded-solutions/setting-up-rewarding/server-to-server-payouts) so your backend can receive payout callbacks and distribute rewards to users.

## Complete Example

```tsx
import React, { useEffect, useState } from 'react';
import { Button, Platform, Text, View } from 'react-native';
import Playtime, {
  AppCategory,
  CatalogPlacement,
  isPlaytimeException,
} from 'react-native-adjoe-sdk';

export default function RewardsScreen() {
  const [ready, setReady] = useState(false);
  const [impressionRecorded, setImpressionRecorded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Loading rewards...');

  useEffect(() => {
    let active = true;

    async function initializePlaytime() {
      try {
        const sdkHash = Platform.select({
          android: 'YOUR_ANDROID_SDK_HASH',
          ios: 'YOUR_IOS_SDK_HASH',
        });

        if (!sdkHash) {
          throw new Error('Playtime is supported only on Android and iOS.');
        }

        await Playtime.initPlaytime({
          sdkHash,
          userId: 'user_123',
        });

        const status = await Playtime.getStatus();
        if (active) {
          setReady(status.isInitialized && status.details.campaignsAvailable);
          setMessage(
            status.details.campaignsAvailable
              ? 'Rewards are ready.'
              : 'No campaigns are available right now.',
          );
        }
      } catch (error: unknown) {
        if (active) {
          setMessage(
            isPlaytimeException(error)
              ? error.message
              : 'Playtime initialization failed.',
          );
        }
      }
    }

    void initializePlaytime();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    async function recordImpression() {
      try {
        await Playtime.executeImpressionEvent(CatalogPlacement.Navbar);
        setImpressionRecorded(true);
      } catch (error: unknown) {
        setMessage(
          isPlaytimeException(error) ? error.message : 'Could not record placement view.',
        );
      }
    }

    void recordImpression();
  }, [ready]);

  async function openCatalog() {
    setBusy(true);
    try {
      await Playtime.showCatalog({
        placement: CatalogPlacement.Navbar,
        category: AppCategory.GAMING,
      });
    } catch (error: unknown) {
      setMessage(isPlaytimeException(error) ? error.message : 'Could not open rewards.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View>
      <Text>{message}</Text>
      <Button
        title={busy ? 'Opening...' : 'Open rewards'}
        disabled={!ready || !impressionRecorded || busy}
        onPress={() => void openCatalog()}
      />
    </View>
  );
}
```

## API Reference

See the [Playtime API Reference](https://test-docs.adjoe.zone/rewarded-solutions/sdks/api-reference) for option values and platform API links.

## Verification Checklist

1. Use the Android and iOS SDK hashes only in their corresponding native builds.
2. Await `initPlaytime` before calling another SDK method.
3. Initialize again with `userId` if it was unavailable at app startup.
4. Confirm `getStatus` reports `isInitialized` and the intended user ID.
5. Use `details.campaignsAvailable` as the primary availability signal.
6. Inspect `details.campaignsState` when campaigns are unavailable.
7. Record an impression every time the catalog entry point becomes visible.
8. Await the local impression before opening the catalog.
9. Pass only presentation fields in the catalog options.
10. Prevent duplicate catalog presentations while a launch is in progress.
11. Handle every `PlaytimeException` field and retry only retryable failures.
12. Call `teardown` on logout and initialize again before the next use.
13. Test initialization, status, impression refresh, catalog presentation, errors, and
    teardown on physical Android and iOS devices.
