<p align="center"><img src="docs/banner.svg" alt="Universal Fashion Size animated banner" width="100%"/></p>

<div align="center">

# Universal Fashion Size

**One body. Every brand. Your fit.**

*A privacy-first, explainable fashion sizing platform powered by Python and FastAPI.*

[**Launch the Live Fitting Studio**](https://universal-fasion-size.vercel.app/) · [**Explore the API**](https://universal-fasion-size.vercel.app/api/docs) · [**Architecture**](#architecture) · [**Quick Start**](#quick-start)

[![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Live-black?logo=vercel)](https://universal-fasion-size.vercel.app/)
[![CI](https://github.com/hossain0707/universal-fasion-size/actions/workflows/ci.yml/badge.svg)](https://github.com/hossain0707/universal-fasion-size/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Proprietary-7089A9)](LICENSE)

</div>

---

## Overview

Clothing labels such as XS, S, M and L are not standardized across brands. Universal Fashion Size helps people make informed clothing choices by comparing **actual body measurements** with an explicitly identified garment size chart.

The product includes a functional interactive storefront, a Python recommendation engine and OpenAPI integration for user-supplied clothing charts. Its initial sample catalog is **fictional and illustrative**, not verified retailer inventory. This distinction matters: the code performs genuine calculations, but commercial fit accuracy has not been independently validated.

## Animated Product Workflow

<p align="center"><img src="docs/animated-workflow.svg" width="100%" alt="Animated diagram: measurements, Python fit engine, explained size report"/></p>

| Capability | Status | Explanation |
| --- | --- | --- |
| Interactive responsive fitting studio | Implemented | Desktop, tablet and mobile; reduced-motion support |
| Centimetre and inch measurements | Implemented | Conversion in the browser |
| Tops, bottoms and dresses | Implemented | Different body-dimension weights |
| Slim, regular and relaxed preferences | Implemented | Explicit heuristic ease adjustments |
| Recommended size and alternatives | Implemented | Deterministic weighted ranking |
| Explainable scores and measurement coverage | Implemented | No hidden opaque AI decisions |
| Custom manufacturer chart API | Implemented | Strictly validated, per-request |
| Six sample garments | Implemented | Fictional Demo Atelier, clearly identified |
| Interactive OpenAPI documentation | Implemented | Swagger UI |
| Real retailer integrations | Not yet integrated | Actual charts require verified agreements and ingestion |
| Accurate photo-only body scanning | Not supported | Requires calibrated, validated measurement capture |
| Saved accounts and payments | Not part of current release | Deliberately stateless |
| Real-world accuracy benchmark | Not established | Requires a measured fitting study |

## Experience

The customer enters a few body measurements, selects the garment category and preferred fit, and chooses a sample product. The application returns:

1. The recommended clothing size.
2. A numerical heuristic fit score on a 0–100 scale.
3. Three alternatives, where available.
4. A plain-English explanation of the measurements and size-chart ranges.
5. Input coverage and explicit chart provenance.

The animated garment visualization lives in the **[real public website](https://universal-fasion-size.vercel.app/)**. A GitHub README cannot execute the interactive application, so the live site is the authoritative demonstration.

## Architecture

<p align="center"><img src="docs/architecture.svg" width="100%" alt="Frontend, API validation, Python fitting engine, chart data and response architecture"/></p>

| Layer | Technology | Responsibilities |
| --- | --- | --- |
| Frontend | HTML, CSS, vanilla JavaScript | Accessible input, animation, unit conversion, results |
| API | Python 3.12, FastAPI, Pydantic v2 | Validation, HTTP routes, errors, documentation and headers |
| Engine | Typed Python | Weighted measurement matching, ranking, explanations |
| Catalog | In-process sample data or request-supplied charts | Provenance without misleading retailer attribution |
| Hosting | Vercel Python Functions and CDN | Public API and static assets |
| Tests | pytest and GitHub Actions | Schema, security headers, API behavior, negative cases |
| Local runtime | Uvicorn and Docker | Reproducible development environment |

The sizing engine uses measured body dimensions rather than trying to derive exact centimetres from an uncalibrated photo. It does not save body profiles or accept image uploads.

## Repository

~~~text
universal-fasion-size/
├── app.py
├── public/
│   ├── index.html
│   └── assets/{app.js,style.css,logo.svg}
├── tests/test_api.py
├── docs/{banner.svg,animated-workflow.svg,architecture.svg,DEPLOYMENT.md}
├── memory/PROJECT_MEMORY_2026-11-04.md
├── .github/
│   ├── workflows/ci.yml
│   ├── copilot-instructions.md
│   └── skills/
│       ├── github-readme-standard/SKILL.md
│       └── project-memory-manager/SKILL.md
├── Dockerfile
├── requirements.txt
├── pyproject.toml
├── vercel.json
├── PROJECT_CONTEXT.md
├── CHANGELOG.md
└── LICENSE
~~~

## Quick Start

Requires Python 3.12 or newer.

~~~bash
git clone https://github.com/hossain0707/universal-fasion-size.git
cd universal-fasion-size
python -m venv .venv
source .venv/bin/activate         # Windows: .venv\Scripts\activate
python -m pip install -r requirements.txt
uvicorn app:app --reload
~~~

Open http://localhost:8000 for the fitting studio and http://localhost:8000/api/docs for interactive API documentation.

### Tests

~~~bash
python -m pip install "pytest>=8,<10" "httpx>=0.27,<1"
python -m pytest -q
~~~

### Docker

~~~bash
docker build -t universal-fashion-size .
docker run --rm -p 8000:8000 universal-fashion-size
~~~

## API Reference

| Method | Path | Purpose |
| --- | --- | --- |
| GET | /api/health | Health check |
| GET | /api/catalog | Six illustrative garments |
| GET | /api/catalog/{product_id} | Individual sample size chart |
| POST | /api/recommend | Recommendation, explanation and alternatives |
| GET | /api/methodology | Model limitations and weighting |
| GET | /api/docs | Interactive Swagger UI |
| GET | /api/openapi.json | OpenAPI specification |

### Working recommendation request

~~~bash
curl -sS https://universal-fasion-size.vercel.app/api/recommend \
  -H "Content-Type: application/json" \
  -d '{"category":"tops","fit":"regular","product_id":"foundation-tee","measurements":{"chest_cm":96,"waist_cm":81}}'
~~~

### Send your own retailer size chart

Submit a custom chart instead of a product ID. Here is a valid example, with body-size ranges in centimetres:

~~~json
{
  "category": "tops",
  "fit": "regular",
  "measurements": {"chest_cm": 96, "waist_cm": 81},
  "custom_chart": {
    "name": "Merchant-provided shirt chart",
    "category": "tops",
    "sizes": [
      {"size": "S", "measurements": {"chest_cm": {"min": 84, "max": 94}, "waist_cm": {"min": 68, "max": 80}}},
      {"size": "M", "measurements": {"chest_cm": {"min": 92, "max": 104}, "waist_cm": {"min": 78, "max": 90}}}
    ]
  }
}
~~~

The custom chart is validated and used for the current calculation only. No database is required.

## Fit Methodology

Every supplied relevant body dimension is compared with the corresponding body-size interval for each clothing size. The engine computes a normalized distance from the middle of each interval, weights the dimensions according to garment category, and ranks the resulting size scores.

| Category | Weighting |
| --- | --- |
| Tops | Chest 70%, waist 30% |
| Bottoms | Waist 55%, hips 35%, inseam 10% |
| Dresses | Chest 40%, waist 30%, hips 30% |

The fit-preference heuristics adjust circumference targets by −1 cm (slim), 0 cm (regular) or +3 cm (relaxed). These are **prototype assumptions**, not scientifically validated fitting parameters. The returned score is **not a probability**; measurement coverage is **not a statistical confidence interval**. Height can be supplied but is not included in the ranking at this stage. Stretch, drape, posture and manufacturer-specific garment ease affect actual fit.

## Security and Privacy

The Python layer validates typed payloads, restricts number ranges, rejects unexpected fields, checks declared content lengths, and sets basic browser security headers. It stores no profiles, no measurements and no photos, and the UI includes no third-party analytics SDK.

Commercial deployment with real shoppers requires infrastructure rate limiting, robust streaming-request size enforcement, merchant data governance, monitoring, privacy/legal review, independent security assessment, and a real fitting accuracy study. This repository does not claim those external validations have already been completed.

## Deployment and CI

**Production URL:** https://universal-fasion-size.vercel.app/

Vercel uses Python Functions for the FastAPI backend and CDN-promoted assets for the frontend. The initial public deployment was **directly uploaded from the GitHub source** because Vercel's GitHub integration currently lacks permission to link this repository. New GitHub commits will **not** automatically redeploy until that integration is connected.

Read [Deployment Guide](docs/DEPLOYMENT.md) for required setup and verification checks. The GitHub Actions workflow checks Python compilation and API tests; its current outcome is available from the CI badge above.

## Roadmap

1. Obtain and version verified merchant garment charts.
2. Benchmark fit outcomes with diverse, consented real-world measurements.
3. Model fabric stretch, garment ease, style and uncertainty.
4. Create a secure merchant chart-management dashboard.
5. Add authentication and user-controlled saved profiles only where requested.
6. Investigate calibrated multi-view, opt-in body measurement with validation.
7. Perform abuse-control, accessibility, operational and independent security reviews.

## Continuity

- [Project Context](PROJECT_CONTEXT.md) — decisions, technology and known gaps.
- [Changelog](CHANGELOG.md) — release history.
- [Project Memory](memory/PROJECT_MEMORY_2026-11-04.md) — dated implementation and verification notes.
- [Repository GitHub Skills](.github/skills) — README and project-memory standards.

## Ownership and License

**Copyright © 2026 Md Najmul Hossain. All rights reserved.**

This public repository does **not** grant an open-source license. Use, modification, distribution or commercial exploitation requires written permission from the owner. See [LICENSE](LICENSE).

---

<p align="center"><strong>Universal Fashion Size</strong><br/>Python-first · Human-centered · Explainable by design<br/><a href="https://universal-fasion-size.vercel.app/">Live Website</a> · <a href="https://universal-fasion-size.vercel.app/api/docs">API Docs</a> · <a href="https://github.com/hossain0707/universal-fasion-size/issues">Issues</a></p>
