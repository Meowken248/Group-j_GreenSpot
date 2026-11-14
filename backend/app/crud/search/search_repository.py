"""
Triển khai Data Access / Persistence Layer cho Elasticsearch Search Engine.
Tuân thủ Clean Architecture Tầng 4: Persistence Layer (100% Explicit SQL & PostGIS).
"""

import json
import logging
import math
import time
from typing import Any, Dict, List, Optional
import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.interface.search.search_interface import ISearchRepository
from app.schemas.search.schemas import (
    GlobalSearchRequest,
    GlobalSearchResultItem,
    GlobalSearchResponse,
    AutocompleteItem,
    AutocompleteResponse,
    ClusterHealthResponse,
)

logger = logging.getLogger(__name__)


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Tính cự ly Haversine giữa 2 tọa độ GPS (km)."""
    rad = math.pi / 180.0
    dlat = (lat2 - lat1) * rad
    dlon = (lon2 - lon1) * rad
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(lat1 * rad) * math.cos(lat2 * rad) * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(6371.0 * c, 2)


def resolve_entity_url(entity_type: str, entity_id: str) -> str:
    """Ánh xạ URL điều hướng Frontend cho từng loại thực thể."""
    routes = {
        "incident": f"/triage?id={entity_id}",
        "event": f"/events?id={entity_id}",
        "post": f"/posts?id={entity_id}",
        "sos": f"/flood-sos?id={entity_id}",
        "hotspot": f"/hotspots?id={entity_id}",
        "handbook": f"/handbook?id={entity_id}",
        "penalty": f"/penalties?id={entity_id}",
    }
    return routes.get(entity_type, f"/detail/{entity_type}/{entity_id}")


def parse_iso_date(dt_val: Any) -> Optional[str]:
    """Chuẩn hóa ngày giờ sang chuẩn ISO-8601 tương thích Elasticsearch."""
    if not dt_val:
        return None
    s = str(dt_val).strip()
    if " " in s:
        s = s.replace(" ", "T", 1)
    if s.endswith("+00"):
        s = s[:-3] + "Z"
    elif s.endswith("+00:00"):
        s = s[:-6] + "Z"
    elif s.endswith("+0000"):
        s = s[:-5] + "Z"
    return s


class ElasticsearchSearchRepository(ISearchRepository):
    """
    Thực thi kết nối, lập chỉ mục và truy vấn Elasticsearch 8.x.
    Hỗ trợ kết nối qua HTTP/HTTPS REST API của Elasticsearch, tích hợp Custom Vietnamese Analyzer.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
        index_name: Optional[str] = None,
    ):
        self.base_url = (base_url or settings.ELASTICSEARCH_URL).rstrip("/")
        self.username = username or getattr(settings, "ELASTICSEARCH_USER", "elastic")
        self.password = password or getattr(settings, "ELASTICSEARCH_PASSWORD", "GreenSpotSecure2026!")
        self.index_name = index_name or getattr(settings, "ELASTICSEARCH_INDEX", "greenspot_search_v1")
        self.auth = (self.username, self.password) if self.username and self.password else None

    def _get_client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            base_url=self.base_url,
            auth=self.auth,
            verify=False,
            timeout=8.0,
        )

    async def ensure_index_and_mapping(self) -> bool:
        """Khởi tạo Index và thiết lập Vietnamese Custom Analyzer + Edge N-gram Autocomplete."""
        mapping_payload = {
            "settings": {
                "number_of_shards": 1,
                "number_of_replicas": 1,
                "analysis": {
                    "filter": {
                        "vietnamese_stop": {
                          "type": "stop",
                          "stopwords": ["và", "hoặc", "của", "tại", "ở", "cho", "các", "những", "được", "bị", "trong"]
                        },
                        "edge_ngram_filter": {
                            "type": "edge_ngram",
                            "min_gram": 2,
                            "max_gram": 15
                        }
                    },
                    "analyzer": {
                        "vietnamese_fulltext": {
                            "type": "custom",
                            "tokenizer": "standard",
                            "filter": [
                                "lowercase",
                                "asciifolding",
                                "vietnamese_stop"
                            ]
                        },
                        "autocomplete_analyzer": {
                            "type": "custom",
                            "tokenizer": "standard",
                            "filter": [
                                "lowercase",
                                "asciifolding",
                                "edge_ngram_filter"
                            ]
                        },
                        "autocomplete_search": {
                            "type": "custom",
                            "tokenizer": "standard",
                            "filter": [
                                "lowercase",
                                "asciifolding"
                            ]
                        }
                    }
                }
            },
            "mappings": {
                "dynamic": "strict",
                "properties": {
                    "entity_id": { "type": "keyword" },
                    "entity_type": { "type": "keyword" },
                    "code": { "type": "keyword" },
                    "title": {
                        "type": "text",
                        "analyzer": "vietnamese_fulltext",
                        "fields": {
                            "raw": { "type": "keyword" },
                            "autocomplete": {
                                "type": "text",
                                "analyzer": "autocomplete_analyzer",
                                "search_analyzer": "autocomplete_search"
                            }
                        }
                    },
                    "description": {
                        "type": "text",
                        "analyzer": "vietnamese_fulltext"
                    },
                    "category": { "type": "keyword" },
                    "status": { "type": "keyword" },
                    "priority": { "type": "keyword" },
                    "address": {
                        "type": "text",
                        "analyzer": "vietnamese_fulltext",
                        "fields": { "raw": { "type": "keyword" } }
                    },
                    "district": { "type": "keyword" },
                    "location": { "type": "geo_point" },
                    "author_id": { "type": "keyword" },
                    "author_name": {
                        "type": "text",
                        "fields": { "raw": { "type": "keyword" } }
                    },
                    "created_at": {
                        "type": "date",
                        "format": "strict_date_optional_time||yyyy-MM-dd HH:mm:ssZZ||yyyy-MM-dd HH:mm:ss||epoch_millis"
                    },
                    "updated_at": {
                        "type": "date",
                        "format": "strict_date_optional_time||yyyy-MM-dd HH:mm:ssZZ||yyyy-MM-dd HH:mm:ss||epoch_millis"
                    }
                }
            }
        }

        async with self._get_client() as client:
            try:
                # Kiểm tra xem Index đã tồn tại chưa
                head_res = await client.head(f"/{self.index_name}")
                if head_res.status_code == 200:
                    logger.info(f"Index {self.index_name} đã sẵn sàng.")
                    return True

                # Nếu chưa có, tạo mới Index kèm Mapping
                create_res = await client.put(f"/{self.index_name}", json=mapping_payload)
                if create_res.status_code in (200, 201):
                    logger.info(f"Khởi tạo thành công Index {self.index_name} kèm Vietnamese Analyzer.")
                    return True
                else:
                    logger.error(f"Lỗi khởi tạo Index {self.index_name}: {create_res.text}")
                    return False
            except Exception as e:
                logger.warning(f"Không thể kết nối Elasticsearch khi khởi tạo index: {e}")
                return False

    async def search_global(self, req: GlobalSearchRequest) -> GlobalSearchResponse:
        """Thực thi tìm kiếm toàn cục đa thực thể với độ chính xác cấu hình từ .env."""
        start_time = time.perf_counter()

        fuzziness_val = getattr(settings, "ELASTICSEARCH_FUZZINESS", "AUTO")
        min_should_match_val = getattr(settings, "ELASTICSEARCH_MIN_SHOULD_MATCH", "70%")
        min_score_val = float(getattr(settings, "ELASTICSEARCH_MIN_SCORE", 0.5))

        must_clause: List[Dict[str, Any]] = [
            {
                "bool": {
                    "should": [
                        {"term": {"code": {"value": req.q.upper(), "boost": 6.0}}},
                        {"match": {"title.autocomplete": {"query": req.q, "boost": 4.5}}},
                        {
                            "match": {
                                "title": {
                                    "query": req.q,
                                    "boost": 3.5,
                                    "fuzziness": fuzziness_val,
                                    "minimum_should_match": min_should_match_val,
                                }
                            }
                        },
                        {
                            "match": {
                                "description": {
                                    "query": req.q,
                                    "boost": 1.8,
                                    "fuzziness": fuzziness_val,
                                    "minimum_should_match": min_should_match_val,
                                }
                            }
                        },
                        {
                            "match": {
                                "address": {
                                    "query": req.q,
                                    "boost": 1.5,
                                    "fuzziness": fuzziness_val,
                                }
                            }
                        },
                        {"match": {"category": {"query": req.q, "boost": 2.0}}},
                    ],
                    "minimum_should_match": 1,
                }
            }
        ]

        filter_clause: List[Dict[str, Any]] = []

        if req.entity_types:
            filter_clause.append({"terms": {"entity_type": req.entity_types}})

        if req.district:
            filter_clause.append({"term": {"district": req.district}})

        if req.status:
            filter_clause.append({"term": {"status": req.status}})

        if req.lat is not None and req.lon is not None and req.radius_km:
            filter_clause.append({
                "geo_distance": {
                    "distance": f"{req.radius_km}km",
                    "location": {
                        "lat": req.lat,
                        "lon": req.lon
                    }
                }
            })

        from_offset = (req.page - 1) * req.page_size
        dsl_body = {
            "from": from_offset,
            "size": req.page_size,
            "min_score": min_score_val,
            "query": {
                "bool": {
                    "must": must_clause,
                    "filter": filter_clause,
                }
            },
            "highlight": {
                "fields": {
                    "title": {"number_of_fragments": 1},
                    "description": {"number_of_fragments": 2, "fragment_size": 150},
                },
                "pre_tags": ["<mark>"],
                "post_tags": ["</mark>"],
            },
        }

        async with self._get_client() as client:
            try:
                res = await client.post(f"/{self.index_name}/_search", json=dsl_body)
                if res.status_code != 200:
                    logger.error(f"Elasticsearch search error: {res.status_code} - {res.text}")
                    return GlobalSearchResponse(
                        items=[],
                        total=0,
                        page=req.page,
                        page_size=req.page_size,
                        total_pages=0,
                        took_ms=int((time.perf_counter() - start_time) * 1000),
                    )

                data = res.json()
                total_hits = data.get("hits", {}).get("total", {}).get("value", 0)
                raw_hits = data.get("hits", {}).get("hits", [])

                items: List[GlobalSearchResultItem] = []
                for hit in raw_hits:
                    src = hit.get("_source", {})
                    highlights = hit.get("highlight", {})

                    hl_title = highlights.get("title", [None])[0]
                    hl_desc = highlights.get("description", [None])[0]

                    # Tính khoảng cách GPS nếu người dùng truyền vị trí
                    dist_km: Optional[float] = None
                    doc_loc = src.get("location")
                    if req.lat is not None and req.lon is not None and doc_loc:
                        d_lat = doc_loc.get("lat")
                        d_lon = doc_loc.get("lon")
                        if d_lat is not None and d_lon is not None:
                            dist_km = haversine_distance_km(req.lat, req.lon, d_lat, d_lon)

                    items.append(
                        GlobalSearchResultItem(
                            entity_id=src.get("entity_id", ""),
                            entity_type=src.get("entity_type", "unknown"),
                            code=src.get("code"),
                            title=src.get("title", ""),
                            description=src.get("description"),
                            highlight_title=hl_title,
                            highlight_description=hl_desc,
                            category=src.get("category"),
                            status=src.get("status"),
                            priority=src.get("priority"),
                            address=src.get("address"),
                            district=src.get("district"),
                            latitude=doc_loc.get("lat") if doc_loc else None,
                            longitude=doc_loc.get("lon") if doc_loc else None,
                            distance_km=dist_km,
                            created_at=src.get("created_at"),
                            url_path=resolve_entity_url(src.get("entity_type", ""), src.get("entity_id", "")),
                            score=hit.get("_score", 0.0),
                        )
                    )

                total_pages = (total_hits + req.page_size - 1) // req.page_size if req.page_size > 0 else 0
                return GlobalSearchResponse(
                    items=items,
                    total=total_hits,
                    page=req.page,
                    page_size=req.page_size,
                    total_pages=total_pages,
                    took_ms=int((time.perf_counter() - start_time) * 1000),
                )
            except Exception as e:
                logger.warning(f"Lỗi truy vấn tìm kiếm Elasticsearch: {e}")
                return GlobalSearchResponse(
                    items=[],
                    total=0,
                    page=req.page,
                    page_size=req.page_size,
                    total_pages=0,
                    took_ms=int((time.perf_counter() - start_time) * 1000),
                )

    async def autocomplete(
        self,
        query: str,
        entity_types: Optional[List[str]] = None,
        limit: int = 8,
    ) -> AutocompleteResponse:
        """Gợi ý tìm kiếm tức thời theo cụm từ bắt đầu (Edge N-gram)."""
        start_time = time.perf_counter()
        if not query.strip():
            return AutocompleteResponse(query=query, suggestions=[], took_ms=0)

        must_clause: List[Dict[str, Any]] = [
            {
                "match": {
                    "title.autocomplete": {
                        "query": query,
                        "operator": "and",
                    }
                }
            }
        ]

        filter_clause: List[Dict[str, Any]] = []
        if entity_types:
            filter_clause.append({"terms": {"entity_type": entity_types}})

        dsl_body = {
            "size": limit,
            "query": {
                "bool": {
                    "must": must_clause,
                    "filter": filter_clause,
                }
            },
            "_source": ["entity_id", "entity_type", "code", "title", "category"],
        }

        async with self._get_client() as client:
            try:
                res = await client.post(f"/{self.index_name}/_search", json=dsl_body)
                if res.status_code != 200:
                    return AutocompleteResponse(query=query, suggestions=[], took_ms=int((time.perf_counter() - start_time) * 1000))

                raw_hits = res.json().get("hits", {}).get("hits", [])
                suggestions = [
                    AutocompleteItem(
                        text=h["_source"].get("title", ""),
                        entity_type=h["_source"].get("entity_type", ""),
                        entity_id=h["_source"].get("entity_id", ""),
                        code=h["_source"].get("code"),
                        category=h["_source"].get("category"),
                        url_path=resolve_entity_url(h["_source"].get("entity_type", ""), h["_source"].get("entity_id", "")),
                    )
                    for h in raw_hits
                ]

                return AutocompleteResponse(
                    query=query,
                    suggestions=suggestions,
                    took_ms=int((time.perf_counter() - start_time) * 1000),
                )
            except Exception as e:
                logger.warning(f"Lỗi gợi ý tìm kiếm: {e}")
                return AutocompleteResponse(query=query, suggestions=[], took_ms=int((time.perf_counter() - start_time) * 1000))

    async def index_document(
        self,
        doc_id: str,
        document: Dict[str, Any],
        index_name: Optional[str] = None,
    ) -> bool:
        """Lập chỉ mục một tài liệu đơn lẻ."""
        target_index = index_name or self.index_name
        async with self._get_client() as client:
            try:
                res = await client.put(f"/{target_index}/_doc/{doc_id}", json=document)
                return res.status_code in (200, 201)
            except Exception as e:
                logger.error(f"Lỗi lập chỉ mục tài liệu {doc_id}: {e}")
                return False

    async def delete_document(
        self,
        doc_id: str,
        index_name: Optional[str] = None,
    ) -> bool:
        """Xóa tài liệu khỏi chỉ mục."""
        target_index = index_name or self.index_name
        async with self._get_client() as client:
            try:
                res = await client.delete(f"/{target_index}/_doc/{doc_id}")
                return res.status_code in (200, 404)
            except Exception as e:
                logger.error(f"Lỗi xóa tài liệu {doc_id}: {e}")
                return False

    async def search_entity_ids(
        self,
        entity_type: str,
        query: str,
        category: Optional[str] = None,
        limit: int = 50,
    ) -> List[str]:
        """
        Truy vấn nhanh danh sách ID thực thể từ Elasticsearch phục vụ lọc và xếp hạng theo BM25.
        Dùng làm Search Engine tích hợp cho mọi thanh tìm kiếm chuyên biệt trong hệ thống.
        """
        if not query or not query.strip():
            return []

        async with self._get_client() as client:
            try:
                must_clauses: List[Dict[str, Any]] = [
                    {"term": {"entity_type": entity_type}},
                    {
                        "multi_match": {
                            "query": query.strip(),
                            "fields": [
                                "title^4",
                                "title.autocomplete^2",
                                "description^1.5",
                                "code^2",
                                "category"
                            ],
                            "fuzziness": "AUTO",
                            "prefix_length": 2
                        }
                    }
                ]
                if category and category.strip() and category.strip() != "ALL":
                    must_clauses.append({"term": {"category": category.strip()}})

                payload = {
                    "size": limit,
                    "query": {
                        "bool": {
                            "must": must_clauses
                        }
                    },
                    "_source": ["entity_id"]
                }
                res = await client.post(f"/{self.index_name}/_search", json=payload)
                if res.status_code != 200:
                    return []
                hits = res.json().get("hits", {}).get("hits", [])
                return [h["_source"]["entity_id"] for h in hits if "_source" in h and "entity_id" in h["_source"]]
            except Exception as e:
                logger.warning(f"search_entity_ids ES error ({entity_type}): {e}")
                return []

    async def sync_all_from_database(
        self,
        db: AsyncSession,
    ) -> Dict[str, int]:
        """
        Đồng bộ dữ liệu từ PostgreSQL sang Elasticsearch qua 100% Explicit SQL.
        Tuân thủ nghiêm ngặt quy tắc:
        1. Liệt kê danh sách cột tường minh.
        2. Bắt buộc có WHERE deleted_at IS NULL (hoặc is_deleted = false).
        """
        await self.ensure_index_and_mapping()
        counts: Dict[str, int] = {
            "incidents": 0,
            "events": 0,
            "waste_handbook": 0,
            "penalties": 0,
            "flood_sos": 0,
        }

        bulk_docs: List[Dict[str, Any]] = []

        # 1. Quét bảng incidents (Sự cố môi trường)
        sql_incidents = text("""
            SELECT 
                i.incident_id::text AS incident_id,
                i.tracking_code,
                i.title,
                i.description,
                i.address_text,
                i.latitude::float AS latitude,
                i.longitude::float AS longitude,
                i.severity,
                i.status,
                i.created_at::text AS created_at
            FROM incidents i
            WHERE i.deleted_at IS NULL
            ORDER BY i.created_at DESC
            LIMIT 500
        """)
        try:
            res_inc = await db.execute(sql_incidents)
            for row in res_inc.mappings():
                m = dict(row)
                doc = {
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
                    "created_at": parse_iso_date(m.get("created_at")),
                }
                bulk_docs.append(doc)
                counts["incidents"] += 1
        except Exception as e:
            logger.warning(f"Lỗi đọc dữ liệu incidents: {e}")

        # 2. Quét bảng events (Chiến dịch Chủ Nhật Xanh)
        sql_events = text("""
            SELECT 
                e.event_id::text AS event_id,
                e.title,
                e.description,
                e.address,
                e.district,
                e.latitude::float AS latitude,
                e.longitude::float AS longitude,
                e.status,
                e.created_at::text AS created_at
            FROM events e
            WHERE e.is_deleted = false
            ORDER BY e.created_at DESC
            LIMIT 500
        """)
        try:
            res_ev = await db.execute(sql_events)
            for row in res_ev.mappings():
                m = dict(row)
                doc = {
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
                    "created_at": parse_iso_date(m.get("created_at")),
                }
                bulk_docs.append(doc)
                counts["events"] += 1
        except Exception as e:
            logger.warning(f"Lỗi đọc dữ liệu events: {e}")

        # 3. Quét bảng waste_handbook_items (Sổ tay phân loại rác)
        sql_handbook = text("""
            SELECT 
                w.item_id,
                w.name,
                w.category_code,
                w.sorting_guide,
                w.bin_name,
                w.safety_notes,
                w.created_at::text AS created_at
            FROM waste_handbook_items w
            WHERE w.is_active = true
            ORDER BY w.created_at DESC
            LIMIT 500
        """)
        try:
            res_wb = await db.execute(sql_handbook)
            for row in res_wb.mappings():
                m = dict(row)
                desc = f"{m.get('sorting_guide', '')}. Thùng rác: {m.get('bin_name', '')}. Lưu ý: {m.get('safety_notes', '')}"
                doc = {
                    "entity_id": m["item_id"],
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
                    "created_at": parse_iso_date(m.get("created_at")),
                }
                bulk_docs.append(doc)
                counts["waste_handbook"] += 1
        except Exception as e:
            logger.warning(f"Lỗi đọc dữ liệu waste_handbook: {e}")

        # 4. Quét bảng penalty_regulations (Cẩm nang pháp lý & xử phạt vi phạm môi trường)
        sql_penalties = text("""
            SELECT 
                p.id::text AS id,
                p.title,
                p.domain,
                p.quick_category,
                p.legal_basis,
                p.description,
                p.keywords,
                p.min_fine_individual,
                p.max_fine_individual,
                p.created_at::text AS created_at
            FROM penalty_regulations p
            WHERE p.deleted_at IS NULL
            ORDER BY p.created_at DESC
            LIMIT 500
        """)
        try:
            res_pen = await db.execute(sql_penalties)
            for row in res_pen.mappings():
                m = dict(row)
                desc = f"{m.get('description', '')}. Căn cứ: {m.get('legal_basis', '')}. Từ khóa: {m.get('keywords', '')}"
                doc = {
                    "entity_id": m["id"],
                    "entity_type": "penalty",
                    "code": m.get("legal_basis"),
                    "title": m["title"],
                    "description": desc,
                    "category": m.get("domain"),
                    "status": "ACTIVE",
                    "priority": "NORMAL",
                    "address": "Nghị định 45/2022/NĐ-CP",
                    "district": None,
                    "location": None,
                    "created_at": parse_iso_date(m.get("created_at")),
                }
                bulk_docs.append(doc)
                counts["penalties"] += 1
        except Exception as e:
            logger.warning(f"Lỗi đọc dữ liệu penalty_regulations: {e}")

        # Gửi bulk request sang Elasticsearch
        if bulk_docs:
            bulk_payload = ""
            for doc in bulk_docs:
                meta = {"index": {"_index": self.index_name, "_id": f"{doc['entity_type']}_{doc['entity_id']}"}}
                bulk_payload += json.dumps(meta) + "\n" + json.dumps(doc) + "\n"

            async with self._get_client() as client:
                try:
                    res = await client.post(
                        "/_bulk",
                        content=bulk_payload,
                        headers={"Content-Type": "application/x-ndjson"},
                    )
                    res_data = res.json() if res.status_code in (200, 201) else {}
                    has_errs = res_data.get("errors", False)
                    if has_errs:
                        err_items = [
                            it for it in res_data.get("items", [])
                            if list(it.values())[0].get("error")
                        ]
                        logger.warning(f"Elasticsearch bulk gặp lỗi tại {len(err_items)} tài liệu. Ví dụ: {err_items[:2]}")
                    logger.info(f"Đã đồng bộ {len(bulk_docs)} tài liệu vào Elasticsearch (_bulk status: {res.status_code}, has_errors: {has_errs})")
                except Exception as e:
                    logger.error(f"Lỗi gửi bulk request tới Elasticsearch: {e}")

        return counts

    async def check_health(self) -> ClusterHealthResponse:
        """Kiểm tra tình trạng sức khỏe cụm Elasticsearch."""
        async with self._get_client() as client:
            try:
                res = await client.get("/_cluster/health")
                if res.status_code != 200:
                    return ClusterHealthResponse(
                        status="red",
                        cluster_name="unknown",
                        number_of_nodes=0,
                        number_of_data_nodes=0,
                        active_primary_shards=0,
                        active_shards=0,
                        unassigned_shards=0,
                        index_name=self.index_name,
                        index_doc_count=0,
                    )

                data = res.json()

                # Lấy số lượng tài liệu hiện tại trong Index
                doc_count = 0
                count_res = await client.get(f"/{self.index_name}/_count")
                if count_res.status_code == 200:
                    doc_count = count_res.json().get("count", 0)

                return ClusterHealthResponse(
                    status=data.get("status", "unknown"),
                    cluster_name=data.get("cluster_name", "greenspot-cluster"),
                    number_of_nodes=data.get("number_of_nodes", 0),
                    number_of_data_nodes=data.get("number_of_data_nodes", 0),
                    active_primary_shards=data.get("active_primary_shards", 0),
                    active_shards=data.get("active_shards", 0),
                    unassigned_shards=data.get("unassigned_shards", 0),
                    index_name=self.index_name,
                    index_doc_count=doc_count,
                )
            except Exception as e:
                logger.warning(f"Lỗi kết nối kiểm tra health Elasticsearch: {e}")
                return ClusterHealthResponse(
                    status="red",
                    cluster_name="offline",
                    number_of_nodes=0,
                    number_of_data_nodes=0,
                    active_primary_shards=0,
                    active_shards=0,
                    unassigned_shards=0,
                    index_name=self.index_name,
                    index_doc_count=0,
                )


# Khởi tạo thể hiện Singleton mặc định
elasticsearch_search_repository = ElasticsearchSearchRepository()
