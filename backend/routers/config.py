from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from models.database import get_db
import uuid
import json
import httpx

router = APIRouter()


class ProviderCreate(BaseModel):
    name: str
    api_key: str
    api_base: str
    models: list[dict] = []
    is_default: bool = False


class ProviderUpdate(BaseModel):
    name: str | None = None
    api_key: str | None = None
    api_base: str | None = None
    models: list[dict] | None = None
    is_default: bool | None = None


@router.get("/providers")
async def list_providers(db=Depends(get_db)):
    cursor = await db.execute("SELECT * FROM providers ORDER BY is_default DESC, created_at DESC")
    rows = await cursor.fetchall()
    providers = []
    for row in rows:
        providers.append({
            "id": row["id"],
            "name": row["name"],
            "api_key": row["api_key"][:8] + "***" if len(row["api_key"]) > 8 else "***",
            "api_base": row["api_base"],
            "models": json.loads(row["models"]),
            "is_default": bool(row["is_default"]),
            "created_at": row["created_at"],
        })
    return {"success": True, "data": providers}


@router.post("/providers")
async def create_provider(req: ProviderCreate, db=Depends(get_db)):
    provider_id = f"prov_{uuid.uuid4().hex[:12]}"

    if req.is_default:
        await db.execute("UPDATE providers SET is_default = 0")

    await db.execute(
        "INSERT INTO providers (id, name, api_key, api_base, models, is_default) VALUES (?, ?, ?, ?, ?, ?)",
        (provider_id, req.name, req.api_key, req.api_base, json.dumps(req.models), int(req.is_default)),
    )
    await db.commit()

    return {"success": True, "data": {"id": provider_id, "name": req.name}}


@router.put("/providers/{provider_id}")
async def update_provider(provider_id: str, req: ProviderUpdate, db=Depends(get_db)):
    cursor = await db.execute("SELECT * FROM providers WHERE id = ?", (provider_id,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Provider not found")

    name = req.name if req.name is not None else row["name"]
    api_key = req.api_key if req.api_key is not None else row["api_key"]
    api_base = req.api_base if req.api_base is not None else row["api_base"]
    models = json.dumps(req.models) if req.models is not None else row["models"]
    is_default = int(req.is_default) if req.is_default is not None else row["is_default"]

    if is_default:
        await db.execute("UPDATE providers SET is_default = 0")

    await db.execute(
        "UPDATE providers SET name=?, api_key=?, api_base=?, models=?, is_default=? WHERE id=?",
        (name, api_key, api_base, models, is_default, provider_id),
    )
    await db.commit()
    return {"success": True}


@router.delete("/providers/{provider_id}")
async def delete_provider(provider_id: str, db=Depends(get_db)):
    cursor = await db.execute("SELECT * FROM providers WHERE id = ?", (provider_id,))
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Provider not found")

    await db.execute("DELETE FROM providers WHERE id = ?", (provider_id,))
    await db.commit()
    return {"success": True}


@router.get("/models")
async def list_models(db=Depends(get_db)):
    cursor = await db.execute("SELECT * FROM providers WHERE is_default = 1")
    default = await cursor.fetchone()

    if not default:
        cursor = await db.execute("SELECT * FROM providers LIMIT 1")
        default = await cursor.fetchone()

    if not default:
        return {"success": True, "data": []}

    models = json.loads(default["models"])
    return {
        "success": True,
        "data": [
            {"id": m["id"], "name": m["name"], "type": m.get("type", "basic"), "provider": default["name"]}
            for m in models
        ],
    }


@router.post("/test")
async def test_connection(req: ProviderCreate):
    try:
        async with httpx.AsyncClient(timeout=10.0, trust_env=False) as client:
            resp = await client.get(
                f"{req.api_base.rstrip('/')}/models",
                headers={"Authorization": f"Bearer {req.api_key}"},
            )
            if resp.status_code == 200:
                return {"success": True, "message": "连接成功"}
            return {"success": False, "message": f"HTTP {resp.status_code}: {resp.text[:200]}"}
    except Exception as e:
        return {"success": False, "message": str(e)}


async def get_default_provider(db):
    cursor = await db.execute("SELECT * FROM providers WHERE is_default = 1")
    row = await cursor.fetchone()
    if not row:
        cursor = await db.execute("SELECT * FROM providers LIMIT 1")
        row = await cursor.fetchone()
    return row
