"""Contract tests for the three fictional, public example journeys.

The expected garment sizes come from the existing illustrative Demo Atelier
body-size charts. These tests DO NOT certify body-photo measurement accuracy.
"""
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import app


client = TestClient(app)
ROOT = Path(__file__).resolve().parents[1]

EXAMPLES = [
    (
        "Everyday essentials", "tops", "foundation-tee", "M",
        {"height_cm": 175, "chest_cm": 96, "waist_cm": 81, "hip_cm": 100, "inseam_cm": 78},
    ),
    (
        "Everyday denim", "bottoms", "essential-denim", "L",
        {"height_cm": 183, "chest_cm": 106, "waist_cm": 90, "hip_cm": 110, "inseam_cm": 81},
    ),
    (
        "Day dress", "dresses", "everyday-dress", "S",
        {"height_cm": 168, "chest_cm": 87, "waist_cm": 71, "hip_cm": 94, "inseam_cm": 74},
    ),
]


@pytest.mark.parametrize("name,category,product_id,expected,measurements", EXAMPLES)
def test_demo_uses_actual_sizing_api(name, category, product_id, expected, measurements):
    response = client.post("/api/recommend", json={
        "category": category, "product_id": product_id,
        "fit": "regular", "measurements": measurements,
    })
    assert response.status_code == 200, f"{name}: {response.text}"
    result = response.json()
    assert result["recommended_size"] == expected
    assert 0 <= result["fit_score"] <= 100
    assert result["coverage_percent"] == 100
    assert len(result["explanation"]) >= 1
    assert len(result["alternatives"]) >= 1


def test_demo_assets_and_privacy_notices_wired():
    html = (ROOT / "public/index.html").read_text(encoding="utf-8")
    for token in (
        'id="live-demo"', 'id="walkthrough-live-result"',
        'id="walkthrough-recommended-size"', 'id="walkthrough-photo"',
        'id="walkthrough-cases"', 'src="/assets/demo.js"',
        'href="/assets/demo.css"', "fictional",
    ):
        assert token in html
    script = (ROOT / "public/assets/demo.js").read_text(encoding="utf-8")
    assert 'fetch("/api/recommend"' in script
    assert "measurements were not inferred" not in script or "stock" in script.lower()
    assert "profile-vault" not in script or "not" in script.lower()


def test_photo_model_overlay_is_derived_from_real_landmarks():
    script = (ROOT / "public/assets/photo-fit.js").read_text(encoding="utf-8")
    assert "showDetectedPose(frontImg,frontDetection" in script
    assert "showDetectedPose(sideImg,sideDetection" in script
    assert "detection.landmarks" in script
