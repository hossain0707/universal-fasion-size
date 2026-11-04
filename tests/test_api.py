from fastapi.testclient import TestClient
from app import app

client = TestClient(app)


def base(category="tops", product_id="foundation-tee", **kwargs):
    measurements = {"chest_cm": 96, "waist_cm": 81, "hip_cm": 100, "inseam_cm": 78}
    return {"measurements": measurements, "category": category, "fit": "regular",
            "product_id": product_id, **kwargs}


def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_homepage():
    response = client.get("/")
    assert response.status_code == 200
    assert "Universal Fashion Size" in response.text


def test_catalog_demo_disclosure():
    data = client.get("/api/catalog").json()
    assert data["sample_data"] is True
    assert len(data["products"]) == 6
    assert "sizes" not in data["products"][0]


def test_product_chart():
    result = client.get("/api/catalog/foundation-tee")
    assert result.status_code == 200
    assert len(result.json()["sizes"]) == 6


def test_unknown_product():
    assert client.get("/api/catalog/unknown").status_code == 404


def test_recommendation_has_provenance():
    r = client.post("/api/recommend", json=base())
    assert r.status_code == 200
    data = r.json()
    assert data["recommended_size"] in {"XS", "S", "M", "L", "XL", "XXL"}
    assert data["chart_source"] == "sample"
    assert data["confidence"] == "high"
    assert data["fit_score"] >= 0
    assert len(data["explanation"]) == 2


def test_missing_measurements_rejected():
    payload = base()
    payload["measurements"] = {"height_cm": 180}
    assert client.post("/api/recommend", json=payload).status_code == 422


def test_invalid_measurements_rejected():
    payload = base()
    payload["measurements"]["chest_cm"] = -100
    assert client.post("/api/recommend", json=payload).status_code == 422


def test_missing_selection_rejected():
    payload = base()
    del payload["product_id"]
    assert client.post("/api/recommend", json=payload).status_code == 422


def test_cross_category_product_rejected():
    payload = base(category="dresses")
    assert client.post("/api/recommend", json=payload).status_code == 404


def test_custom_chart_works_without_storage():
    data = {
        "category": "tops", "fit": "regular",
        "measurements": {"chest_cm": 96},
        "custom_chart": {"name": "Merchant-supplied", "category": "tops", "sizes": [
            {"size": "Size 1", "measurements": {"chest_cm": {"min": 80, "max": 92}}},
            {"size": "Size 2", "measurements": {"chest_cm": {"min": 90, "max": 104}}},
        ]},
    }
    response = client.post("/api/recommend", json=data)
    assert response.status_code == 200
    assert response.json()["recommended_size"] == "Size 2"
    assert response.json()["chart_source"] == "user_supplied"


def test_custom_chart_duplicate_rejected():
    payload = {
        "category": "tops", "measurements": {"chest_cm": 90},
        "custom_chart": {"name": "Example", "category": "tops", "sizes": [
            {"size": "S", "measurements": {"chest_cm": {"min": 70, "max": 90}}},
            {"size": "s", "measurements": {"chest_cm": {"min": 90, "max": 110}}},
        ]},
    }
    assert client.post("/api/recommend", json=payload).status_code == 422


def test_invalid_range_rejected():
    payload = {
        "category": "tops", "measurements": {"chest_cm": 90},
        "custom_chart": {"name": "Example", "category": "tops", "sizes": [
            {"size": "A", "measurements": {"chest_cm": {"min": 100, "max": 90}}},
            {"size": "B", "measurements": {"chest_cm": {"min": 90, "max": 120}}},
        ]},
    }
    assert client.post("/api/recommend", json=payload).status_code == 422


def test_oversized_request():
    response = client.post("/api/recommend", data="x" * 64_001,
                           headers={"content-type": "application/json"})
    assert response.status_code == 413


def test_security_headers():
    response = client.get("/api/health")
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["cache-control"] == "no-store"


def test_methodology_discloses_limits():
    assert len(client.get("/api/methodology").json()["limits"]) >= 4
