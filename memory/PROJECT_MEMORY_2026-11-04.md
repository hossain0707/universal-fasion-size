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
