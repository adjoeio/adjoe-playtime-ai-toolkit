# Overview

> Playtime Studio embeds adjoe campaigns in your app. Choose an integration path based on
> how much of the interface and campaign flow you want to build yourself.

> **Danger: Premium Feature**
>
> Playtime Studio is a premium feature available by agreement with your adjoe Account Manager. Contact your AM to enable Studio for your account. Enabling Studio is not guaranteed and depends on your app's eligibility.

> **Info: Complete Shared Setup First**
>
> The platform-specific **Get Started** guide installs and configures the SDK for both
> Catalog and Studio. Choose your platform from the top bar and complete that guide before
> continuing here.

## Choose Your Integration Path

### 1. Drop-In UI

Use the SDK's native renderer for the fastest Studio integration. In the experimental
first phase, Drop-In UI provides a Shelf while the SDK handles campaign loading, native
rendering, images, standard taps, and view and click analytics. Its content and behavior
are configured on the backend.

Drop-In UI is currently experimental, and public names and layout details may change.

[Explore Drop-In UI](drop-in-ui-android.md)

### 2. Quick-Start Custom UI

Build campaign cards that match your app, then use the SDK's managed campaign details and
install flow. Choose this path when you want control over the placement UI without building
the complete campaign experience.

[Build a Quick-Start Custom UI](build-your-ui/quick-start-android.md)

### 3. Advanced Custom UI

Fetch campaign data and build the full interface and interaction flow yourself. Choose
this path when you need complete control over campaign presentation, placements, and user
experience.

[Use the Advanced Custom UI SDK](build-your-ui/custom-ui/use-sdk-android.md), then
[build the components](build-your-ui/custom-ui/build-components-android.md).

## Supporting References

- [Visual Guide](build-your-ui/custom-ui/visual-guide.md) primarily supports Advanced Custom UI integrations with
  platform-independent guidance for campaign lists, details, installed campaigns,
  promotions, and rewards.
- [SDK Models](build-your-ui/sdk-models.md) is the field-level reference for campaign, media,
  promotion, reward, progress, and status data. Use it whenever you render SDK data.
- [Offer API](build-your-ui/offer-api.md) lets Quick-Start and Advanced Custom UI integrations fetch,
  rank, and store campaigns
  on a backend before displaying them in the app. The SDK remains responsible for the
  required in-app actions and analytics described in the integration guides.

## Prerequisites

Before integrating Studio:

1. Complete the [Getting Started](https://test-docs.adjoe.zone/rewarded-solutions/sdks/getting-started) guide.
2. Confirm with your adjoe Account Manager that Studio is enabled for your app.
