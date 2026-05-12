import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport


@pytest_asyncio.fixture
async def client():
    from main import app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_version(client):
    resp = await client.get("/api/version")
    assert resp.status_code == 200
    data = resp.json()
    assert "version" in data
    parts = data["version"].split(".")
    assert len(parts) == 3


@pytest.mark.asyncio
async def test_preset_voices(client):
    resp = await client.get("/api/voices/presets")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert len(data["data"]) == 9
    assert data["data"][0]["id"] == "mimo_default"


@pytest.mark.asyncio
async def test_config_providers_empty(client):
    resp = await client.get("/api/config/providers")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True


@pytest.mark.asyncio
async def test_batch_list(client):
    resp = await client.get("/api/batch/list")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True


@pytest.mark.asyncio
async def test_history(client):
    resp = await client.get("/api/history?page=1&limit=10")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True


@pytest.mark.asyncio
async def test_update_check(client):
    resp = await client.get("/api/update/check")
    assert resp.status_code == 200
    data = resp.json()
    assert "current" in data
    assert "has_update" in data
