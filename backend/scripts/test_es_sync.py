import asyncio
import json
from sqlalchemy import text
from app.database import AsyncSessionLocal
from app.crud.search.search_repository import elasticsearch_search_repository

def to_iso(dt_str):
    if not dt_str:
        return None
    s = str(dt_str).strip()
    return s.replace(" ", "T") if " " in s else s

async def check_all():
    async with AsyncSessionLocal() as db:
        bulk_docs = []
        # 1. Incidents
        sql_inc = text("""
            SELECT incident_id::text AS incident_id, tracking_code, title, description, 
                   address_text, latitude::float AS latitude, longitude::float AS longitude, 
                   severity, status, created_at::text AS created_at 
            FROM incidents 
            WHERE deleted_at IS NULL 
            LIMIT 500
        """)
        res_inc = await db.execute(sql_inc)
        for row in res_inc.mappings():
            m = dict(row)
            bulk_docs.append({
                "entity_id": m["incident_id"],
                "entity_type": "incident",
                "code": m.get("tracking_code"),
                "title": m["title"],
                "description": m.get("description"),
                "category": "Sự cố môi trường",
                "status": m.get("status"),
                "priority": m.get("severity"),
                "address": m.get("address_text"),
                "district": None,
                "location": {"lat": m["latitude"], "lon": m["longitude"]} if m.get("latitude") and m.get("longitude") else None,
                "created_at": to_iso(m.get("created_at")),
            })

        # 2. Events
        sql_ev = text("""
            SELECT event_id::text AS event_id, title, description, address, district, 
                   latitude::float AS latitude, longitude::float AS longitude, status, created_at::text AS created_at 
            FROM events 
            WHERE is_deleted = false 
            LIMIT 500
        """)
        res_ev = await db.execute(sql_ev)
        for row in res_ev.mappings():
            m = dict(row)
            bulk_docs.append({
                "entity_id": m["event_id"],
                "entity_type": "event",
                "code": f"EV-{m['event_id'][:6].upper()}",
                "title": m["title"],
                "description": m.get("description"),
                "category": "Chủ Nhật Xanh",
                "status": m.get("status"),
                "priority": "NORMAL",
                "address": m.get("address"),
                "district": m.get("district"),
                "location": {"lat": m["latitude"], "lon": m["longitude"]} if m.get("latitude") and m.get("longitude") else None,
                "created_at": to_iso(m.get("created_at")),
            })

        # 3. Handbook
        sql_wb = text("""
            SELECT item_id, name, category_code, sorting_guide, bin_name, safety_notes, created_at::text AS created_at 
            FROM waste_handbook_items 
            WHERE is_active = true 
            LIMIT 500
        """)
        res_wb = await db.execute(sql_wb)
        for row in res_wb.mappings():
            m = dict(row)
            desc = f"{m.get('sorting_guide', '')}. Thùng rác: {m.get('bin_name', '')}. Lưu ý: {m.get('safety_notes', '')}"
            bulk_docs.append({
                "entity_id": str(m["item_id"]),
                "entity_type": "handbook",
                "code": m.get("category_code"),
                "title": m["name"],
                "description": desc,
                "category": m.get("category_code"),
                "status": "ACTIVE",
                "priority": "LOW",
                "address": "Hướng dẫn phân loại tại nguồn",
                "district": "TP.HCM",
                "location": None,
                "created_at": to_iso(m.get("created_at")),
            })

        print("Total docs to index:", len(bulk_docs))
        bulk_payload = ""
        for doc in bulk_docs:
            meta = {"index": {"_index": "greenspot_search_v1", "_id": f"{doc['entity_type']}_{doc['entity_id']}"}}
            bulk_payload += json.dumps(meta) + "\n" + json.dumps(doc) + "\n"

        async with elasticsearch_search_repository._get_client() as client:
            resp = await client.post("/_bulk", content=bulk_payload, headers={"Content-Type": "application/x-ndjson"})
            data = resp.json()
            print("Bulk errors:", data.get("errors"))
            if data.get("errors"):
                errors = [it for it in data.get("items", []) if it.get("index", {}).get("error")]
                print("First error:", json.dumps(errors[0] if errors else {}, indent=2))
            else:
                print("SUCCESS: All docs indexed successfully!")

if __name__ == "__main__":
    asyncio.run(check_all())
