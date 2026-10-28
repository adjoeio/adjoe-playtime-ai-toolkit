# Best Practices

## Initialization

- Call `initPlaytime` as early as possible in your app's lifecycle (e.g., `Application.onCreate` on Android, app launch on iOS). The SDK does not initialize implicitly, and initialization must complete successfully before any other SDK method is called.
- Use a **stable, persistent `userId`** for correct reward attribution. If your app has accounts, use the backend user ID. For anonymous users, generate a UUID once and persist it locally. Never use PII (email, phone).
- Ensure `sdkHash` matches your adjoe Dashboard configuration exactly — a mismatch prevents initialization.
- The backend records `uaNetwork`, `uaChannel`, and `uaCampaignName` independently. Each can change from `null` to its first non-null value. After that, the same value is harmless, but the field cannot change to `null` or a different value. Teardown and re-initialization do not replace recorded backend values.
- Keep all string parameters (userId, placement, UA params, extension sub-IDs) URL-safe. Avoid `&`, `=`, `?`, `#`, or spaces.

## Performance

- **Prefetch campaigns** before rendering UI — call `getCampaigns` in the background shortly after initialization so data is ready when the user opens your offer screen.
- Design your UI for **async updates**: show skeleton placeholders first, then populate when campaign data arrives. Never show a blank screen or unresponsive spinner.
- Call `getCampaigns` early (e.g., in your root view or main activity) to eliminate perceived load time when users navigate to offers.

## Custom UI

These practices apply to both Quick-Start Custom UI and Advanced Custom UI. Treat each SDK
campaign response as the source of truth and adapt the presentation to your app's design system
and placement needs. You can use any icon, portrait or landscape image, or portrait or landscape
video returned by the SDK. Always provide a fallback because a selected creative or orientation
can be absent. See [SDK Models](build-your-ui/sdk-models.md) for the complete field reference.
For Advanced Custom UI, the [Build the Components](build-your-ui/custom-ui/build-components-android.md)
recipes are starter layouts rather than required designs.

Render every supported reward type present in the response, including sequential, bonus,
repeatable, time-based, time-boosted, cashback, promotion, and installed-progress data.
`totalCoinsPossible` includes applicable reward values, so showing that total while omitting a
contributing action or reward type can mislead users. Hide a reward component only when its
response data is absent or empty, and do not recalculate or selectively alter SDK reward values.

Cashback attribution and processing can be delayed. Display `pendingRewards` as processing and
separately from `completedRewards`; never present pending coins as collected. Use `receivedAt` and
`processAt` when showing transaction timing, and refresh installed campaigns so pending cashback
can transition to completed.

For promotions, inspect `promotion.targetingType` in the SDK response and use it to drive the UI.
Known values include `AdvertiserLevel`, `UserLevel`, and `AllUsers`; provide a generic fallback for
unknown values. SDK reward amounts already include the promotion, so never calculate the promoted
amount from `boostFactor`.

## Refreshing Campaigns

Refresh campaign data (`getCampaigns` and `getInstalledCampaigns`) at these moments:

- **When the screen becomes visible** — refresh when the user navigates to or returns to a screen
  showing offers. Do not trigger requests from every render, layout update, or repeated lifecycle
  callback.
- **On pull-to-refresh** — let users manually trigger a refresh.
- **After returning from the install flow** — refresh immediately when the user comes back from the
  store. If a campaign remains pending while the screen is visible, optionally refresh again no
  more than once every five minutes for up to ten minutes. Stop when the campaign becomes installed
  or failed, the screen is no longer visible, or the app enters the background.

Always refresh both `getCampaigns` and `getInstalledCampaigns` together to keep your catalog and
active tabs synchronized. Coalesce duplicate refresh triggers and rely on the SDK's five-minute
cache rather than polling more frequently.

## Impression Tracking

Report user views and interactions so adjoe can optimize campaign ranking and provide accurate Dashboard reporting.

- **DEFAULT** — Track when the entire campaign card is visible in the viewport. With React Native, pass `PlaytimeImpressionType.DEFAULT` to `executeCampaignImpression`; use `executeOfferImpression` for individual Offer API items.
- **ENGAGED** — Track when the user taps a campaign to view custom details. It does not count as the view required before `openInStore`.
- **Managed details** — `showCampaignDetails` and `showOfferDetails` track automatically. Do not send duplicate manual events for these flows.

Missing or incorrect tracking leads to less relevant campaigns and lower revenue.

## Install Flow

When a user taps "Play Now" and the SDK opens the store:

- Before `openInStore`, record `executeCampaignImpression` with `DEFAULT` for a custom SDK campaign, or the token-based `executeOfferImpression` for an Offer API item. `openInStore` can fail without this view. This requirement does not apply to other methods.
- The campaign transitions through statuses: `available` → `pending` → `installed` (or `failed`).
- While `pending`, show a "Verifying install…" indicator and move the game to your active/installed section.
- **Refresh campaigns when the user returns** from the store — call both `getCampaigns` and
  `getInstalledCampaigns`. The installed game will move from the catalog response to the installed
  response after backend confirmation, which typically occurs within about ten minutes. Follow the
  bounded refresh guidance above to retrieve status changes.

## Tracking Installed Games

- Call `getInstalledCampaigns` to fetch games the user has installed through your app. Display progress (coins collected vs. total), milestones, and a CTA to launch the game.
- Use `campaign.status` to distinguish pending, installed, and failed campaigns and drive the
  corresponding UI state. Follow the refresh guidance above to retrieve backend-confirmed status
  changes.
- If the installed list is empty, show a CTA directing users to the catalog to start their first game.

## Error Handling

- Use `PlaytimeException.isRetryable` to decide whether to retry a failed call.
- **Retryable errors** (network timeouts, transient server issues) — retry with exponential backoff.
- **Non-retryable errors** (configuration issues, invalid parameters) — log the error and investigate. Do not retry in a loop.

## Teardown

- Call `teardown()` when the user logs out or when Playtime is no longer needed.
- After teardown, you **must** call `initPlaytime` again before using any SDK method.
- Use this to switch users: `teardown()` → `initPlaytime` with the new user's ID to ensure rewards are attributed to the correct account.
- Teardown does not clear UA values already recorded by the backend.
