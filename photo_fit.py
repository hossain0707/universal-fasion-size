"""Height-calibrated two-view silhouette geometry.

All input geometry is computed locally in the user's browser. No image bytes
are uploaded. Cross-sectional ellipse estimates are LOW-CONFIDENCE and must
not be used as confirmed clothing measurements before review.
"""
from __future__ import annotations

import math
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field, model_validator

router = APIRouter(prefix="/api/photo", tags=["photo-assessment"])


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Widths(Strict):
    chest: float = Field(gt=8, lt=900)
    waist: float = Field(gt=8, lt=900)
    hip: float = Field(gt=8, lt=900)


class Silhouette(Strict):
    body_height_px: float = Field(ge=150, le=5000)
    widths_px: Widths
    pose_quality: float = Field(ge=0, le=1)
    view: Literal["front", "side"]


class PhotoAssessment(Strict):
    height_cm: float = Field(ge=120, le=220)
    front: Silhouette
    side: Silhouette

    @model_validator(mode="after")
    def check_views(self):
        if self.front.view != "front" or self.side.view != "side":
            raise ValueError("Front and side captures must be in the correct order")
        return self


def ellipse_circumference(width_cm: float, depth_cm: float) -> float:
    """Ramanujan approximation for elliptical perimeter in centimetres."""
    a, b = width_cm / 2, depth_cm / 2
    h = ((a - b) ** 2) / ((a + b) ** 2)
    return math.pi * (a + b) * (1 + 3 * h / (10 + math.sqrt(4 - 3 * h)))


@router.post("/assess")
def assess(payload: PhotoAssessment):
    if min(payload.front.pose_quality, payload.side.pose_quality) < .60:
        raise HTTPException(status_code=422, detail="Pose quality is too low. Retake clear full-body photos.")
    result = {}
    for metric in ("chest", "waist", "hip"):
        fw = getattr(payload.front.widths_px, metric)
        sw = getattr(payload.side.widths_px, metric)
        front_cm = fw * payload.height_cm / payload.front.body_height_px
        side_cm = sw * payload.height_cm / payload.side.body_height_px
        if front_cm <= 10 or side_cm <= 7 or front_cm > 100 or side_cm > 85:
            raise HTTPException(status_code=422, detail=f"Unrealistic {metric} silhouette. Retake photos.")
        ratio = side_cm / front_cm
        if not .38 <= ratio <= 1.25:
            raise HTTPException(status_code=422, detail=f"Front/side {metric} views are inconsistent. Retake photos.")
        circumference = ellipse_circumference(front_cm, side_cm)
        if not 40 <= circumference <= 220:
            raise HTTPException(status_code=422, detail=f"Estimated {metric} outside plausible range.")
        # Wide uncertainty because camera perspective, garments, pose and
        # ellipse assumption are uncontrolled. NOT a confidence interval.
        margin = .23
        result[f"{metric}_cm"] = {
            "estimate": round(circumference, 1),
            "rough_range": [round(circumference * (1 - margin), 1),
                            round(circumference * (1 + margin), 1)],
            "source": "two_view_photo_estimate",
        }
    return {
        "status": "requires_user_review",
        "measurements": result,
        "calibration": "known user height and two person segmentation silhouettes",
        "quality": "low",
        "photo_upload": False,
        "advisory": (
            "Rough image-derived estimates only. Range is an illustrative error allowance, "
            "not validated uncertainty. Never treat these as exact body measurements. "
            "Review with a measuring tape before shopping or saving a verified profile."
        ),
        "limitations": [
            "Perspective, clothing thickness and camera placement introduce errors.",
            "Two projected widths and an ellipse approximation do not determine true anatomy.",
            "Inseam and shoulder measurements cannot be reliably computed by this method.",
            "Do not use these estimates for made-to-measure tailoring.",
        ],
    }
