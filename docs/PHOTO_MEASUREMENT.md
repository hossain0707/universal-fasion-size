# Two-View Photo Measurements — Engineering Constraints

## Runtime flow

1. User explicitly selects a **front** and a **90-degree side** full-body image and enters their measured height.
2. The browser downloads a pinned MediaPipe pose model and WASM runtime when analysis begins. Photos are analyzed in-browser; no raw photo files are sent to this server.
3. MediaPipe provides 33 pose keypoints and a person segmentation mask, subject to confidence, frame-clipping and minimum resolution checks.
4. Client samples contiguous foreground silhouette widths at landmarks-derived chest, waist and hip row estimates.
5. Client POSTs only derived pixel widths, body pixel heights, a pose-quality score and known user height to /api/photo/assess.
6. The Python API calculates approximate circumferences using each view's height scale and an elliptical cross-section assumption, returning a deliberately broad, non-validated ±23% advisory interval.
7. Users review and explicitly apply values to the garment size matching form, ideally correcting them with an actual tailor's measuring tape.

## Important limitations

- This is **not** calibrated 3D body scanning, photogrammetry, a body-shape validated model or exact garment measurement. No production-grade scientific accuracy claims are made.
- Frontal/side projection and ellipse perimeter are not enough to reconstruct a 3D human body. Perspective, clothes, movement, camera calibration and posture distort results significantly.
- Height calibration is only an approximation, since ankles/head margins do not perfectly correspond to stature, and perspective changes scale across views.
- MediaPipe landmark segmentation is not designed specifically as a tailor-grade anthropometric tool. It can miss limbs, confuse clothes, and mismeasure torso rows.
- The error allowance is an educational width, **not a calibrated confidence interval**.
- This API intentionally does not generate inseam estimates from images.
- Do not use image-derived estimates alone for medical, protective, safety or bespoke tailoring decisions.
- Images are never placed in localStorage, profile vault or the Python API. The model download involves external Google and CDN endpoints, which may collect telemetry. Consent is requested prior to loading.
- For a product-grade validated system, evaluate error across body types, clothing, devices, lighting, camera intrinsics and image positions against ground truth tape measurements. Reject out-of-distribution samples.

## Encrypted customer profiles

The current deployment supports a **local encrypted profile**, not a cloud identity system. LocalStorage contains an AES-GCM encrypted JSON blob, with key derived from a customer passphrase using PBKDF2-SHA256 (310,000 iterations). Image bytes are not stored. Users can unlock, change and delete the local profile, or export and import an encrypted backup for use on another device. The browser is responsible for protecting the device from malware and XSS. This is not authenticated, cloud-synced account storage, and forgetting the passphrase means the data cannot be recovered.

Cross-device automatic login and profile sync require a properly provisioned and isolated auth/database service (e.g. Supabase), RLS, secure backup and deletion policies. The existing Supabase project belongs to **PhishGuard**; it must never be reused for this application. This release intentionally avoids implying cloud accounts are available.
