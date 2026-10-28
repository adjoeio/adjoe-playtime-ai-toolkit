# Drop-In UI

Drop-In UI is the fastest way to add a Playtime Studio placement without building the
campaign interface yourself. The Shelf loads and renders campaigns, handles standard
campaign actions, records view and click analytics, and reports its lifecycle state.

## Complete Android Setup

Complete the [Android Get Started guide](../getting-started-android.md) with SDK version
`5.0.0`, then verify that Playtime initializes successfully. Drop-In UI requires a
`FragmentActivity`, such as `AppCompatActivity`, and uses the `io.adjoe.sdk.dropui` package.

## Enable Drop-In UI

Work with your adjoe Account Manager to enable Studio and Drop-In UI for the app. Confirm
the placement ID for each Shelf and agree on its initial appearance and behavior.

## Opt In to the Experimental API

Annotate the class or function that integrates the Shelf:

```kotlin
import io.adjoe.sdk.ExperimentalDropInApi

@OptIn(ExperimentalDropInApi::class)
class PlaytimeShelfActivity : AppCompatActivity() {
    // Shelf integration
}
```

## Initialize with the User ID

Initialize Playtime as early as possible during app launch with the external user ID, and
wait for successful completion before using another SDK method.

```kotlin
Playtime.initPlaytime(
    InitOptions(sdkHash = sdkHash, userId = externalUserId),
    object : PlaytimeInitListener {
        override fun onSuccess() {
            // The SDK is ready.
        }

        override fun onError(error: PlaytimeException) {
            // Handle initialization failure.
        }
    },
)
```

## Record TOS Consent

Before using Studio, incorporate adjoe's Terms of Service into your own terms and ask the user
to accept those terms through explicit input. Never infer consent or submit acceptance
automatically. Campaigns remain unavailable until you report the user's acceptance with
`updateTosConsent`. If the user later withdraws consent, report the withdrawal with the same
method.

```kotlin
PlaytimeStudio.updateTosConsent(
    TosConsentAction.ACCEPT,
    object : PlaytimeTosListener {
        override fun onUpdated() {
            // The Shelf can now load campaigns.
        }

        override fun onError(error: PlaytimeException) {
            // Handle the failure.
        }
    },
)
```

Use `TosConsentAction.WITHDRAW` if the user withdraws consent.

## Add and Bind the Shelf

Choose the host used by the placement. Create the controller only after initialization and
TOS acceptance have completed. Pass the current `FragmentActivity` when creating and binding
the controller, including after a configuration change.

**Views and XML**

Add a `PlaytimeShelfView` with a content-driven height:

```xml
<io.adjoe.sdk.dropui.PlaytimeShelfView
    android:id="@+id/playtimeShelf"
    android:layout_width="match_parent"
    android:layout_height="wrap_content" />
```

Create the controller, bind the view, and fetch campaigns:

```kotlin
val shelfView = findViewById<PlaytimeShelfView>(R.id.playtimeShelf)

PlaytimeStudio.makeShelfViewController(
    activity = this,
    options = PlaytimeShelfOptions(
        placement = PlaytimeShelfPlacement("home_feed"),
        onStatusChanged = { status ->
            // Handle Ready, Empty, and Unavailable states.
        },
        onSizeChanged = { width, height ->
            // Re-measure a custom host if needed.
        },
    ),
    listener = object : PlaytimeShelfControllerListener {
        override fun onSuccess(controller: PlaytimeShelfController) {
            controller.bind(
                shelfView,
                this@PlaytimeShelfActivity,
                object : PlaytimeShelfBindListener {
                    override fun onSuccess() {
                        controller.fetch()
                    }

                    override fun onFailure(error: PlaytimeException) {
                        // Handle binding failure.
                    }
                },
            )
        }

        override fun onFailure(error: PlaytimeException) {
            // Handle controller creation failure.
        }
    },
)
```

In a Fragment, pass `requireActivity()` to both controller creation and `bind`.

**Jetpack Compose**

Create the controller outside any composable so recomposition does not recreate it. Show the Shelf once the controller is ready:

```kotlin
var shelfController by mutableStateOf<PlaytimeShelfController?>(null)

PlaytimeStudio.makeShelfViewController(
    activity = this,
    options = PlaytimeShelfOptions(
        placement = PlaytimeShelfPlacement("home_feed"),
        onStatusChanged = { status ->
            // Handle Ready, Empty, and Unavailable states.
        },
    ),
    listener = object : PlaytimeShelfControllerListener {
        override fun onSuccess(controller: PlaytimeShelfController) {
            shelfController = controller
        }

        override fun onFailure(error: PlaytimeException) {
            // Handle controller creation failure.
        }
    },
)

setContent {
    shelfController?.let { controller ->
        PlaytimeShelf(activity = this, controller = controller)
    }
}
```

Embed `PlaytimeShelfView` with `AndroidView`. If the Shelf is inside a scrollable Compose
container, bridge nested scrolling so its internal list cooperates with the parent.

```kotlin
@Composable
fun PlaytimeShelf(
    activity: FragmentActivity,
    controller: PlaytimeShelfController,
) {
    val nestedScrollInterop = rememberNestedScrollInteropConnection()

    AndroidView(
        factory = { context ->
            PlaytimeShelfView(context).also { shelfView ->
                controller.bind(
                    shelfView,
                    activity,
                    object : PlaytimeShelfBindListener {
                        override fun onSuccess() {
                            controller.fetch()
                        }

                        override fun onFailure(error: PlaytimeException) {
                            // Handle binding failure.
                        }
                    },
                )
            }
        },
        modifier = Modifier
            .fillMaxWidth()
            .nestedScroll(nestedScrollInterop),
    )
}
```

The `nestedScroll` modifier is optional when no Compose scrolling parent exists.

## Configure the Controller

`PlaytimeShelfOptions` supports:

- `placement`: a stable identifier for the integration point.
- `requestedVariant`: an optional Shelf variant; omit it to use the configured default.
- `category`: the requested campaign category; defaults to `AppCategory.GAMING`.
- `actionObserver`: observes an action after the SDK performs it. It cannot replace the action.
- `onStatusChanged`: reports `Idle`, `Loading`, `Ready`, `Empty`, or `Unavailable`.
- `onSizeChanged`: reports advisory content dimensions in pixels.

Call `fetch()` on the main thread to load or reload campaigns. For an `Unavailable` status,
inspect its `reason` and `retryable` fields before offering a retry.

## Release the Controller

Call `release()` on the main thread from the lifecycle owner's final cleanup, such as
`ViewModel.onCleared()`. It cancels in-flight work and clears references. Do not call another
controller method after releasing it, and release all Drop-In UI controllers before calling
`Playtime.teardown(...)`.

```kotlin
override fun onCleared() {
    shelfController?.release()
    shelfController = null
    super.onCleared()
}
```

## Verify the Integration

Verify initialization and explicit TOS acceptance, each configured placement reaching the
expected state, correct sizing, campaign actions, retries, configuration changes, and cleanup
without duplicate views or controllers.

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

See the [Android Studio SDK reference](https://playtime-api-reference.adjoe.io/monetize/android/5.0.0/studio/index.html)
for all experimental Drop-In UI types and method signatures.
