# Deployment and Verification

## Current public service

- Site: https://universal-fasion-size.vercel.app/
- Backend: Python 3.12, FastAPI, deployed as Vercel Functions
- Project: universal-fasion-size
- Team: najmuleee1996-6229s-projects
- Environment: production, Vercel hobby plan
- Public paths checked: homepage, /api/health, /api/catalog, /api/docs and /assets/app.js
- GitHub integration: not yet connected; the initial automatic link failed because Vercel lacks GitHub integration permission for this repository. Source was deployed directly from the reviewed GitHub files.

## To enable Git deployment

1. Open the project in Vercel Settings > Git.
2. Install or update the Vercel GitHub integration and grant it access to hossain0707/universal-fasion-size.
3. Link the repository, use main as the production branch, and FastAPI as the framework.
4. Verify preview deployments, the GitHub test workflow, the production API and the customer interaction.
5. Promote only after the complete end-to-end flow is validated.

## Smoke checks

~~~bash
curl -fsS https://universal-fasion-size.vercel.app/api/health
curl -fsS https://universal-fasion-size.vercel.app/api/catalog
curl -fsS https://universal-fasion-size.vercel.app/api/methodology
curl -fsS https://universal-fasion-size.vercel.app/api/recommend \
  -H "Content-Type: application/json" \
  -d '{"category":"tops","product_id":"foundation-tee","measurements":{"chest_cm":96,"waist_cm":81}}'
~~~

Check the form manually in a browser for tops, bottoms, dresses, inches, form reset, explained results, mobile layout and reduced motion.

## Critical deployment detail

Vercel promotes public assets to CDN and may exclude their physical directories from the Python bundle. An unconditional StaticFiles mount at import time causes an HTTP 500. Keep the conditional directory mount for local/Docker use; rely on the CDN in Vercel.

## Commercial release prerequisites

Actual retailer charts, validated fit accuracy, rate limits, robust streaming payload limits, audit logs, accessibility review, a security audit, monitoring and a privacy/legal review. The current public version is a functional demonstration rather than a verified fit guarantee.

## Observed verification — 2026-11-04

GitHub Actions Python API CI run [#1](https://github.com/hossain0707/universal-fasion-size/actions/runs/41772477606) completed successfully, including Python syntax compilation and pytest. A public browser journey exercised the real POST /api/recommend endpoint twice: Foundation Tee returned recommended size M, score 93.8/100; Essential Denim returned size M, score 95.4/100; both showed 100% measurement coverage, explanations and alternatives. No JavaScript/API error was observed. These results demonstrate execution, not scientific fit accuracy.
