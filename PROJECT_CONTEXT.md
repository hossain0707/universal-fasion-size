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
