# Drop-In UI

Drop-In UI is the fastest way to add a Playtime Studio placement without building the
campaign interface yourself. The Shelf loads and renders campaigns, handles standard
campaign actions, records view and click analytics, and reports its lifecycle state.

## Complete iOS Setup

Complete the [iOS Get Started guide](../getting-started-ios.md), including App Attest,
and verify that the Playtime SDK initializes successfully. Wait for `initPlaytime` to
complete before calling any Studio API.

Choose one dependency manager before editing the app: CocoaPods or Swift Package Manager.
Confirm the dependency file, app target, and minimum deployment target. Do not add both
dependency declarations. Resolve `PlaytimeSDK` at version `>= 5.0.0`.

**CocoaPods**

Add the adjoe source before the CocoaPods CDN and add the framework to the application target:

```ruby
source 'https://github.com/adjoeio/PlaytimeSpecExternal.git'
source 'https://cdn.cocoapods.org/'

target 'PublisherApp' do
  use_frameworks!
  pod 'PlaytimeSDK', '>= 5.0.0'
end
```

Run `pod install` and open the generated `.xcworkspace`.

**Swift Package Manager**

Add `https://github.com/adjoeio/adjoe-monetize-spm` to your app target in Xcode,
or declare the equivalent package dependency and product in `Package.swift`. Select the
`PlaytimeSDK` product and resolve version `>= 5.0.0`.

## Enable Drop-In UI

Work with your adjoe Account Manager to enable Studio and Drop-In UI for the app. Confirm
the placement ID and destination screen for each Shelf, then agree on its initial appearance
and behavior. Shelf APIs throw unless Studio integration is enabled for your app.

Before implementation, identify the SDK hash's secure configuration source, where the
external user ID becomes available, the legal flow that records acceptance and revocation,
and whether each placement is hosted by SwiftUI, a `UIView`, or a `UICollectionView`.

## Initialize with the User ID

Initialize Playtime as early as possible during app launch with the external user ID, and wait
for successful completion before using another SDK method. Keep the SDK hash in the app's secure
configuration rather than hard-coding it. Use the app's existing async startup and error-reporting
pattern, such as a SwiftUI `App` task, app coordinator, or application delegate task. Do not
fire-and-forget initialization.

```swift
@_spi(Experimental) import PlaytimeSDK

try await Playtime.initPlaytime(
    options: InitOptions(sdkHash: sdkHash, userId: externalUserID)
)
```

If the user ID becomes available only after sign-in, initialize at launch with the available
options. After sign-in, call `Playtime.initPlaytime(options:)` again with the user ID and all
intended options, including the SDK hash and applicable profile, extension, and language settings.

## Record TOS Consent

Before using Studio, incorporate adjoe's Terms of Service into your own terms and ask the user
to accept those terms through explicit input. Never infer consent or submit acceptance
automatically. Campaigns remain unavailable until you report the user's acceptance with
`updateTosConsent`. If the user later withdraws consent, report the withdrawal with the same
method.

```swift
try await PlaytimeStudio.updateTosConsent(action: .accept)
```

```swift
try await PlaytimeStudio.updateTosConsent(action: .withdraw)
```

The user must be initialized with a user ID. After acceptance, refresh an existing Shelf or
create it when its host is visible. Do not infer consent or add a consent UI without product
approval.

## Create and Retain the Controller

Create one controller for each placement and retain it for as long as the placement is in
use. Create a new controller if its placement or callbacks change.

The Shelf API is experimental. Use `@_spi(Experimental) import PlaytimeSDK` in
every source file that references its types.

A placement can have multiple remotely configured Shelf variants. Set `requestedVariant` to
the variant ID configured for the placement when the screen needs a specific variant. Omit it
to use that placement's default variant. Create a new controller when changing variants because
controller options are immutable.

```swift
let controller = try await PlaytimeStudio.makeShelfController(
    options: PlaytimeShelfOptions(
        placement: .init(rawValue: "home-feed"),
        requestedVariant: "compact-carousel",
        category: .gaming,
        onStatusChanged: { status in
            // Handle ready, empty, and unavailable states.
        },
        onSizeChanged: { size in
            // Re-measure a custom UIKit host if needed.
        }
    )
)
```

Use a variant ID only after confirming it is configured for the selected placement. For the
placement default, omit `requestedVariant`:

```swift
let options = PlaytimeShelfOptions(
    placement: .init(rawValue: "home-feed"),
    category: .gaming
)
```

Use `onStatusChanged` to update your application's loading, empty, or error UI. If campaign-action
analytics or observation is needed, provide `actionObserver`; it runs on the main actor after SDK
tracking and configured navigation have completed.

## Embed the Shelf

Choose the host used by the placement.

**SwiftUI**

Create and retain the controller outside the view's `body`, then render it when available:

```swift
if let controller = viewModel.shelfController {
    PlaytimeShelfRepresentable(controller: controller)
}
```

Do not recreate the controller during SwiftUI updates.

Keep the controller in an `@MainActor` observable view model. `PlaytimeShelfRepresentable`
bridges UIKit and self-sizes; release the controller when the placement lifecycle ends.

**UIKit**

Create a renderer from the retained controller:

```swift
let shelfView = controller.makeShelfView()
```

Pin it to all four edges of its container. Do not set a fixed height: the Shelf has an
intrinsic height and resolves to zero while empty or unavailable. Call `shelfView.invalidateLayout()`
when the host layout changes without a normal bounds or layout pass.

Only retain the latest `PlaytimeShelfView` returned by a controller. A later `makeShelfView()`
replaces the previous renderer. Use another controller for an independent placement or session.

**UICollectionView**

Keep the controller in the screen-level owner, not in a reusable cell. Let the cell retain
only the Shelf view returned by `makeShelfView()`. Use a self-sizing cell, pin the Shelf to
all four edges, detach it during reuse, and invalidate the collection layout from
`onSizeChanged`. Do not impose a fixed cell height. For `empty` or `unavailable`, remove the
Shelf item or section when that matches your application's UI; the renderer otherwise self-hides.

For a diffable data source, add a stable Shelf item to the existing snapshot and use a dedicated
`UICollectionView.CellRegistration` to configure the host cell from the retained controller.
Include or remove the item as application state changes. A size change normally needs only
`collectionView.collectionViewLayout.invalidateLayout()`; reload the item only when the existing
layout requires a snapshot update.

For a classic data source, add one Shelf item to the selected section only when it should display.
Configure its dedicated cell in `collectionView(_:cellForItemAt:)`. Enable `estimatedItemSize` for
a flow layout, or use the app's existing self-sizing approach.

## Prefetch When Useful

Call `prefetch()` when the placement is known before it appears. It can run before a Shelf
view exists, and the later renderer reuses the prefetched session.

```swift
shelfController?.prefetch()
```

For a collection view, call `prefetch()` when its Shelf index path is requested through the
existing `UICollectionViewDataSourcePrefetching` owner. Prefer screen-level prefetching when the
placement is known before the collection begins loading.

## Handle Shelf States

Use `onStatusChanged` to respond to `ready`, `empty`, and `unavailable` states. The Shelf
self-hides at zero height when there is no content. Use `onSizeChanged` when the host needs
explicit layout invalidation after the Shelf size changes. Confirm whether observation is required
after a campaign action and handle it through `actionObserver` when needed.

## Release the Shelf

Remove and release Shelf views and their retained controllers before calling `Playtime.teardown()`.
Create a new controller after initializing Playtime again.

## Verify the Integration

Verify initialization and explicit TOS acceptance, the configured placement reaching the
expected state, correct sizing across width and Dynamic Type changes, configured campaign
actions, and collection reuse without duplicate views or controllers. Confirm that the intended
external user ID is used, App Attest is configured for production, empty and unavailable states
are intentional, and any action observer receives completed actions.

## Set Up Server-to-Server Payouts

Finally, set up [Server-to-Server (S2S) payouts](https://test-docs.adjoe.zone/rewarded-solutions/setting-up-rewarding/server-to-server-payouts) so your backend can receive payout callbacks and distribute rewards to users.

## Customize the Shelf

The Shelf configuration is managed by adjoe's backend. Your app does not need to bundle,
fetch, or parse a local configuration file.

> **Info: Shelf configuration**
>
> Work with your adjoe Account Manager to review and update the Shelf
> configuration. These fields will become available for publishers to manage through the
> Monetize Dashboard.

| Area                  | What you can customize                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| Presentation          | Display campaign cards using these presentations: tile, row, or showcase.                              |
| Campaign count        | Limit how many campaigns the Shelf displays.                                                           |
| Colors                | Configure the Shelf, tabs, campaign cards, rewards, statuses, and action buttons.                      |
| Header and tabs       | Show a title, tabs, or both, and configure their appearance.                                           |
| Tap behavior          | Choose whether a campaign action opens the store or opens app details in the Playtime catalog webview. |
| Scrolling and spacing | Choose horizontal or vertical scrolling and configure spacing between cards.                           |
| Card appearance       | Configure card backgrounds, corner radii, artwork, and supported icons.                                |
| Text                  | Configure supported text styles, sizes, weights, and localized labels.                                 |

## API Reference

See the [iOS Studio SDK reference](https://playtime-api-reference.adjoe.io/monetize/ios/5.0.0/studio/index.html)
for all experimental Drop-In UI types and method signatures.
