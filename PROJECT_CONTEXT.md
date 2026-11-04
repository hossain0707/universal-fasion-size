# Project Context

## Identification
Name: Universal Fashion Size. Repository slug: hossain0707/universal-fasion-size (retain original spelling). Owner: Md Najmul Hossain. Live site: https://universal-fasion-size.vercel.app/.

## Thesis
Compare directly measured human body dimensions with manufacturer-specific body-size charts. Do not claim universal size-label standardization, accurate single-photo body measurement, or validated fit prediction without evidence.

## Architecture
- Python 3.12, FastAPI and Pydantic typed request validation.
- Deterministic weighted distance scoring, fit preference and explanations.
- Browser application with responsive animated CSS/SVG, no frontend framework.
- Vercel Functions, CDN-promoted public assets and no body-profile database.
- Per-request custom chart API and clearly fictional sample catalog.

## Completed
Homepage, user input, inch/cm conversion, categories, preference choices, real API calls, scoring, alternatives, chart provenance, methodology, API docs, GitHub test suite, Docker, documentation, Vercel production deployment and owner attribution.

## Blockers
The original reel video could not be played, only caption/comments could be read; concept inferred from sizing context and repository name. No verified retailer data or actual fit study yet. Vercel GitHub auto-sync is blocked until the Git integration receives repository permission.

## Verification
Public homepage, API health, catalog, docs and JavaScript assets checked after fixing the Vercel missing-static-directory import issue. Tests added; check CI outcome separately.

## Required next steps
Enable Vercel GitHub integration, review CI results, validate POST and browser end-to-end flow, source real merchant charts, fit-accuracy study, security/accessibility audit, WAF/rate limits and operational observability.

## 2026-11-04 verification update
GitHub Actions run #1 completed successfully (https://github.com/hossain0707/universal-fasion-size/actions/runs/41772477606). Public browser form tests successfully obtained real API recommendations for Tops (Foundation Tee, M, 93.8/100) and Bottoms (Essential Denim, M, 95.4/100), with coverage, alternatives and explanations. No errors observed. This confirms core user interaction, not garment fit validation.

## Phase 1.1 — Real photos and reusable local profile

Editorial photographs replace the mannequin illustration. Users may choose two real photos for consent-gated, on-device MediaPipe pose and silhouette segmentation; the server receives only derived shape measurements and height. Python estimates chest/waist/hip circumferences with a heuristic ellipse model and clearly broad unvalidated ranges, never precise claims. Customer photos do not leave the browser to this API. Natural-language measured values require explicit labels and units. Customers can create and unlock AES-GCM encrypted browser-local profiles, with update, encrypted backup and deletion; these profiles do not automatically synchronize between devices and have no cloud account system. Cloud persistence requires dedicated auth/DB deployment and verification, never mixing with the existing PhishGuard Supabase resource.

The public UI test passed real-photo rendering, measurements from text, fitting calculations, profile save/lock/unlock. GitHub CI #5 passed. The vision pipeline was not calibrated with real photos and tape ground truth. Merchant catalogs still use clearly fictional sample data unless an actual chart is supplied via the API.


## Phase 1.2 — Truthful interactive demonstration
Added new #live-demo website journey with three representative editorial photos and **fictional numerical body profiles** (tee, denim and dress), editable sample measurements, progress steps and optional playback, an explanatory-only local profile preview, and an actual real Python /api/recommend POST to display live size, score and explanation. No photo is analyzed in demo mode, no fake saved profile is created, and the images are not the measurement source. The real photo workflow independently displays MediaPipe-detected landmarks on the visitor's own image previews after a successful scan. Added docs/demo-walkthrough.svg, docs/DEMO_GUIDE.md, public/assets/demo.js, public/assets/demo.css, tests/test_demo_profiles.py and extended README. The separate photo-geometry accuracy has not been validated with independent real body measurements.
