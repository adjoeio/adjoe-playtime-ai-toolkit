# Offer API

Improve performance and flexibility by ranking and storing campaigns directly on your backend
using the Offer API.

Instead of relying on multiple SDK calls, you can fetch campaigns once through your backend and
deliver them to your client in a single response. This reduces latency and enables a smoother user
experience. The token-based setup lets you fetch campaigns from the API before enriching and
rendering them through the SDK.

**This approach allows you to:**

* Rank and filter campaigns on your backend based on your business logic
* Reduce SDK dependency by centralizing campaign retrieval
* Optimize performance with fewer client-side requests
* Promote high-value campaigns by prioritizing offers with stronger engagement or revenue potential

**When to use:**

* You want to show offer details individually, rather than only as a complete offer list
* You want to rank and store offers on your backend first

**Integration Overview**

Request user-specific campaigns from your backend

Offer API returns the campaign list

Rank, filter, and store campaigns on your backend

Enrich the campaigns through the SDK

Render offers natively in the app

## Offer API Specification

&#xA;GET
`/studio-sdk/user/{userID}/offers`&#xA;

## Path parameters

userID — string — required

Unique User ID

## Query parameters

category — string — optional

app category: gaming, non-gaming or both

filter_recommended — string — optional

hide non-recommended offers

ip — string — optional

End user's IP address used to return offers applicable to that IP.

Example: `8.8.8.8`

## Header parameters

Adjoe-SDKHash — string — required

SDK Hash provided by Adjoe

x-api-key — string — required

API key for authentication

## Responses

> **Info**
>
> #### 200OKapplication/json
>
> > **Info**
> >
> > #### **Offers**`object[]` required
> >
> > List of offers available for this user.
> >
> > AppCategory — string — optional
> >
> > Category of the app: Gaming or Non-gaming. Returns unknown if the category is not set. Use the category query parameter to filter offers by category.
> >
> > Example: `Gaming`
> >
> > AppID — string — optional
> >
> > The application package name or bundle ID.
> >
> > Example: `406889139`
> >
> > AppName — string — optional
> >
> > The display name of the application.
> >
> > Example: `Coin Master`
> >
> > CPI — number — optional
> >
> > Cost per install.
> >
> > Example: `0.3`
> >
> > Coins — integer — optional
> >
> > Total coins rewarded for the offer. If there is an active promotion, this will be included in the amount.
> >
> > Example: `40`
> >
> > CoinsWithoutPromotion — integer — optional
> >
> > Coins rewarded for the offer before any active promotion is applied. When no promotion is active, this equals Coins.
> >
> > Example: `20`
> >
> > ECPM — number — optional
> >
> > Effective cost per mille.
> >
> > Example: `120`
> >
> > ImageURLs — object — optional
> >
> > URLs for the campaign's creative images.
> >
> > ImageURLs.Portrait — string — optional
> >
> > Portrait image URL.
> >
> > Example: `https://s3.eu-central-1.amazonaws.com/prod-prod-adjoe-creatives-converted/6a070344-ed1f-447c-95e0-1647a1645109`
> >
> > ImageURLs.Landscape — string — optional
> >
> > Landscape image URL.
> >
> > Example: `https://s3.eu-central-1.amazonaws.com/prod-prod-adjoe-creatives-converted/700070d2-c69b-41ad-ad00-5c6948d1459f`
> >
> > ImageURLs.Icon — string — optional
> >
> > App icon image URL.
> >
> > Example: `https://s3.eu-central-1.amazonaws.com/prod-prod-adjoe-creatives-converted/0cf4f2a8-292b-4f19-be1b-34f861968efa_com.moonactive.coinmaster_icon_e4d7c7eb-f31f-47fd-b225-ebc0a4726963.jpg`
> >
> > VideoURLs — object — optional
> >
> > URLs for the campaign's video creatives.
> >
> > VideoURLs.Landscape — string — optional
> >
> > Landscape video URL.
> >
> > Example: `https://s3.eu-central-1.amazonaws.com/prod-prod-adjoe-creatives-converted/40041bc4-0e55-4b96-8d02-d0b8aa24e6cf`
> >
> > IsRecommended — boolean — optional
> >
> > Indicates which offers would appear for users if they were to open the catalog/offerwall.
> >
> > PlacementPosition — integer — optional
> >
> > Indicates whether an offer is featured or set to a fixed position in the offerwall. Advertiser-Level Promotion (ALP) offers are returned with -1. To identify an ALP offer, use Promotion.PromotionTargetingType instead.
> >
> > Example: `1`
> >
> > Promotion — object — optional
> >
> > Details of the promotion currently applied to the offer. Used for both Advertiser-Level Promotions and your own promotions. Only included while a promotion is active; omitted otherwise.
> >
> > Promotion.UUID — string — optional
> >
> > Unique identifier of the promotion.
> >
> > Example: `3f6c2a1e-8b4d-4c2a-9e7f-1a2b3c4d5e6f`
> >
> > Promotion.BoostFactor — number — optional
> >
> > Reward multiplier of the promotion. For example, 2 means the offer rewards twice the usual coins. Coins equals CoinsWithoutPromotion multiplied by BoostFactor.
> >
> > Example: `2`
> >
> > Promotion.StartAt — string — optional
> >
> > Start date and time of the promotion (ISO 8601, UTC).
> >
> > Example: `2026-10-01T00:00:00.000Z`
> >
> > Promotion.StopAt — string — optional
> >
> > End date and time of the promotion (ISO 8601, UTC).
> >
> > Example: `2026-10-08T00:00:00.000Z`
> >
> > Promotion.PromotionTargetingType — string — optional
> >
> > Type of the promotion. AdvertiserLevel means the offer is an Advertiser-Level Promotion (ALP). Use this field to identify ALP offers.
> >
> > Example: `AdvertiserLevel`
> >
> > Score — number — optional
> >
> > The internal score of the offer.
> >
> > Example: `120`
> >
> > Token — string — optional
> >
> > Unique token associated with the specific offer rendering.
> >
> > Example: `ee0f45561e1e9ee322078aa7cf4712e1e3cc481a50cab555c909617aedb9f91b07f6a2e8b104ad2958a9fb0fd5a05e7b117d448c7a84f54c41fa16abba954da20bfc2633bb77e94b6028a7338a22663e982b1b846e461687e8d4c7614fbafeed2c10c15af0437a5c17134ac9fb98d0f0bc34dbc00d8692920f47179c8af3a7522cf8af437fb563ff321d562a8562e30eb63815bddffb30e1e06444d8394f41`

> **Info**
>
> #### 400Bad Requestapplication/json
>
> The request is invalid. This may occur due to a malformed request (e.g., missing header, unknown user) or because a campaign previously returned in the offers response has since been deactivated. If you receive this error for a specific campaign token, remove the campaign from your carousel and fetch updated offers.

> **Info**
>
> #### 401Unauthorizedapplication/json
>
> Unauthorized

> **Info**
>
> #### 404Not Foundapplication/json
>
> The request user was not found in our system. Likely causes: the user has not been initialized

> **Info**
>
> #### 425Too Earlyapplication/json
>
> This user's initialization has not finished. Please try again once the init is successful.

> **Info**
>
> #### 500Internal Server Errorapplication/json
>
> Internal Server Error

#### HTTP

GET`/studio-sdk/user/{userID}/offers`

```http
GET /v1/studio-sdk/user/{userID}/offers HTTP/1.1
Host: prod.adjoe.zone
Adjoe-SDKHash: text
x-api-key: text
Accept: */*
```

#### cURL

GET`/studio-sdk/user/{userID}/offers`

```bash
curl -L \
--url 'https://prod.adjoe.zone/v1/studio-sdk/user/{userID}/offers' \
--header 'Adjoe-SDKHash: text' \
--header 'x-api-key: text' \
--header 'Accept: */*'
```

#### JavaScript

GET`/studio-sdk/user/{userID}/offers`

```javascript
const response = await fetch('https://prod.adjoe.zone/v1/studio-sdk/user/{userID}/offers', {
method: 'GET',
headers: {
"Adjoe-SDKHash": "text",
"x-api-key": "text",
"Accept": "_/_"
},
});

const data = await response.json();
```

#### Python

GET`/studio-sdk/user/{userID}/offers`

```python
import requests

response = requests.get(
"https://prod.adjoe.zone/v1/studio-sdk/user/{userID}/offers",
headers={"Adjoe-SDKHash":"text","x-api-key":"text","Accept":"_/_"},
)

data = response.json()
```

#### 200

200OK

```json
{
  "Offers": [
    {
      "AppCategory": "Gaming",
      "AppID": "406889139",
      "AppName": "Coin Master",
      "CPI": 0.3,
      "Coins": 40,
      "CoinsWithoutPromotion": 20,
      "ECPM": 120,
      "ImageURLs": {
        "Portrait": "https://s3.eu-central-1.amazonaws.com/prod-prod-adjoe-creatives-converted/6a070344-ed1f-447c-95e0-1647a1645109",
        "Landscape": "https://s3.eu-central-1.amazonaws.com/prod-prod-adjoe-creatives-converted/700070d2-c69b-41ad-ad00-5c6948d1459f",
        "Icon": "https://s3.eu-central-1.amazonaws.com/prod-prod-adjoe-creatives-converted/0cf4f2a8-292b-4f19-be1b-34f861968efa_com.moonactive.coinmaster_icon_e4d7c7eb-f31f-47fd-b225-ebc0a4726963.jpg"
      },
      "VideoURLs": {
        "Landscape": "https://s3.eu-central-1.amazonaws.com/prod-prod-adjoe-creatives-converted/40041bc4-0e55-4b96-8d02-d0b8aa24e6cf"
      },
      "IsRecommended": true,
      "PlacementPosition": -1,
      "Promotion": {
        "UUID": "3f6c2a1e-8b4d-4c2a-9e7f-1a2b3c4d5e6f",
        "BoostFactor": 2,
        "StartAt": "2026-10-01T00:00:00.000Z",
        "StopAt": "2026-10-08T00:00:00.000Z",
        "PromotionTargetingType": "AdvertiserLevel"
      },
      "Score": 120,
      "Token": "ee0f45561e1e9ee322078aa7cf4712e1e3cc481a50cab555c909617aedb9f91b07f6a2e8b104ad2958a9fb0fd5a05e7b117d448c7a84f54c41fa16abba954da20bfc2633bb77e94b6028a7338a22663e982b1b846e461687e8d4c7614fbafeed2c10c15af0437a5c17134ac9fb98d0f0bc34dbc00d8692920f47179c8af3a7522cf8af437fb563ff321d562a8562e30eb63815bddffb30e1e06444d8394f41"
    }
  ]
}
```

#### 400

400Bad Request

```json
{
  "error": "Bad Request",
  "message": "The request is invalid. This may occur due to a malformed request (e.g., missing header, unknown user) or because a campaign previously returned in the offers response has since been deactivated. If you receive this error for a specific campaign token, remove the campaign from your carousel and fetch updated offers."
}
```

#### 401

401Unauthorized

```json
No Content
```

#### 404

404Not Found

```json
No Content
```

#### 425

425Too Early

```json
No Content
```

#### 500

500Internal Server Error

```json
No Content
```

## Requirements

### SDK v4.0.0

*

  The SDK must initialize successfully for the user before your backend requests offers.
*

  The Offer API only works for users who have already accepted the Terms of Service through the catalog or the SDK.
*

  On Android, usage access is recommended so users can receive the best available offers.

### SDK v5.0.0

*

  The SDK must initialize successfully for the user before your backend requests offers.
*

  Collect the user's explicit Terms of Service consent and report it through `PlaytimeStudio.updateTosConsent`.
*

  Before requesting offers, verify that `Playtime.getStatus().isTosAccepted` is `true`.
*

  Terms of Service consent and Android usage access are separate. On Android, usage access is recommended so users can receive the best available offers.

## Best Practices

*

  Use the API token provided by your Account Manager or retrieved from the Monetize dashboard for authentication.
*

  If caching campaigns, use a short TTL (maximum 5 minutes) to avoid stale offers.
*

  Avoid calling the campaigns API immediately after initialization. Allow a few seconds for the system to propagate updates. Calling too quickly may result in a `425 Too Early` error or an incomplete or empty response.

## Ranking Recommendations

1.

   Prioritize campaigns using `PlacementPosition`. Campaigns with a defined placement position should appear in the top positions. For Advertiser-Level Promotions, use `Promotion.PromotionTargetingType` instead.
2.

   Sort the remaining campaigns by `IsRecommended` descending.
3.

   Sort campaigns with the same `IsRecommended` value by `Score` descending.

## Advertiser-Level Promotions (ALP)

> **Info**
>
> Notice
>
> Advertiser-Level Promotions for Playtime Studio are currently in a limited beta phase with select
> partners. Advertiser-Level Promotions are driven by advertisers themselves. If your organization
> is selected for participation, our team will contact you directly with next steps.

Advertisers can run a time-limited promotion on one of their campaigns. While the promotion is
active, the offer is returned with:

*

  A `Promotion` object with `PromotionTargetingType` set to `AdvertiserLevel`, the `BoostFactor`, and the promotion period (`StartAt`, `StopAt`)
*

  Boosted `Coins`. The usual amount remains available in `CoinsWithoutPromotion`.

Use `Promotion.PromotionTargetingType` to identify ALP offers. Do not identify them from
`PlacementPosition` `-1`; that value can remain before or after the promotion. Advertiser-Level
Promotions are managed by adjoe and the advertiser. No setup is required on your side.

#### ALP active

```json
{
  "AppName": "Coin Master",
  "Coins": 40,
  "CoinsWithoutPromotion": 20,
  "PlacementPosition": -1,
  "Promotion": {
    "UUID": "3f6c2a1e-8b4d-4c2a-9e7f-1a2b3c4d5e6f",
    "BoostFactor": 2,
    "StartAt": "2026-10-01T00:00:00.000Z",
    "StopAt": "2026-10-08T00:00:00.000Z",
    "PromotionTargetingType": "AdvertiserLevel"
  }
}
```

#### ALP ended

```json
{
  "AppName": "Coin Master",
  "Coins": 20,
  "CoinsWithoutPromotion": 20,
  "PlacementPosition": -1
}
```

**Identify and display an ALP offer**

#### JavaScript

```javascript
const response = await fetch(
  `https://prod.adjoe.zone/v1/studio-sdk/user/${userID}/offers`,
  {
    headers: { 'Adjoe-SDKHash': sdkHash, 'x-api-key': apiKey },
  },
);
const { Offers } = await response.json();

for (const offer of Offers) {
  const isALP = offer.Promotion?.PromotionTargetingType === 'AdvertiserLevel';
  const hasBoost = offer.Coins > offer.CoinsWithoutPromotion;

  renderOfferCard({
    title: offer.AppName,
    coins: offer.Coins,
    originalCoins: hasBoost ? offer.CoinsWithoutPromotion : null,
    badge: isALP ? `${offer.Promotion.BoostFactor}x` : null,
    endsAt: isALP ? offer.Promotion.StopAt : null,
    highlighted: isALP,
  });
}
```

#### Python

```python
import requests

response = requests.get(
    f"https://prod.adjoe.zone/v1/studio-sdk/user/{user_id}/offers",
    headers={"Adjoe-SDKHash": sdk_hash, "x-api-key": api_key},
)
offers = response.json()["Offers"]

for offer in offers:
    promotion = offer.get("Promotion") or {}
    is_alp = promotion.get("PromotionTargetingType") == "AdvertiserLevel"
    has_boost = offer["Coins"] > offer["CoinsWithoutPromotion"]

    render_offer_card(
        title=offer["AppName"],
        coins=offer["Coins"],
        original_coins=offer["CoinsWithoutPromotion"] if has_boost else None,
        badge=f"{promotion['BoostFactor']}x" if is_alp else None,
        ends_at=promotion.get("StopAt") if is_alp else None,
        highlighted=is_alp,
    )
```

**Display an ALP offer with Playtime Studio**

After enriching an offer through the SDK, use `promotion.targetingType` to identify an ALP. The
raw Offer API response uses `Promotion.PromotionTargetingType` instead.

1.

   Highlight the offer in your offer list or carousel, for example by showing it first.
2.

   Show `Coins` as the reward. You can show `CoinsWithoutPromotion` crossed out next to it to highlight the boost.
3.

   Optionally show the boost, such as a "2x" badge based on `BoostFactor`, and the end of the promotion based on `StopAt`.

**Promotion types**

| `PromotionTargetingType` | Description                                                                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AdvertiserLevel`        | Advertiser-Level Promotion (ALP), managed by adjoe and the advertiser.                                                                                  |
| `AllUsers`               | Your promotion that applies to all users.                                                                                                               |
| `UserLevel`              | Your promotion activated for specific users with a `promotion_tag`. See [User-level Promotions](https://test-docs.adjoe.zone/rewarded-solutions/sdks/resources/user-level-promos/). |

**Which promotion is shown**

An offer has at most one `Promotion` object. If one of your own promotions is active at the same
time as an ALP, your promotion takes priority and is returned in the `Promotion` object instead
of the ALP.

**Good to know**

*

  The `Promotion` object is included only while a promotion is active. When the promotion ends, the offer remains available with the usual coins and without the `Promotion` object.
*

  Promotions can start or end at any time. Keep your cache TTL short, with a maximum of five minutes, so users always see the current reward.

**FAQ**

> **Info**
>
> #### Do I need to set anything up to receive ALP offers?
>
> No. Advertiser-Level Promotions are managed by adjoe and the advertiser. They are returned
> automatically in the Offer API response.

> **Info**
>
> #### Can a response contain more than one ALP offer?
>
> Usually only one offer has an active ALP at a time. Always check `promotion.targetingType` on each
> SDK-enriched campaign rather than assuming that the response contains only one ALP offer.

> **Info**
>
> #### What happens when an ALP ends?
>
> The offer remains available, but without the `Promotion` object, and `Coins` equals
> `CoinsWithoutPromotion` again. See the **ALP ended** example above.

> **Info**
>
> #### Is `PlacementPosition` `-1` enough to identify an ALP offer?
>
> No. For SDK-enriched campaigns, use `promotion.targetingType`. In the raw Offer API response, use
> `Promotion.PromotionTargetingType`. ALP campaigns can retain `PlacementPosition` `-1` before the
> promotion starts or after it ends.

## IP Whitelisting

Provide your IP addresses so adjoe can whitelist them and ensure requests come from your endpoint.

## Rate Limiting

There is currently no rate limiting. You will be notified before rate limiting is introduced.

## No Campaigns Returned

The API may temporarily return no offers for a user because of:

*

  Advertiser constraints, including budget, targeting, or user attribution
*

  VPN use or travel

Build an empty state that tells the user when no games are currently available.

## Changelog

Changes to the Offer API response, most recent first.

### October 14, 2026

*

  Added Advertiser-Level Promotions (ALP): the `Promotion` object (`UUID`, `BoostFactor`, `StartAt`, `StopAt`, `PromotionTargetingType`). ALP offers have `PromotionTargetingType` `AdvertiserLevel`.

### October 8, 2026

*

  Added `AppCategory` to offers: `Gaming`, `Non-gaming`, or `unknown` if the category is not set.

### July 2, 2026

*

  Added `CoinsWithoutPromotion`, the coins rewarded before any active promotion is applied.

