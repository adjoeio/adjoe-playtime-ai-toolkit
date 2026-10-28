# Build the Components

> Use these Flutter widget recipes after fetching campaigns with the
> [Advanced Custom UI SDK guide](use-sdk-flutter.md). They map [SDK Models](../sdk-models.md) to
> focused Flutter UI. Keep SDK calls outside visual widgets and retain each unmodified
> campaign, or its Offer API token and app ID, for tracking and actions.

> **Important: Treat the SDK response as the source of truth**
>
> These recipes are starter layouts. Use any available icon, image, or video, provide a fallback,
> and adapt the UI to the publisher's design system. See
> [SDK Models](https://test-docs.adjoe.zone/rewarded-solutions/sdks/studio/build-your-ui/studio/build-your-ui/sdk-models) for all fields.
>
> Render every supported reward type returned by the SDK. Because `totalCoinsPossible` includes
> those rewards, show how the user earns the displayed total. Hide a reward component only when its
> response data is absent or empty, and do not recalculate SDK reward values.

```dart
import 'package:adjoe/sdk.dart';
import 'package:flutter/material.dart';
```

## New Offers

**Models and fields:** `PlaytimeCampaign.appName`, `iconImage`, `eventConfig`, and
`eventConfig.totalCoinsPossible`.

```dart
Widget newOfferCard(PlaytimeCampaign campaign) {
  final possible = campaign.eventConfig?.totalCoinsPossible;
  return Column(
    children: [
      if (campaign.iconImage != null) Image.network(campaign.iconImage!),
      Text(campaign.appName),
      if (possible != null) Text('Earn up to $possible coins'),
    ],
  );
}
```

Preserve SDK order and report a `DEFAULT` impression when the full card is visible.

## Installed Offers

**Models and fields:** `PlaytimeCampaign.status`, `isCompleted`, `eventConfig.totalCoinsCollected`,
and `eventConfig.totalCoinsPossible`.

```dart
Widget installedOfferCard(PlaytimeCampaign campaign) {
  final collected = campaign.eventConfig?.totalCoinsCollected ?? 0;
  final possible = campaign.eventConfig?.totalCoinsPossible;
  return Column(
    children: [
      Text(campaign.appName),
      Text('$collected coins collected'),
      if (possible != null) Text('${((collected / possible) * 100).round()}% complete'),
      if (campaign.isCompleted) const Text('All rewards completed'),
      if (campaign.status == PlaytimeCampaignStatus.INSTALLED) const Text('Ready to play'),
    ],
  );
}
```

Use enum constants, not lowercase status strings. Add interactions using the methods described in
[Use the SDK](use-sdk-flutter.md).

## Promotions

**Models and fields:** `PlaytimeCampaign.promotion`, `promotion.boostFactor`, `targetingType`,
`eventConfig.totalCoinsPossible`, and `eventConfig.totalOriginalCoinsPossible`.

```dart
Widget? promotionTotal(PlaytimeCampaign campaign) {
  final current = campaign.eventConfig?.totalCoinsPossible;
  final original = campaign.eventConfig?.totalOriginalCoinsPossible;
  if (campaign.promotion == null || current == null) return null;

  final label = <String, String>{
        'AdvertiserLevel': 'Advertiser promotion',
        'UserLevel': 'Special promotion',
        'AllUsers': 'Promotion',
      }[campaign.promotion?.targetingType ?? ''] ??
      campaign.promotion?.name ??
      'Reward boost';

  return Column(
    children: [
      Text(label),
      if (original != null && original < current)
        Text('$original -> $current coins')
      else
        Text('$current coins'),
    ],
  );
}
```

Check `targetingType` in the SDK response to identify the applied promotion and drive the UI. Use a
generic fallback for unknown values. Current amounts already include promotions; never multiply
them by `boostFactor` again. See [User Level Promos](https://test-docs.adjoe.zone/rewarded-solutions/sdks/resources/user-level-promos) for
`promotionTag` setup and [Advertiser-Level Promotions](../offer-api.md#advertiser-level-promotions-alp)
for additional ALP guidance.

## Event-Based Rewards

**Models and fields:** `eventConfig.sequentialActions`, `name`, `taskDescription`, `amount`,
`originalCoins`, and `rewardedAt`.

```dart
Widget sequentialRewards(PlaytimeCampaign campaign) {
  final actions = campaign.eventConfig?.sequentialActions ?? [];
  return Column(
    children: [
      for (var i = 0; i < actions.length; i++)
        Column(
          children: [
            Text('${actions[i]?.rewardedAt != null ? '✓' : i + 1} '
                '${actions[i]?.name ?? 'Reward milestone'}'),
            Text('${actions[i]?.amount} coins'),
          ],
        ),
    ],
  );
}
```

Render the actions in SDK order.

## Time-Based Rewards (Android Only)

**Models and fields:** `eventConfig.timeBasedActions`, `secondsToNextLevel`, `playDuration`,
`level`, `amount`, and `rewardedAt`.

```dart
import 'dart:io' show Platform;

Widget? timeBasedRewards(PlaytimeCampaign campaign) {
  if (!Platform.isAndroid) return null;
  final actions = campaign.eventConfig?.timeBasedActions ?? [];
  return Column(
    children: [
      for (final action in actions)
        Text('${action?.name ?? 'Level ${action?.level ?? ''}'}: '
            '${action?.playDuration ?? 0}s · ${action?.amount} coins'),
    ],
  );
}
```

Both durations use seconds. Guard this UI by platform; iOS does not support time-based rewards.

## Bonus Rewards

**Models and fields:** `eventConfig.bonusActions`, `name`, `taskDescription`, `amount`, and
`rewardedAt`.

```dart
Widget? bonusRewards(PlaytimeCampaign campaign) {
  final actions = campaign.eventConfig?.bonusActions ?? [];
  if (actions.isEmpty) return null;
  return Column(
    children: [
      const Text('Bonus rewards'),
      for (final action in actions)
        Text('${action?.name ?? 'Bonus reward'} · ${action?.amount} coins'),
    ],
  );
}
```

Keep bonus actions separate from sequential progression.

## Repeatable Rewards

**Models and fields:** `PlaytimeRewardAction.rewardsCount`, `completedRewards`, and `amount`.

```dart
Widget? repeatableProgress(PlaytimeRewardAction action) {
  final target = action.rewardsCount;
  if (target == null || target <= 1) return null;
  final completed = (action.completedRewards ?? 0).clamp(0, target);
  return Text('$completed of $target completed · ${action.amount} coins each');
}
```

Repeatability belongs to sequential or bonus actions.

## Cashback

**Models and fields:** `eventConfig.cashbackReward`, `exchangeRate`,
`maxLimitPerCampaignCoins`, `pendingRewards`, `completedRewards`, reward `events`, `coins`,
`receivedAt`, and `processAt`.

```dart
Widget? cashbackSection(PlaytimeCampaign campaign) {
  final cashback = campaign.eventConfig?.cashbackReward;
  if (cashback == null) return null;

  return Column(
    children: [
      const Text('Cashback'),
      if (cashback.cashbackDescription != null) Text(cashback.cashbackDescription!),
      if (cashback.exchangeRate != null) Text('${cashback.exchangeRate} coins per USD'),
      Text('Processing: ${cashback.pendingRewards?.totalCoins ?? 0} coins'),
      for (final event in cashback.pendingRewards?.events ?? [])
        Column(
          children: [
            Text('${event?.coins ?? 0} coins - processing'),
            if (event?.processAt != null) Text('Expected processing: ${event?.processAt}'),
          ],
        ),
      Text('Completed: ${cashback.completedRewards?.totalCoins ?? 0} coins'),
    ],
  );
}
```

Cashback attribution can be delayed. Show `pendingRewards` as processing and keep it separate from
`completedRewards`; never present pending coins as collected. `receivedAt` indicates when an event
was received and `processAt` indicates its processing time. Refresh installed campaigns so the UI
can move rewards from processing to completed. Hide the section only when the model is absent.
Promotions do not apply to cashback.

## Time-Boosted Rewards

**Models and fields:** `PlaytimeRewardAction.timedCoins`, `originalCoins`,
`timedCoinsDuration`, and `boosterExpiresAt`.

```dart
Widget? timeBoost(PlaytimeRewardAction action) {
  final timed = action.timedCoins;
  if (timed == null || timed <= 0) return null;
  return Column(
    children: [
      Text('Limited-time boost: $timed coins'),
      if (action.timedCoinsDuration != null)
        Text('Complete within ${action.timedCoinsDuration} minutes'),
      if (action.boosterExpiresAt != null) Text('Boost expires: ${action.boosterExpiresAt}'),
    ],
  );
}
```

Prefer `boosterExpiresAt` after installation. Promotions do not apply to timed values.

## Pending Installs

**Models and fields:** `PlaytimeCampaign.status` and `PlaytimeCampaignStatus`.

```dart
Widget installationStatus(PlaytimeCampaign campaign) {
  switch (campaign.status) {
    case PlaytimeCampaignStatus.PENDING:
      return const Text('Verifying installation...');
    case PlaytimeCampaignStatus.INSTALLED:
      return const Text('Installed - keep playing');
    case PlaytimeCampaignStatus.FAILED:
      return const Text('Not eligible for rewards');
    default:
      return const Text('Available to install');
  }
}
```

Pending campaigns come from `getInstalledCampaigns`. Refresh on app foreground or user action;
do not poll continuously.
