# Build the Components

> Use this reference after fetching campaigns with the
> [Advanced Custom UI SDK guide](use-sdk-unity.md). It maps [SDK Models](../sdk-models.md) to the
> `PlaytimeCampaign` properties you bind to your own Unity UI (prefabs, UGUI, or TextMeshPro
> elements). Read the model properties in your controller script and set them on the UI objects you
> built. Keep SDK calls outside the view objects and retain each unmodified campaign, or its Offer
> API token and app ID, for tracking and actions.

> **Important: Treat the SDK response as the source of truth**
>
> These recipes are starter layouts. Use any available icon, image, or video, provide a fallback,
> and adapt the UI to the publisher's design system. See
> [SDK Models](https://test-docs.adjoe.zone/rewarded-solutions/sdks/studio/build-your-ui/studio/build-your-ui/sdk-models) for all fields.
>
> Render every supported reward type returned by the SDK. Because `totalCoinsPossible` includes
> those rewards, show how the user earns the displayed total. Hide a reward component only when its
> response data is absent or empty, and do not recalculate SDK reward values.

```csharp
using io.adjoe.sdk;
using io.adjoe.sdk.studio;
```

## New Offers

**Models and properties:** `PlaytimeCampaign.AppName`, `IconImage`, `EventConfig`, and
`EventConfig.TotalCoinsPossible`.

```csharp
void BindNewOffer(PlaytimeCampaign campaign)
{
    appNameLabel.text = campaign.AppName;
    int? possible = campaign.EventConfig?.TotalCoinsPossible;
    rewardLabel.text = possible != null ? $"Earn up to {possible} coins" : "";
    // Load campaign.IconImage into your image component.
}
```

Preserve SDK order and report a `DEFAULT` impression when the full card is visible.

## Installed Offers

**Models and properties:** `PlaytimeCampaign.Status`, `IsCompleted`, `EventConfig.TotalCoinsCollected`,
and `EventConfig.TotalCoinsPossible`.

```csharp
void BindInstalledOffer(PlaytimeCampaign campaign)
{
    int collected = campaign.EventConfig?.TotalCoinsCollected ?? 0;
    int? possible = campaign.EventConfig?.TotalCoinsPossible;

    appNameLabel.text = campaign.AppName;
    collectedLabel.text = $"{collected} coins collected";
    if (possible != null)
    {
        progressLabel.text = $"{Mathf.RoundToInt((float)collected / possible.Value * 100)}% complete";
    }
    completedLabel.gameObject.SetActive(campaign.IsCompleted);
    readyLabel.gameObject.SetActive(campaign.Status == PlaytimeCampaignStatus.INSTALLED);
}
```

Compare against enum constants, not lowercase status strings. Add interactions using the methods
described in [Use the SDK](use-sdk-unity.md).

## Promotions

**Models and properties:** `PlaytimeCampaign.Promotion`, `Promotion.BoostFactor`, `TargetingType`,
`EventConfig.TotalCoinsPossible`, and `EventConfig.TotalOriginalCoinsPossible`.

```csharp
void BindPromotion(PlaytimeCampaign campaign)
{
    int? current = campaign.EventConfig?.TotalCoinsPossible;
    int? original = campaign.EventConfig?.TotalOriginalCoinsPossible;
    if (campaign.Promotion == null || current == null)
    {
        promotionRoot.SetActive(false);
        return;
    }

    string label = campaign.Promotion.TargetingType switch
    {
        "AdvertiserLevel" => "Advertiser promotion",
        "UserLevel" => "Special promotion",
        "AllUsers" => "Promotion",
        _ => campaign.Promotion.Name ?? "Reward boost",
    };

    promotionLabel.text = label;
    totalLabel.text = (original != null && original < current)
        ? $"{original} -> {current} coins"
        : $"{current} coins";
}
```

Check `TargetingType` in the SDK response to identify the applied promotion and drive the UI. Use a
generic fallback for unknown values. Current amounts already include promotions; never multiply
them by `BoostFactor` again. See [User Level Promos](https://test-docs.adjoe.zone/rewarded-solutions/sdks/resources/user-level-promos) for
`promotionTag` setup and [Advertiser-Level Promotions](../offer-api.md#advertiser-level-promotions-alp)
for additional ALP guidance.

## Event-Based Rewards

**Models and properties:** `EventConfig.SequentialActions`, `Name`, `TaskDescription`, `Amount`,
`OriginalCoins`, and `RewardedAt`.

```csharp
void BindSequentialRewards(PlaytimeCampaign campaign)
{
    PlaytimeRewardAction[] actions = campaign.EventConfig?.SequentialActions ?? new PlaytimeRewardAction[0];
    for (int i = 0; i < actions.Length; i++)
    {
        string marker = actions[i].RewardedAt != null ? "✓" : (i + 1).ToString();
        // Instantiate a milestone row and set:
        //   $"{marker} {actions[i].Name ?? "Reward milestone"}" and $"{actions[i].Amount} coins"
    }
}
```

Render the actions in SDK order.

## Time-Based Rewards (Android Only)

**Models and properties:** `EventConfig.TimeBasedActions`, `SecondsToNextLevel`, `PlayDuration`,
`Level`, `Amount`, and `RewardedAt`.

```csharp
void BindTimeBasedRewards(PlaytimeCampaign campaign)
{
#if UNITY_ANDROID
    foreach (PlaytimeRewardAction action in campaign.EventConfig?.TimeBasedActions ?? new PlaytimeRewardAction[0])
    {
        string name = action.Name ?? $"Level {action.Level}";
        // Row text: $"{name}: {action.PlayDuration ?? 0}s · {action.Amount} coins"
    }
#endif
}
```

Both durations use seconds. Guard this UI by platform; iOS does not support time-based rewards.

## Bonus Rewards

**Models and properties:** `EventConfig.BonusActions`, `Name`, `TaskDescription`, `Amount`, and
`RewardedAt`.

```csharp
void BindBonusRewards(PlaytimeCampaign campaign)
{
    PlaytimeRewardAction[] actions = campaign.EventConfig?.BonusActions ?? new PlaytimeRewardAction[0];
    bonusRoot.SetActive(actions.Length > 0);
    foreach (PlaytimeRewardAction action in actions)
    {
        // Row text: $"{action.Name ?? "Bonus reward"} · {action.Amount} coins"
    }
}
```

Keep bonus actions separate from sequential progression.

## Repeatable Rewards

**Models and properties:** `PlaytimeRewardAction.RewardsCount`, `CompletedRewards`, and `Amount`.

```csharp
string RepeatableProgress(PlaytimeRewardAction action)
{
    int? target = action.RewardsCount;
    if (target == null || target <= 1) return null;
    int completed = Mathf.Clamp(action.CompletedRewards ?? 0, 0, target.Value);
    return $"{completed} of {target} completed · {action.Amount} coins each";
}
```

Repeatability belongs to sequential or bonus actions.

## Cashback

**Models and properties:** `EventConfig.CashbackReward`, `ExchangeRate`,
`MaxLimitPerCampaignCoins`, `PendingRewards`, `CompletedRewards`, reward `Events`, `Coins`,
`ReceivedAt`, and `ProcessAt`.

```csharp
void BindCashback(PlaytimeCampaign campaign)
{
    PlaytimeCashbackConfig cashback = campaign.EventConfig?.CashbackReward;
    if (cashback == null)
    {
        cashbackRoot.SetActive(false);
        return;
    }

    descriptionLabel.text = cashback.CashbackDescription ?? "";
    rateLabel.text = cashback.ExchangeRate != null ? $"{cashback.ExchangeRate} coins per USD" : "";
    processingLabel.text = $"Processing: {cashback.PendingRewards?.TotalCoins ?? 0} coins";
    completedLabel.text = $"Completed: {cashback.CompletedRewards?.TotalCoins ?? 0} coins";

    foreach (PlaytimeCashbackRewardEvent ev in cashback.PendingRewards?.Events ?? new PlaytimeCashbackRewardEvent[0])
    {
        // Row text: $"{ev.Coins ?? 0} coins - processing" and, when ev.ProcessAt != null,
        //   $"Expected processing: {ev.ProcessAt}"
    }
}
```

Cashback attribution can be delayed. Show `PendingRewards` as processing and keep it separate from
`CompletedRewards`; never present pending coins as collected. `ReceivedAt` indicates when an event
was received and `ProcessAt` indicates its processing time. Refresh installed campaigns so the UI
can move rewards from processing to completed. Hide the section only when the model is absent.
Promotions do not apply to cashback.

## Time-Boosted Rewards

**Models and properties:** `PlaytimeRewardAction.TimedCoins`, `OriginalCoins`,
`TimedCoinsDuration`, and `BoosterExpiresAt`.

```csharp
void BindTimeBoost(PlaytimeRewardAction action)
{
    int? timed = action.TimedCoins;
    boostRoot.SetActive(timed != null && timed > 0);
    if (timed == null || timed <= 0) return;

    boostLabel.text = $"Limited-time boost: {timed} coins";
    if (action.TimedCoinsDuration != null)
    {
        durationLabel.text = $"Complete within {action.TimedCoinsDuration} minutes";
    }
    if (action.BoosterExpiresAt != null)
    {
        expiryLabel.text = $"Boost expires: {action.BoosterExpiresAt}";
    }
}
```

Prefer `BoosterExpiresAt` after installation. Promotions do not apply to timed values.

## Pending Installs

**Models and properties:** `PlaytimeCampaign.Status` and `PlaytimeCampaignStatus`.

```csharp
string InstallationStatus(PlaytimeCampaign campaign)
{
    return campaign.Status switch
    {
        PlaytimeCampaignStatus.PENDING => "Verifying installation...",
        PlaytimeCampaignStatus.INSTALLED => "Installed - keep playing",
        PlaytimeCampaignStatus.FAILED => "Not eligible for rewards",
        _ => "Available to install",
    };
}
```

Pending campaigns come from `GetInstalledCampaigns`. Refresh on app foreground or user action;
do not poll continuously.
