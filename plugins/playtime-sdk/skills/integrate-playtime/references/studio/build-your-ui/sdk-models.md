# SDK Models

> Use the tables on this page to choose the campaign and reward data you need for your custom UI.
> See your platform's Custom UI guide for SDK methods, impression tracking, and store actions.
> For SDK-managed campaign details, use the platform-specific Quick-Start Custom UI guide.

## Conventions

- A `?` in the **Type** column means the field is optional.
- **Used for** identifies whether a field is commonly used for available apps, installed
  apps, or both. Fields can still be present outside the listed view.
- An unsupported platform is omitted from the **Platforms** column.
- Arrays are non-null but can be empty.
- All timestamps are ISO 8601 strings.
- Empty optional strings and invalid or zero-date timestamps are mapped to null.
- `PlaytimeMedia` and `PlaytimePromotion` are null when all their child fields are null,
  empty, or contain invalid timestamps.
- In React Native, optional model fields use `field?: Type | null`; integer and floating-point
  values are both represented as `number`.
- React Native campaign statuses are numeric `PlaytimeCampaignStatus` enum values. Compare them
  with the exported constants instead of lowercase strings.

## Campaign Fields

These fields belong to `PlaytimeCampaign`.

| Name                    | Type                     | Platforms    | Used for       | Description                                                                  |
| ----------------------- | ------------------------ | ------------ | -------------- | ---------------------------------------------------------------------------- |
| `token`                 | `string`                 | Android, iOS | Both           | Campaign token used by SDK and wrapper integrations.                         |
| `campaignUUID`          | `string?`                | Android, iOS | Both           | Campaign UUID.                                                               |
| `appName`               | `string`                 | Android, iOS | Both           | App name.                                                                    |
| `appDescription`        | `string`                 | Android, iOS | Both           | Short description of the app.                                                |
| `appID`                 | `string`                 | Android, iOS | Both           | Unique app identifier. Android: package name. iOS: App Store ID.             |
| `appBundleID`           | `string?`                | iOS          | Both           | iOS bundle ID, for example `com.example.myapp`.                              |
| `installedAt`           | `string?`                | Android, iOS | Installed apps | App installation timestamp.                                                  |
| `uninstalledAt`         | `string?`                | Android, iOS | Installed apps | App uninstallation timestamp.                                                |
| `rewardingExpiresAfter` | `int?`                   | Android, iOS | Both           | Number of days rewards remain available after installation.                  |
| `rewardingExpiresAt`    | `string?`                | Android, iOS | Installed apps | Reward-eligibility expiration timestamp.                                     |
| `campaignExpiresAt`     | `string?`                | Android, iOS | Available apps | Latest time the campaign remains valid for installation.                     |
| `eventConfig`           | `PlaytimeEventConfig?`   | Android, iOS | Both           | Event and reward configuration.                                              |
| `appCategory`           | `string?`                | Android, iOS | Available apps | App category.                                                                |
| `campaignType`          | `string?`                | Android, iOS | Available apps | Campaign type.                                                               |
| `featuredPosition`      | `int?`                   | Android, iOS | Available apps | Ordered position for a featured campaign.                                    |
| `score`                 | `float?`                 | Android, iOS | Available apps | Campaign eCPM score.                                                         |
| `image`                 | `PlaytimeMedia?`         | Android, iOS | Both           | Campaign images. Use `portrait` or `landscape` for the required orientation. |
| `video`                 | `PlaytimeMedia?`         | Android, iOS | Both           | Campaign videos. Use `portrait` or `landscape` for the required orientation. |
| `iconImage`             | `string?`                | Android, iOS | Both           | Campaign icon URL.                                                           |
| `promotion`             | `PlaytimePromotion?`     | Android, iOS | Both           | Active promotion details.                                                    |
| `isCompleted`           | `bool`                   | Android, iOS | Installed apps | Whether all campaign rewards have been collected.                            |
| `status`                | `PlaytimeCampaignStatus` | Android, iOS | Installed apps | Current campaign installation status.                                        |
| `isCpa`                 | `bool`                   | Android, iOS | Both           | Whether CPA is enabled for the campaign. Experimental.                       |
| `cpa`                   | `float`                  | Android, iOS | Both           | Campaign CPA value. Experimental.                                            |

`PlaytimeMedia` contains optional `portrait` and `landscape` URL strings. Provide a
fallback when the requested media or orientation is absent.

> **Warning: Experimental**
>
> The `isCpa`, `cpa`, and `cpaActions` fields are not yet supported and should not be used
> in your integration.

## Promotions

Promotion details belong to `PlaytimePromotion`. Reward totals and action amounts
already include an active promotion; do not multiply them by `boostFactor` again.

| Name                   | Type      | Platforms    | Used for       | Description                                                   |
| ---------------------- | --------- | ------------ | -------------- | ------------------------------------------------------------- |
| `name`                 | `string?` | Android, iOS | Both           | Promotion name.                                               |
| `promotionDescription` | `string?` | Android, iOS | Both           | Promotion description.                                        |
| `boostFactor`          | `float?`  | Android, iOS | Both           | Direct reward multiplier, for example `2` for double rewards. |
| `startTime`            | `string?` | Android, iOS | Both           | Promotion start timestamp.                                    |
| `endTime`              | `string?` | Android, iOS | Both           | Promotion end timestamp.                                      |
| `targetingType`        | `string?` | Android, iOS | Available apps | Promotion targeting metadata.                                 |

Use the current and original values in each reward section to show the promotion. Only
show an original value when it is present and lower than the current value. Promotions
do not apply to cashback or time-boosted reward values.

Check `promotion.targetingType` to determine which promotion type the SDK returned and use it to
drive the UI. Known values include `AdvertiserLevel`, `UserLevel`, and `AllUsers`; provide a generic
fallback for unknown values. Reward amounts already include the promotion.

## Sequential Rewards

Sequential actions are the main reward milestones. Present them in the order returned by
the SDK.

| Field                                      | Type                          | Platforms    | Used for       | Description                                                      |
| ------------------------------------------ | ----------------------------- | ------------ | -------------- | ---------------------------------------------------------------- |
| `eventConfig.sequentialActions`            | `array: PlaytimeRewardAction` | Android, iOS | Both           | Ordered sequential reward actions.                               |
| `action.name`                              | `string?`                     | Android, iOS | Both           | Reward action name.                                              |
| `action.taskDescription`                   | `string?`                     | Android, iOS | Both           | Task instructions or description.                                |
| `action.taskType`                          | `string`                      | Android, iOS | Both           | Reward type such as `sequential`, `bonus`, `playtime`, or `cpa`. |
| `action.amount`                            | `int`                         | Android, iOS | Both           | Current reward amount, including an active promotion.            |
| `action.originalCoins`                     | `int?`                        | Android, iOS | Both           | Reward amount without a promotion.                               |
| `action.rewardedAt`                        | `string?`                     | Android, iOS | Installed apps | Reward-granted timestamp.                                        |
| `eventConfig.totalSequentialCoins`         | `int?`                        | Android, iOS | Both           | Sequential reward total including a promotion.                   |
| `eventConfig.totalOriginalSequentialCoins` | `int?`                        | Android, iOS | Both           | Sequential reward total without a promotion.                     |

## Bonus Rewards

Bonus actions are additional reward opportunities outside the ordered sequential
progression.

| Field                                 | Type                          | Platforms    | Used for       | Description                                           |
| ------------------------------------- | ----------------------------- | ------------ | -------------- | ----------------------------------------------------- |
| `eventConfig.bonusActions`            | `array: PlaytimeRewardAction` | Android, iOS | Both           | Bonus reward actions.                                 |
| `action.name`                         | `string?`                     | Android, iOS | Both           | Reward action name.                                   |
| `action.taskDescription`              | `string?`                     | Android, iOS | Both           | Task instructions or description.                     |
| `action.amount`                       | `int`                         | Android, iOS | Both           | Current reward amount, including an active promotion. |
| `action.originalCoins`                | `int?`                        | Android, iOS | Both           | Reward amount without a promotion.                    |
| `action.rewardedAt`                   | `string?`                     | Android, iOS | Installed apps | Reward-granted timestamp.                             |
| `eventConfig.totalBonusCoins`         | `int?`                        | Android, iOS | Both           | Bonus reward total including a promotion.             |
| `eventConfig.totalOriginalBonusCoins` | `int?`                        | Android, iOS | Both           | Bonus reward total without a promotion.               |

## Repeatable Rewards

Repeatability is an optional capability of a sequential or bonus action, not a separate
action collection. Show repeatable progress when `rewardsCount` is greater than one.

| Field                     | Type      | Platforms    | Used for       | Description                                                                   |
| ------------------------- | --------- | ------------ | -------------- | ----------------------------------------------------------------------------- |
| `action.rewardsCount`     | `int?`    | Android, iOS | Both           | Maximum number of times the action can reward.                                |
| `action.completedRewards` | `int?`    | Android, iOS | Installed apps | Number of completed repetitions.                                              |
| `action.amount`           | `int`     | Android, iOS | Both           | Reward for each completion.                                                   |
| `action.rewardedAt`       | `string?` | Android, iOS | Installed apps | Most recent reward timestamp. Use the repetition counts for overall progress. |

## Time-Based Rewards

> **Warning: Android only**
>
> Time-based rewards are supported on Android only. Do not build an iOS UI that depends on
> these fields.

| Field                            | Type                          | Platforms | Used for       | Description                                        |
| -------------------------------- | ----------------------------- | --------- | -------------- | -------------------------------------------------- |
| `eventConfig.timeBasedActions`   | `array: PlaytimeRewardAction` | Android   | Both           | Playtime reward milestones.                        |
| `action.name`                    | `string?`                     | Android   | Both           | Reward action name.                                |
| `action.playDuration`            | `int?`                        | Android   | Both           | Required play duration in seconds.                 |
| `action.level`                   | `int?`                        | Android   | Both           | Time-based milestone level.                        |
| `action.amount`                  | `int`                         | Android   | Both           | Reward for completing the milestone.               |
| `action.rewardedAt`              | `string?`                     | Android   | Installed apps | Reward-granted timestamp.                          |
| `eventConfig.secondsToNextLevel` | `int?`                        | Android   | Installed apps | Seconds remaining until the next time-based level. |

## Time-Boosted Rewards

Time-boosted rewards offer a higher reward for completing a sequential or bonus action
within a limited window. They are separate from Android-only time-based rewards.

| Field                           | Type      | Platforms    | Used for       | Description                                             |
| ------------------------------- | --------- | ------------ | -------------- | ------------------------------------------------------- |
| `action.isTimed`                | `bool?`   | Android, iOS | Both           | Whether the action has a time boost.                    |
| `action.timedCoins`             | `int?`    | Android, iOS | Both           | Reward available during the boost window.               |
| `action.originalCoins`          | `int?`    | Android, iOS | Both           | Standard reward without the time boost.                 |
| `action.timedCoinsDuration`     | `int?`    | Android, iOS | Both           | Boost window in minutes.                                |
| `action.boosterExpiresAt`       | `string?` | Android, iOS | Installed apps | Boost expiration timestamp after installation.          |
| `action.rewardedAt`             | `string?` | Android, iOS | Installed apps | Reward-granted timestamp.                               |
| `action.isRewardedForPromotion` | `bool?`   | Android, iOS | Installed apps | Whether the action was rewarded as part of a promotion. |

Campaign promotions do not apply to time-boosted reward values.

> **Warning: Do not use isTimed for detection**
>
> Until [DC-1440](https://adjoe.atlassian.net/browse/DC-1440) is resolved, `isTimed` can be null or
> false for an action that has a time boost. Detect a boost with `timedCoins != null && timedCoins > 0`.
> Use `timedCoinsDuration` or `boosterExpiresAt` only for the displayed time window or deadline.

## Cashback Rewards

Cashback uses its own model tree. Hide this section in your UI when
`eventConfig.cashbackReward` is null.

| Field                               | Type                                 | Platforms    | Used for       | Description                                    |
| ----------------------------------- | ------------------------------------ | ------------ | -------------- | ---------------------------------------------- |
| `eventConfig.cashbackReward`        | `PlaytimeCashbackConfig?`            | Android, iOS | Both           | Cashback configuration and progress.           |
| `cashback.exchangeRate`             | `float?`                             | Android, iOS | Both           | Coins rewarded per 1 USD spent.                |
| `cashback.cashbackDescription`      | `string?`                            | Android, iOS | Both           | Cashback instructions or description.          |
| `cashback.maxLimitPerCampaignUSD`   | `float?`                             | Android, iOS | Both           | Maximum eligible spend in USD.                 |
| `cashback.maxLimitPerCampaignCoins` | `float?`                             | Android, iOS | Both           | Maximum cashback reward in coins.              |
| `cashback.completedRewards`         | `PlaytimeCashbackReward?`            | Android, iOS | Installed apps | Completed cashback reward group.               |
| `cashback.pendingRewards`           | `PlaytimeCashbackReward?`            | Android, iOS | Installed apps | Pending cashback reward group.                 |
| `rewardGroup.totalCoins`            | `int?`                               | Android, iOS | Installed apps | Total coins in the completed or pending group. |
| `rewardGroup.events`                | `array: PlaytimeCashbackRewardEvent` | Android, iOS | Installed apps | Individual events in the reward group.         |
| `event.coins`                       | `int?`                               | Android, iOS | Installed apps | Coins granted for the event.                   |
| `event.processAt`                   | `string?`                            | Android, iOS | Installed apps | Timestamp when the event is processed.         |
| `event.receivedAt`                  | `string?`                            | Android, iOS | Installed apps | Timestamp when the event is received.          |

Cashback attribution can be delayed. Treat `pendingRewards` as processing and keep it separate from
`completedRewards`; pending coins have not completed processing and must not be shown as collected.
Use `receivedAt` to communicate when an event was received and `processAt` for its processing time
when available. Refresh installed campaigns so pending rewards can transition to completed.
Campaign promotions do not apply to cashback values.

## Reward Totals

Use these `PlaytimeEventConfig` fields for campaign-level earning potential and progress.

| Field                        | Type   | Platforms    | Used for       | Description                                            |
| ---------------------------- | ------ | ------------ | -------------- | ------------------------------------------------------ |
| `totalCoinsCollected`        | `int?` | Android, iOS | Installed apps | Total coins collected.                                 |
| `totalCoinsPossible`         | `int?` | Android, iOS | Both           | Maximum possible coins, including an active promotion. |
| `totalOriginalCoinsPossible` | `int?` | Android, iOS | Both           | Maximum possible coins without a promotion.            |

`PlaytimeEventConfig` also exposes `cpaActions` and `multipliersActions`. A
`PlaytimeRewardActionMultiplier` can include `eventName`, `eventDescription`,
`multiplierFactorPercentage`, `multiplierLevels`, `status`, and `usedLevels`.

## Campaign Status

`PlaytimeCampaignStatus` describes installation lifecycle, while `isCompleted` describes
reward completion. Treat them as separate states.

| Value       | Platforms    | Used for       | Description                                        |
| ----------- | ------------ | -------------- | -------------------------------------------------- |
| `available` | Android, iOS | Installed apps | Campaign is available for installation.            |
| `pending`   | Android, iOS | Installed apps | Campaign is waiting for installation confirmation. |
| `installed` | Android, iOS | Installed apps | Campaign installation was confirmed.               |
| `failed`    | Android, iOS | Installed apps | Campaign installation or processing failed.        |

In React Native, use the exported numeric enum constants:

```ts
campaign.status === PlaytimeCampaignStatus.AVAILABLE;
campaign.status === PlaytimeCampaignStatus.PENDING;
campaign.status === PlaytimeCampaignStatus.INSTALLED;
campaign.status === PlaytimeCampaignStatus.FAILED;
```
