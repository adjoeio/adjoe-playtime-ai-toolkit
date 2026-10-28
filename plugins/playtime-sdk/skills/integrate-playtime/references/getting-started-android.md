# Get Started

> This guide walks you through adding the Playtime SDK to your Android project.

> **Info: Shared Setup**
>
> This setup is required for both [Catalog Integration](https://test-docs.adjoe.zone/rewarded-solutions/sdks/standard-integration/overview)
> and [Studio Integration](studio/overview.md). Complete it once, then continue with
> your chosen integration.

## Check Requirements

- Android API 21+ (minSdk)
- Gradle 8.0+
- Kotlin 1.9+
- targetSdk 35

## Add the Maven Repository

Add adjoe's Maven repository to your `settings.gradle.kts`:

```kotlin
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://releases.adjoe.io/maven") }
    }
}
```

## Add the Dependency

Add the SDK dependency to your module's `build.gradle.kts`:

```kotlin
dependencies {
    implementation("io.adjoe:adjoe-sdk-android:5.0.0")
}
```

Sync your Gradle project.

## Configure Your App

Add your app's package name and Play Store ID to the adjoe dashboard.

> **Note: Permissions added by the SDK**
>
> You do not need to edit your manifest. The SDK's AAR merges these permissions into your app:
> `INTERNET`, `ACCESS_NETWORK_STATE`, `PACKAGE_USAGE_STATS`, `FOREGROUND_SERVICE`, `WAKE_LOCK`,
> `RECEIVE_BOOT_COMPLETED`, `POST_NOTIFICATIONS`, and `com.google.android.gms.permission.AD_ID`.
> Take them into account for your Play Console declarations; see
> [Google Play Data Safety](https://test-docs.adjoe.zone/rewarded-solutions/sdks/resources/google-play-data-safety).

> **Tip: Enable Debug Logging**
>
> To enable SDK debug logs during development:
>
> ```bash
> adb shell setprop debug.adjoe.logging true
> ```

Next, continue to [Use the SDK](standard-integration/use-the-sdk-android.md).
