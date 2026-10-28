# Visual Guide

> Studio is a dynamic way to build and customize gaming experiences in your app. Our SDK has been optimized and unified so that integrating with iOS, Android, or cross-platform frameworks is easier than ever.

Below are guidelines for building your own UI. The models are shared across platforms, though there are slight syntax differences when calling SDK methods.

For a full implementation, check out our [example apps](https://test-docs.adjoe.zone/rewarded-solutions/sdks/studio/examples).

---

## Build Your Own UI

Fetch campaigns and render them in your own interface.

Best For

Full control over UI/UX
Custom and "Native" Feel
Advanced monetization optimization

Considerations

Considerable engineering effort

**Step 1. Create a Catalog**

1. Call `PlaytimeStudio.getCampaigns()`
2. Use field `iconImage` to display the icon image of the app.
3. Use `totalCoinsPossible` to display the maximum amount of rewards available per game.
4. Call `PlaytimeStudio.openInStore()` to take the user to the App Store to install the game.
5. Use `appName` to display the name of the app.
6. Call `PlaytimeStudio.executeCampaignImpression` with the platform's `DEFAULT` impression type when the entire campaign card is visible in the viewport. If you are using the [Offer API](../offer-api.md), call `PlaytimeStudio.executeOfferImpression` instead, using the `appID` and `token` from the API response.

---

**Step 2. Show Installed Campaigns**

1. Call `PlaytimeStudio.getInstalledCampaigns()`
2. Use `iconImage` to display the icon image of the app.
3. Use `appName` to display the name of the app.
4. Use `totalCoinsPossible` to display the maximum amount of rewards available per game.

**Promotions**: Use the `PlaytimePromotion` class to show when there is a promotion. The promotion must be enabled through the Monetize Dashboard first.

5. The `promotion.boostFactor` is used determine reward multiplication (e.g., factor of 2 doubles rewards).
6. `totalCoinsPossible` and `amount` are already multiplied by the boost factor.

---

**Step 3. Show the Offer Details**

Depending on the source, use the response from `PlaytimeStudio.getCampaigns()` or `PlaytimeStudio.getInstalledCampaigns()`.

1. Use `image` to display the landscape image.
2. Use `iconImage` for the app icon.
3. Use `appName` for the app name.
4. Use `rewardingExpiresAt` to show the eligibility deadline.
5. Use `totalCoinsPossible` for total rewards available.
6. Use `appDescription` for app details.
7. From `playtimeRewardAction`, use `name` for the event description and `amount` for the coins available.
8. Call `PlaytimeStudio.openInStore()` for new installs or `PlaytimeStudio.openInstalledCampaign()` for existing ones.
9. Call `PlaytimeStudio.executeCampaignImpression` with the platform's `ENGAGED`
   impression type only when the user opens a game details page that you built from
   scratch. No dashboard configuration is required. The managed `showCampaignDetails`
   and `showOfferDetails` deeplink/webview flows send this impression automatically.

**For Time-based Games:**

- Use `playDuration` for required play duration in seconds. Convert it to a user-friendly
  duration before displaying it.
- Use `level` for the time-based milestone.

**Repeatable Milestones:**

- Use `rewardsCount` for repetition limits.

**For Installed Games:**

- Use `rewardedAt` for completion status.
- Use `isCompleted` to indicate all levels are done.

---

**Step 4. Time Boosted Milestones**

Use `PlaytimeRewardAction` to get required values:

1. `timedCoins`: Boosted reward amount. Show the boost only when this value is greater than zero.
2. `timedCoinsDuration`: Minutes remaining to complete the level.
3. `originalCoins`: Standard reward amount without the booster.

**Optional fields:**

- `boosterExpiresAt`: Deadline for boosted rewards (available after install).

**Note:** Promotions do not apply to time-boosted milestones.

---

**Step 5. Cashback**

Use `PlaytimeCashbackConfig`:

1. `exchangeRate`: Coins rewarded per $1 spent.
2. `maxLimitPerCampaignCoins`: Total available cashback (`exchangeRate` × `maxLimitPerCampaignUSD`).

**Post-Purchase Fields:**

3. `pendingRewards` (`PlaytimeCashbackReward`): Rewards received but still processing.
4. `completedRewards` (`PlaytimeCashbackReward`): Rewards that completed processing (`totalCoins`).
5. `PlaytimeCashbackRewardEvent.coins`: Reward amount for an individual event.
6. `PlaytimeCashbackRewardEvent.receivedAt`: When the transaction was received.
7. `PlaytimeCashbackRewardEvent.processAt`: When the transaction is or was processed.

**Notes:**

- Promotions do not apply to cashback.
- UI should account for repeatable actions.
- Cashback attribution can be delayed. Display pending rewards as **processing**, separately from
  completed rewards, and never include them in a collected or completed amount. Show `processAt`
  when available and refresh installed campaigns so processing rewards can move to completed.
- If missing from the model, ensure Cashback is enabled for your app in the Monetize Dashboard.

---

**Step 6. Pending Install Flow**

The SDK handles pending install tracking automatically. After `openInStore(campaign)` is called:

1. The campaign is marked as `pending` and moves from `getCampaigns()` to `getInstalledCampaigns()`
2. The backend confirms the install (typically ~10 min) — status transitions to `installed` or `failed`
3. Call `getInstalledCampaigns()` to refresh (e.g. on app foreground or pull-to-refresh). No polling needed.

Use `campaign.status` to drive your UI:

| Status      | UI                                                        |
| ----------- | --------------------------------------------------------- |
| `pending`   | "Verifying installation..." with loading indicator        |
| `installed` | Normal installed campaign (progress, rewards, "Play now") |
| `failed`    | "Not eligible for rewards" or retry option                |

In React Native, compare `campaign.status` with `PlaytimeCampaignStatus.PENDING`, `.INSTALLED`,
and `.FAILED` rather than lowercase strings.
