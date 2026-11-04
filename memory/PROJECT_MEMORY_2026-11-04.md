# Project Memory — 2026-11-04

## User request
Build a production-oriented, Python-first universal sizing service inspired by Instagram reel DfPQp9BxXuv. Use hossain0707/universal-fasion-size, create a sophisticated animated README with GitHub skills, deploy publicly to Vercel, retain copyright for Md Najmul Hossain.

## Context and caveat
Instagram caption/comments retrieved; video playback unavailable. Clothing-size concept inferred from discussion and repository name; precise source video implementation remains unverified.

## Delivered
FastAPI recommendation API, strict validated schemas, custom charts, six fictional demo products, responsive animated storefront, live results, CI test specification, proprietary license, docs, README, architecture and local reusable skills.

## Decisions
Do not infer real body centimetres from uncalibrated photo; do not claim retailer verification or scientific accuracy. Stateless body-data processing without profiles or photos. Keep repo typo as originally named. Copyright 2026 Md Najmul Hossain.

## Deployment verification
First Vercel deployment had HTTP 500 due missing physical public/assets in function runtime. Fixed by conditional local mount; deployed again. Public website, API health, catalog, Swagger UI and client JS successfully fetched. Git integration creation failed due missing repository permission; deployed directly from authenticated GitHub source files. Continued pushes will require manual deploy or a Vercel Git integration.

## Next actions
Verify CI and POST/UI happy path; enable Vercel Git link; merchant chart governance; calibrated fit study; rate limits, monitoring, consent/privacy and independent security/accessibility review.

## Verification update — 2026-11-04
GitHub Actions Python API CI #1 (run 41772477606) completed with conclusion SUCCESS; Python setup, install, compilation and tests all successful. External public browser smoke test completed Foundation Tee (M, 93.8/100) and Essential Denim (M, 95.4/100), and their explanations, coverage and alternatives; no JavaScript/API errors observed. Real merchant fit accuracy remains untested.

## Phase 1.1, 2026-11-04

Implemented genuine editorial photograph homepage and a guided two-view local MediaPipe pose/segmentation module. Source images remain in browser; derived silhouette width/heights plus user-provided actual height go to a new Python /api/photo/assess endpoint. Estimates are approximate, broad-range, quality-gated and not experimentally calibrated. Added real typed measurements prompt parser, encrypted same-device browser profile (AES-GCM/PBKDF2) with save, unlock, update, import/export/delete; no cloud signup or cross-device synchronization. API Python tests and existing sizing remain in GitHub. Latest public browser smoke passed photo layout, prompt measurements, size M / 93.8 on fictional chart, and encrypted profile lifecycle. Actual two-view photo measurement accuracy and model availability on varied devices are not validated. A distinct Supabase account/database would be required for real cross-device customer profiles; never use the unrelated PhishGuard project.


## November 4, 2026 — Interactive model scenario demonstration
User requested realistic sample models and actual working demo on both the website and README. Built three selectable sample garments with real editorial fashion portraits as independent visual references and *fictional* measurements to avoid fabricated photo accuracy. Implemented four-step website walkthrough with animated progress, editable data, optional autoplay, encrypted local profile preview explicitly NOT saved, and actual Python API calculation with ranked size and explanations. Created README model gallery, animated walkthrough SVG and full demo guide; added API contract tests. Real customer two-photo scans now have a locally generated overlay of actual MediaPipe landmark coordinates and rough torso guide bars on the preview after passing backend validation. Visual overlay is not a precise measure. No true photo-derived validation study, merchant integration or cloud customer accounts are added.
