# Build the Components

Use these Jetpack Compose recipes after fetching campaigns with the
[Advanced Custom UI SDK guide](use-sdk-android.md). They map the fields documented in
[SDK Models](../sdk-models.md) to focused UI components. Keep SDK calls such as fetching,
impression tracking, and store actions outside reusable visual components, and pass the
unmodified `PlaytimeCampaign` back to those actions.

The snippets assume standard Compose imports and an image loader such as Coil's `AsyncImage`.

> **Important: Treat the SDK response as the source of truth**
>
> These recipes are starter layouts. Use any available icon, image, or video, provide a fallback,
> and adapt the UI to the publisher's design system. See
> [SDK Models](https://test-docs.adjoe.zone/rewarded-solutions/sdks/studio/build-your-ui/studio/build-your-ui/sdk-models) for all fields.
>
> Render every supported reward type returned by the SDK. Because `totalCoinsPossible` includes
> those rewards, show how the user earns the displayed total. Hide a reward component only when its
> response data is absent or empty, and do not recalculate SDK reward values.

## New Offers

**Models and fields:** `PlaytimeCampaign.appName`, `PlaytimeCampaign.iconImage`,
`PlaytimeCampaign.eventConfig`, `PlaytimeEventConfig.totalCoinsPossible`.

```kotlin
@Composable
fun NewOfferCard(campaign: PlaytimeCampaign) {
    Column(Modifier.fillMaxWidth().padding(16.dp)) {
        AsyncImage(campaign.iconImage, campaign.appName, Modifier.size(64.dp))
        Text(campaign.appName, style = MaterialTheme.typography.titleMedium)
        campaign.eventConfig?.totalCoinsPossible?.let { Text("Earn up to $it coins") }
    }
}
```

Preserve the SDK order. Track a `DEFAULT` impression when the entire card is visible, as
described in [Use the SDK](use-sdk-android.md#track-default-and-engaged-impressions).

## Installed Offers

**Models and fields:** `PlaytimeCampaign.status`, `PlaytimeCampaign.isCompleted`,
`PlaytimeEventConfig.totalCoinsCollected`, `PlaytimeEventConfig.totalCoinsPossible`.

```kotlin
@Composable
fun InstalledOfferCard(campaign: PlaytimeCampaign) {
    val config = campaign.eventConfig
    val collected = config?.totalCoinsCollected ?: 0
    val possible = config?.totalCoinsPossible

    Column(Modifier.fillMaxWidth().padding(16.dp)) {
        Text(campaign.appName, style = MaterialTheme.typography.titleMedium)
        Text("$collected coins collected")
        if (possible != null && possible > 0) {
            LinearProgressIndicator(
                progress = { (collected.toFloat() / possible).coerceIn(0f, 1f) }
            )
        }
        if (campaign.isCompleted) Text("All rewards completed")
        if (campaign.status == PlaytimeCampaignStatus.INSTALLED) Text("Ready to play")
    }
}
```

`status` describes installation; `isCompleted` describes reward completion. Treat them as
separate states. Add interactions using the methods described in [Use the SDK](use-sdk-android.md).

## Promotions

**Models and fields:** `PlaytimeCampaign.promotion`, `PlaytimePromotion.boostFactor`, `targetingType`,
`PlaytimeEventConfig.totalCoinsPossible`, `PlaytimeEventConfig.totalOriginalCoinsPossible`.

```kotlin
@Composable
fun PromotionTotal(campaign: PlaytimeCampaign) {
    val promotion = campaign.promotion ?: return
    val config = campaign.eventConfig ?: return
    val current = config.totalCoinsPossible ?: return
    val original = config.totalOriginalCoinsPossible
    val label = when (promotion.targetingType) {
        "AdvertiserLevel" -> "Advertiser promotion"
        "UserLevel" -> "Special promotion"
        "AllUsers" -> "Promotion"
        else -> promotion.name ?: "Reward boost"
    }

    Column {
        Text(label)
        promotion.boostFactor?.let { Text("${it}× rewards") }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            if (original != null && original < current) {
                Text("$original", textDecoration = TextDecoration.LineThrough)
            }
            Text("$current coins")
        }
    }
}
```

Check `targetingType` in the SDK response to identify the applied promotion and drive the UI. Use a
generic fallback for unknown values. Current amounts already include the promotion; never multiply
them by `boostFactor` again. See [User Level Promos](https://test-docs.adjoe.zone/rewarded-solutions/sdks/resources/user-level-promos) for
`promotionTag` setup and [Advertiser-Level Promotions](../offer-api.md#advertiser-level-promotions-alp)
for additional ALP guidance.

## Event-Based Rewards

**Models and fields:** `PlaytimeEventConfig.sequentialActions`,
`PlaytimeRewardAction.name`, `taskDescription`, `amount`, `originalCoins`, and `rewardedAt`.

```kotlin
@Composable
fun SequentialRewards(campaign: PlaytimeCampaign) {
    Column {
        campaign.eventConfig?.sequentialActions.orEmpty().forEachIndexed { index, action ->
            ListItem(
                headlineContent = { Text(action.name ?: "Milestone ${index + 1}") },
                supportingContent = { action.taskDescription?.let { Text(it) } },
                leadingContent = { Text(if (action.rewardedAt != null) "✓" else "${index + 1}") },
                trailingContent = { Text("${action.amount} coins") }
            )
        }
    }
}
```

Render sequential actions in the order returned by the SDK.

## Time-Based Rewards

**Models and fields:** `PlaytimeEventConfig.timeBasedActions`, `secondsToNextLevel`,
`PlaytimeRewardAction.playDuration`, `level`, `amount`, and `rewardedAt`.

```kotlin
@Composable
fun TimeBasedRewards(campaign: PlaytimeCampaign) {
    val config = campaign.eventConfig ?: return
    if (config.timeBasedActions.isEmpty()) return

    Column {
        config.secondsToNextLevel?.let { Text("Next reward in ${formatSeconds(it)}") }
        config.timeBasedActions.forEach { action ->
            ListItem(
                headlineContent = { Text(action.name ?: "Level ${action.level ?: ""}") },
                supportingContent = { Text(action.playDuration?.let(::formatSeconds) ?: "Play") },
                trailingContent = { Text("${action.amount} coins") }
            )
        }
    }
}

private fun formatSeconds(seconds: Int): String = "${seconds / 60} min"
```

`playDuration` and `secondsToNextLevel` are seconds. Time-based rewards are Android-only and
require usage access.

## Bonus Rewards

**Models and fields:** `PlaytimeEventConfig.bonusActions`, `PlaytimeRewardAction.name`,
`taskDescription`, `amount`, and `rewardedAt`.

```kotlin
@Composable
fun BonusRewards(campaign: PlaytimeCampaign) {
    val actions = campaign.eventConfig?.bonusActions.orEmpty()
    if (actions.isEmpty()) return

    Column {
        Text("Bonus rewards", style = MaterialTheme.typography.titleMedium)
        actions.forEach { action ->
            ListItem(
                headlineContent = { Text(action.name ?: "Bonus reward") },
                supportingContent = { action.taskDescription?.let { Text(it) } },
                trailingContent = { Text("${action.amount} coins") }
            )
        }
    }
}
```

Keep bonus rewards separate from the ordered sequential progression.

## Repeatable Rewards

**Models and fields:** `PlaytimeRewardAction.rewardsCount`, `completedRewards`, and `amount`.

```kotlin
@Composable
fun RepeatableProgress(action: PlaytimeRewardAction) {
    val target = action.rewardsCount ?: return
    if (target <= 1) return
    val completed = (action.completedRewards ?: 0).coerceIn(0, target)

    Column {
        Text("$completed of $target completed")
        LinearProgressIndicator(progress = { completed.toFloat() / target })
        Text("${action.amount} coins per completion")
    }
}
```

Repeatability belongs to a sequential or bonus action; it is not a separate action list.

## Cashback

**Models and fields:** `PlaytimeEventConfig.cashbackReward`, `PlaytimeCashbackConfig.exchangeRate`,
`maxLimitPerCampaignCoins`, `pendingRewards`, `completedRewards`, `PlaytimeCashbackReward.events`,
and `PlaytimeCashbackRewardEvent.coins`, `receivedAt`, and `processAt`.

```kotlin
@Composable
fun CashbackSection(campaign: PlaytimeCampaign) {
    val cashback = campaign.eventConfig?.cashbackReward ?: return

    Column {
        Text("Cashback", style = MaterialTheme.typography.titleMedium)
        cashback.cashbackDescription?.let { Text(it) }
        cashback.exchangeRate?.let { Text("Earn $it coins per USD spent") }
        cashback.maxLimitPerCampaignCoins?.let { Text("Earn up to $it coins") }
        CashbackGroup("Processing", cashback.pendingRewards, isPending = true)
        CashbackGroup("Completed", cashback.completedRewards)
    }
}

@Composable
private fun CashbackGroup(
    label: String,
    reward: PlaytimeCashbackReward?,
    isPending: Boolean = false
) {
    if (reward == null || reward.events.isEmpty()) return
    Text("$label: ${reward.totalCoins ?: 0} coins")
    reward.events.forEach { event ->
        Text("${event.coins ?: 0} coins${if (isPending) " — processing" else ""}")
        if (isPending) event.processAt?.let { Text("Expected processing: $it") }
    }
}
```

Cashback attribution can be delayed. Show `pendingRewards` as processing and keep it separate from
`completedRewards`; never present pending coins as collected. `receivedAt` indicates when an event
was received and `processAt` indicates its processing time. Refresh installed campaigns so the UI
can move rewards from processing to completed. Hide this section only when `cashbackReward` is
null. Promotions do not apply to cashback.

## Time-Boosted Rewards

**Models and fields:** `PlaytimeRewardAction.timedCoins`, `originalCoins`,
`timedCoinsDuration`, and `boosterExpiresAt`.

```kotlin
@Composable
fun TimeBoost(action: PlaytimeRewardAction) {
    val boosted = action.timedCoins?.takeIf { it > 0 } ?: return

    Column {
        Text("Limited-time boost")
        Text("$boosted coins")
        action.originalCoins?.let { Text("Standard reward: $it coins") }
        action.timedCoinsDuration?.let { Text("Complete within $it minutes") }
        action.boosterExpiresAt?.let { Text("Boost expires: $it") }
    }
}
```

For installed campaigns, prefer `boosterExpiresAt` as the actual deadline. Promotions do not
apply to time-boosted values.

## Pending Installs

**Models and fields:** `PlaytimeCampaign.status` and `PlaytimeCampaignStatus`.

```kotlin
@Composable
fun InstallationStatus(campaign: PlaytimeCampaign) {
    when (campaign.status) {
        PlaytimeCampaignStatus.PENDING -> Text("Verifying installation…")
        PlaytimeCampaignStatus.INSTALLED -> Text("Installed — keep playing")
        PlaytimeCampaignStatus.FAILED -> Text("Not eligible for rewards")
        PlaytimeCampaignStatus.AVAILABLE -> Text("Available to install")
    }
}
```

Pending campaigns are returned by `getInstalledCampaigns`. Refresh when the app returns to the
foreground or on pull-to-refresh; do not poll continuously.
