from fastapi.testclient import TestClient
from app import app

client = TestClient(app)


def sample():
    return {
        "height_cm": 173,
        "front": {"view": "front", "body_height_px": 530, "pose_quality": 0.88,
                  "widths_px": {"chest": 118, "waist": 107, "hip": 123}},
        "side": {"view": "side", "body_height_px": 525, "pose_quality": 0.91,
                 "widths_px": {"chest": 76, "waist": 68, "hip": 85}}
    }


def test_two_view_estimator_returns_uncertainty_not_guarantee():
    response = client.post("/api/photo/assess", json=sample())
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] == "requires_user_review"
    assert data["quality"] == "low"
    assert data["photo_upload"] is False
    assert 80 < data["measurements"]["chest_cm"]["estimate"] < 125
    assert "inseam_cm" not in data["measurements"]
    assert len(data["measurements"]["waist_cm"]["rough_range"]) == 2


def test_wrong_views_rejected():
    payload = sample()
    payload["side"]["view"] = "front"
    assert client.post("/api/photo/assess", json=payload).status_code == 422


def test_low_quality_rejected():
    payload = sample()
    payload["front"]["pose_quality"] = 0.42
    assert client.post("/api/photo/assess", json=payload).status_code == 422


def test_unrealistic_width_rejected():
    payload = sample()
    payload["front"]["widths_px"]["chest"] = 500
    assert client.post("/api/photo/assess", json=payload).status_code == 422


def test_excess_input_rejected():
    payload = sample()
    payload["extra"] = "Do not accept this"
    assert client.post("/api/photo/assess", json=payload).status_code == 422
