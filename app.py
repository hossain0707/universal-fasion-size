"""Universal Fashion Size API.

Privacy-first, explainable sizing recommendations. Sample charts are explicitly
demonstration data and must not be presented as retailer-provided measurements.
"""
from __future__ import annotations

from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, model_validator

ROOT = Path(__file__).resolve().parent
VERSION = "1.0.0"
SIZES = ("XS", "S", "M", "L", "XL", "XXL")
Metric = Literal["chest_cm", "waist_cm", "hip_cm", "inseam_cm"]
Category = Literal["tops", "bottoms", "dresses"]
Fit = Literal["slim", "regular", "relaxed"]

METRICS: dict[str, dict[str, float]] = {
    "tops": {"chest_cm": 0.70, "waist_cm": 0.30},
    "bottoms": {"waist_cm": 0.55, "hip_cm": 0.35, "inseam_cm": 0.10},
    "dresses": {"chest_cm": 0.40, "waist_cm": 0.30, "hip_cm": 0.30},
}
METRIC_LABELS = {
    "chest_cm": "chest", "waist_cm": "waist",
    "hip_cm": "hips", "inseam_cm": "inseam",
}
# All measurements are BODY measurements in centimetres, not garment dimensions.
DEMO_BASE = {
    "chest_cm": (76, 84, 92, 100, 108, 116),
    "waist_cm": (58, 66, 74, 82, 90, 98),
    "hip_cm": (80, 88, 96, 104, 112, 120),
    "inseam_cm": (68, 68, 68, 68, 68, 68),
}
DEMO_SPAN = {"chest_cm": 12, "waist_cm": 12, "hip_cm": 12, "inseam_cm": 20}


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Measurements(StrictModel):
    chest_cm: float | None = Field(default=None, ge=45, le=200)
    waist_cm: float | None = Field(default=None, ge=40, le=200)
    hip_cm: float | None = Field(default=None, ge=45, le=220)
    inseam_cm: float | None = Field(default=None, ge=35, le=110)
    height_cm: float | None = Field(default=None, ge=100, le=240)


class Range(StrictModel):
    min: float = Field(ge=20, le=250)
    max: float = Field(ge=20, le=250)

    @model_validator(mode="after")
    def ordered(self):
        if self.min >= self.max:
            raise ValueError("Every range must have min < max")
        return self


class SizeRow(StrictModel):
    size: str = Field(min_length=1, max_length=20, pattern=r"^[A-Za-z0-9 +./-]+$")
    measurements: dict[Metric, Range] = Field(min_length=1, max_length=4)


class CustomChart(StrictModel):
    name: str = Field(min_length=2, max_length=100)
    category: Category
    sizes: list[SizeRow] = Field(min_length=2, max_length=30)

    @model_validator(mode="after")
    def no_duplicate_sizes(self):
        labels = [row.size.casefold() for row in self.sizes]
        if len(labels) != len(set(labels)):
            raise ValueError("Duplicate size labels are not allowed")
        if not any(any(metric in row.measurements for metric in METRICS[self.category]) for row in self.sizes):
            raise ValueError("No relevant measurement ranges were provided")
        return self


class RecommendationRequest(StrictModel):
    measurements: Measurements
    category: Category
    fit: Fit = "regular"
    product_id: str | None = Field(default=None, max_length=80, pattern=r"^[a-z0-9-]+$")
    custom_chart: CustomChart | None = None

    @model_validator(mode="after")
    def validate_chart_selection(self):
        if (self.product_id is None) == (self.custom_chart is None):
            raise ValueError("Provide exactly one of product_id or custom_chart")
        if self.custom_chart is not None and self.custom_chart.category != self.category:
            raise ValueError("Custom chart category must match requested category")
        return self


def sample_chart(category: str) -> list[dict]:
    rows = []
    for i, size in enumerate(SIZES):
        ranges = {}
        for metric in METRICS[category]:
            minimum = DEMO_BASE[metric][i]
            ranges[metric] = {"min": minimum, "max": minimum + DEMO_SPAN[metric]}
        rows.append({"size": size, "measurements": ranges})
    return rows


PRODUCTS = [
    {"id": "foundation-tee", "name": "Foundation Tee", "brand": "Demo Atelier",
     "category": "tops", "type": "Everyday / Unisex", "color": "#cbd5e1",
     "tag": "Cotton essentials", "sizes": sample_chart("tops")},
    {"id": "tailored-shirt", "name": "Tailored Shirt", "brand": "Demo Atelier",
     "category": "tops", "type": "Structured / Unisex", "color": "#c0b7aa",
     "tag": "Modern tailoring", "sizes": sample_chart("tops")},
    {"id": "essential-denim", "name": "Essential Denim", "brand": "Demo Atelier",
     "category": "bottoms", "type": "Straight leg", "color": "#5b7791",
     "tag": "Everyday denim", "sizes": sample_chart("bottoms")},
    {"id": "wide-leg-trouser", "name": "Wide Leg Trouser", "brand": "Demo Atelier",
     "category": "bottoms", "type": "Relaxed tailoring", "color": "#c8b3a5",
     "tag": "Contemporary fit", "sizes": sample_chart("bottoms")},
    {"id": "everyday-dress", "name": "Everyday Dress", "brand": "Demo Atelier",
     "category": "dresses", "type": "Day dress", "color": "#d1a9a1",
     "tag": "Easy silhouette", "sizes": sample_chart("dresses")},
    {"id": "wrap-dress", "name": "Wrap Dress", "brand": "Demo Atelier",
     "category": "dresses", "type": "Wrap fit", "color": "#a7a3c0",
     "tag": "Adaptable style", "sizes": sample_chart("dresses")},
]
PRODUCTS_BY_ID = {p["id"]: p for p in PRODUCTS}


def rank_sizes(measurements: Measurements, category: Category, fit: Fit,
               chart: list[SizeRow]) -> dict:
    weights = METRICS[category]
    provided = {metric: getattr(measurements, metric) for metric in weights
                if getattr(measurements, metric) is not None}
    if not provided:
        raise HTTPException(
            status_code=422,
            detail=f"Add at least one of: {', '.join(METRIC_LABELS[m] for m in weights)}",
        )
    # Fit preference changes the target body allowance, not the user's measurements.
    # These are heuristic adjustments, not validated garment-specific ease.
    ease = {"slim": -1.0, "regular": 0.0, "relaxed": 3.0}[fit]
    weighted_total = sum(weights[m] for m in provided)
    results = []
    for row in chart:
        total_score, total_weight, details = 0.0, 0.0, []
        for metric, actual in provided.items():
            limits = row.measurements.get(metric)
            if not limits:
                continue
            target = actual + (0 if metric == "inseam_cm" else ease)
            midpoint = (limits.min + limits.max) / 2
            halfwidth = (limits.max - limits.min) / 2
            distance = abs(target - midpoint) / max(halfwidth, 1)
            # Center of body size band scores 100. Beyond band score drops smoothly.
            dimension_score = max(0.0, 100 - 22 * distance - 30 * max(0, distance - 1))
            weight = weights[metric]
            total_score += weight * dimension_score
            total_weight += weight
            relation = ("within range" if limits.min <= target <= limits.max
                        else "above range" if target > limits.max else "below range")
            details.append({"measurement": metric, "body_cm": round(actual, 1),
                            "size_min_cm": limits.min, "size_max_cm": limits.max,
                            "assessment": relation})
        if total_weight:
            score = round(total_score / total_weight, 1)
            results.append({"size": row.size, "score": score, "details": details,
                            "rank_index": len(results)})
    if not results:
        raise HTTPException(status_code=422, detail="Size chart has no usable ranges for your measurements")
    # Ties are resolved by the size-chart order.
    results.sort(key=lambda x: (-x["score"], x["rank_index"]))
    best = results[0]
    covered_weight = sum(weights[m] for m in provided if any(m in r.measurements for r in chart))
    coverage = round(100 * covered_weight / sum(weights.values()))
    confidence = "high" if coverage >= 90 else "moderate" if coverage >= 60 else "limited"
    explanation = [
        f"{METRIC_LABELS[item['measurement']].capitalize()}: "
        f"{item['body_cm']:g} cm; this chart's {best['size']} body range is "
        f"{item['size_min_cm']:g}–{item['size_max_cm']:g} cm ({item['assessment']})."
        for item in best["details"]
    ]
    return {
        "recommended_size": best["size"], "fit_score": best["score"],
        "confidence": confidence, "coverage_percent": coverage,
        "alternatives": [{"size": x["size"], "fit_score": x["score"]} for x in results[1:4]],
        "explanation": explanation,
        "fit_preference": fit,
        "evaluated_sizes": len(results),
        "disclaimer": "Size guidance only. Check the seller's actual measurements and return policy before purchasing.",
    }


app = FastAPI(
    title="Universal Fashion Size API",
    description="Explainable, privacy-first clothing size recommendations with explicit chart provenance.",
    version=VERSION,
    docs_url="/api/docs", redoc_url=None, openapi_url="/api/openapi.json",
)


@app.middleware("http")
async def headers_and_limits(request: Request, call_next):
    if request.method in {"POST", "PUT", "PATCH"}:
        raw_length = request.headers.get("content-length")
        if raw_length:
            try:
                if int(raw_length) > 64_000:
                    return JSONResponse({"detail": "Payload too large"}, status_code=413)
            except ValueError:
                return JSONResponse({"detail": "Invalid content length"}, status_code=400)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if request.url.path.startswith("/api/") and request.url.path not in ("/api/catalog",):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/api/health", tags=["system"])
def health():
    return {"status": "ok", "version": VERSION, "engine": "deterministic", "storage": "none"}


@app.get("/api/catalog", tags=["catalog"])
def catalog():
    return {
        "products": [
            {key: value for key, value in product.items() if key != "sizes"}
            for product in PRODUCTS
        ],
        "sample_data": True,
        "notice": "All Demo Atelier charts are illustrative. No real retailer data or integrations.",
    }


@app.get("/api/catalog/{product_id}", tags=["catalog"])
def product_chart(product_id: str):
    if product_id not in PRODUCTS_BY_ID:
        raise HTTPException(status_code=404, detail="Unknown product")
    return {**PRODUCTS_BY_ID[product_id], "sample_data": True}


@app.post("/api/recommend", tags=["sizing"])
def recommend(payload: RecommendationRequest):
    if payload.custom_chart is not None:
        chart = payload.custom_chart.sizes
        name = payload.custom_chart.name
        sample = False
    else:
        product = PRODUCTS_BY_ID.get(payload.product_id)
        if product is None or product["category"] != payload.category:
            raise HTTPException(status_code=404, detail="Product not found in this category")
        chart = [SizeRow.model_validate(item) for item in product["sizes"]]
        name = product["name"]
        sample = True
    result = rank_sizes(payload.measurements, payload.category, payload.fit, chart)
    return {**result, "product": name, "category": payload.category,
            "chart_source": "sample" if sample else "user_supplied",
            "notices": ["Illustrative sample sizing; not retailer-verified."] if sample else []}


@app.get("/api/methodology", tags=["system"])
def methodology():
    return {
        "method": "weighted deterministic distance to body-size range centers",
        "required": {k: list(v) for k, v in METRICS.items()},
        "limits": [
            "Body measurements must be measured, not inferred from a photo.",
            "Sample charts are illustrative and are not merchant-verified.",
            "Fabric stretch, garment ease and individual proportions may affect fit.",
            "Fit score is a heuristic ranking, not a calibrated probability.",
            "No body measurements or uploaded images are stored by the service.",
        ],
    }


@app.get("/", include_in_schema=False)
def homepage():
    return FileResponse(ROOT / "public" / "index.html", media_type="text/html",
                        headers={"Cache-Control": "public, max-age=300"})


# Vercel promotes public/assets to CDN and excludes that folder from the Python bundle.
# Mount only when the physical directory exists (local development / Docker).
if (ROOT / "public" / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=ROOT / "public" / "assets"), name="assets")
