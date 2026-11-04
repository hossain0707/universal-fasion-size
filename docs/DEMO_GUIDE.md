# Interactive Demo Guide

[Launch the public sample walkthrough](https://universal-fasion-size.vercel.app/#live-demo)

This walkthrough demonstrates the customer experience with three editable, illustrative body profiles, representative real fashion photographs and live calls to the Python fit service. There are no hardcoded sizing outcomes in the interactive page.

## User journey

1. **Photo guidance:** View real editorial fashion photography and learn how to take a front and 90-degree side photo. The demo does not infer measurements from the pictured editorial model. Actual opt-in vision analysis lives under Photo Fitting.
2. **Editable sample measurements:** Enter or change explicitly fictional height/chest/waist/hip/inseam values. These values are not measurements of the pictured models.
3. **Optional encrypted local profile preview:** See how a future customer profile would summarize those values. No sample account or stored profile is created. The separate actual profile vault is used to save reviewed measurements with consent and a passphrase.
4. **Live size recommendation:** The website sends the selected sample's measurements to the real /api/recommend FastAPI endpoint and displays the returned size, score, input coverage, explanations and alternatives. If the API fails, the demo shows the failure and retry option, not a fake result.

Visitors may change between cases, use Back/Next, choose a step directly, start/pause the animated walkthrough, retry a calculation or transfer sample values to the real fitting studio.

## Explicit demonstration profiles

| Sample | Product | Category | Height cm | Chest cm | Waist cm | Hips cm | Inseam cm |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| A · Everyday essentials | Foundation Tee | Tops | 175 | 96 | 81 | 100 | 78 |
| B · Everyday denim | Essential Denim | Bottoms | 183 | 106 | 90 | 110 | 81 |
| C · Day dress | Everyday Dress | Dresses | 168 | 87 | 71 | 94 | 74 |

**All three bodies are fictional data for demonstrations and automated tests.** Photos are independent visual styling from Unsplash, not actual measurement sources. The displayed size-chart product IDs refer to the fictional Demo Atelier catalog, not a partnered retailer. The fitting score is heuristic chart compatibility, not measured fit reliability.

## The real Python request

For example, scenario A issues POST /api/recommend with:

~~~json
{
  "category": "tops",
  "product_id": "foundation-tee",
  "fit": "regular",
  "measurements": {
    "height_cm": 175,
    "chest_cm": 96,
    "waist_cm": 81,
    "hip_cm": 100,
    "inseam_cm": 78
  }
}
~~~

To reproduce it:

~~~bash
curl -sS 'https://universal-fasion-size.vercel.app/api/recommend' \
  -H 'Content-Type: application/json' \
  -d '{"category":"tops","product_id":"foundation-tee","fit":"regular","measurements":{"height_cm":175,"chest_cm":96,"waist_cm":81,"hip_cm":100,"inseam_cm":78}}'
~~~

The latest sample chart returns size M for baseline scenario A. The interface must always show the server response, especially after editing inputs; it must not simulate measurement model accuracy.

## The real on-device photo model is separate

The Photo Fitting section at https://universal-fasion-size.vercel.app/#photo-studio loads Google's MediaPipe Pose Landmarker after explicit consent to analyze the customer's own front and side photographs in their browser. MediaPipe produces detected keypoints and an optional person segmentation mask; see the [official documentation](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker).

Upon successful analysis, the application draws **actual detected pose landmarks** and approximate horizontal body guidance bars over the two local previews. The photograph pixels remain on the device. The API receives derived silhouette widths and user-supplied measured height, then computes **low-confidence circumference estimates**. Those lines are approximate geometry guidance, not calibrated centimetre rulers.

No claim is made that this preliminary estimator reproduces tape-measured body size accurately. Real paired-photograph/ground-truth evaluation remains necessary before commercial photo-sizing guarantees.

## Privacy, accessibility and QA

- No camera or model download occurs merely from using the sample walkthrough.
- No profile or image upload happens in the demonstration; only example numerical values are sent to the fitting API at the final step.
- Users can load examples into the real fitting form, but that action does not create an account.
- Real optional photo processing is local and consent-gated; user profile storage is encrypted locally with passphrase.
- Step controls, labels, errors, status text and reduced-motion styling provide accessibility support.
- Test all three case switches, editable dimensions, real API POST, explanations/alternatives, responsive layout, autoplay and transfer into the fitting studio.
- To validate the photo model scientifically, compare real consented photo pairs with verified manual tape measurements across devices, poses, body types and clothing.

The GitHub README itself is static; it displays an animated architecture/workflow diagram, sample fashion imagery and these example cases with a link to the live interactive site.


## Verified public-browser demo run

On November 4, 2026, a real browser visited the production website, exercised all three sample model selectors, navigated the animated four-step journey, changed inputs and requested live Python size recommendations.

| Sample | Live recommended size | Live heuristic score |
| --- | --- | ---: |
| A · Foundation Tee | M | 93.8 / 100 |
| B · Essential Denim | L | 95.3 / 100 |
| C · Everyday Dress | S | Shown by the live API; exact value not recorded in the QA summary |

The public session also verified representative fashion imagery loaded, the measurement fields were editable, the Play/Back/Next controls functioned, and no visible runtime errors were encountered. The tested photo examples were not processed by the pose model, and this test does not validate photo-derived anatomy measurements.

[View the live browser QA evidence](https://agent.tinyfish.ai/runs/b96f3534-1ab2-4e35-baf4-286e76d42b8b).
