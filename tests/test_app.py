from fastapi.testclient import TestClient
import copy

import src.app as app_module


# Snapshot the initial in-memory activities so tests can reset state
initial_activities = copy.deepcopy(app_module.activities)
client = TestClient(app_module.app)


def setup_function():
    # Reset the in-memory activities before each test to keep tests isolated
    app_module.activities = copy.deepcopy(initial_activities)


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # Ensure at least one documented activity exists
    assert "Chess Club" in data


def test_signup_and_unregister():
    activity = "Chess Club"
    email = "test_student@example.com"

    # Ensure clean start
    assert email not in app_module.activities[activity]["participants"]

    # Sign up
    resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp.status_code == 200
    assert email in app_module.activities[activity]["participants"]

    # Signing up again should fail (already signed up)
    resp_dup = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp_dup.status_code == 400

    # Unregister
    resp_un = client.delete(f"/activities/{activity}/participants?email={email}")
    assert resp_un.status_code == 200
    assert email not in app_module.activities[activity]["participants"]

    # Unregistering again should return 404
    resp_un2 = client.delete(f"/activities/{activity}/participants?email={email}")
    assert resp_un2.status_code == 404
