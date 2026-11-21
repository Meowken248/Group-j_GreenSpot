import sys
import asyncio
from pathlib import Path

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

cur = Path(__file__).resolve()
backend_dir = cur.parents[2]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from unittest.mock import AsyncMock
from app.interface.search.search_interface import ISearchRepository
from app.schemas.search.schemas import (
    GlobalSearchRequest,
    GlobalSearchResponse,
    GlobalSearchResultItem,
    AutocompleteResponse,
    ClusterHealthResponse,
)
from app.services.search.search_service import SearchService


class MockSearchRepository(ISearchRepository):
    def __init__(self):
        self.search_global_mock = AsyncMock()
        self.autocomplete_mock = AsyncMock()
        self.sync_mock = AsyncMock()
        self.health_mock = AsyncMock()

    async def ensure_index_and_mapping(self) -> bool:
        return True

    async def search_global(self, request: GlobalSearchRequest) -> GlobalSearchResponse:
        return await self.search_global_mock(request)

    async def autocomplete(self, query: str, entity_types=None, limit: int = 8) -> AutocompleteResponse:
        return await self.autocomplete_mock(query, entity_types, limit)

    async def index_document(self, doc_id: str, document: dict, index_name=None) -> bool:
        return True

    async def delete_document(self, doc_id: str, index_name=None) -> bool:
        return True

    async def search_entity_ids(self, entity_type: str, query: str, category=None, limit: int = 50) -> list:
        return ["id-1", "id-2"]

    async def sync_all_from_database(self, db) -> dict:
        return await self.sync_mock(db)

    async def check_health(self) -> ClusterHealthResponse:
        return await self.health_mock()


@pytest.mark.asyncio
async def test_global_search_empty_query():
    repo = MockSearchRepository()
    service = SearchService(repository=repo)

    req = GlobalSearchRequest(q="    ", page=1, page_size=10)
    res = await service.global_search(req)

    assert res.total == 0
    assert len(res.items) == 0
    assert res.took_ms == 0
    repo.search_global_mock.assert_not_called()


@pytest.mark.asyncio
async def test_global_search_sanitizes_query():
    repo = MockSearchRepository()
    mock_res = GlobalSearchResponse(
        items=[
            GlobalSearchResultItem(
                entity_id="inc_001",
                entity_type="incident",
                title="Rác thải tại ngã tư",
                description="Đống rác tự phát lớn",
                score=1.5,
                url_path="/triage?id=inc_001",
                highlight_title="<em>Rác</em> thải tại ngã tư",
            )
        ],
        total=1,
        page=1,
        page_size=10,
        total_pages=1,
        took_ms=12,
    )
    repo.search_global_mock.return_value = mock_res
    service = SearchService(repository=repo)

    req = GlobalSearchRequest(q="   rác   thải   sinh   hoạt  ", page=1, page_size=10)
    res = await service.global_search(req)

    assert res.total == 1
    assert res.items[0].entity_id == "inc_001"
    repo.search_global_mock.assert_called_once()
    passed_req = repo.search_global_mock.call_args[0][0]
    assert passed_req.q == "rác thải sinh hoạt"


@pytest.mark.asyncio
async def test_autocomplete_empty_query():
    repo = MockSearchRepository()
    service = SearchService(repository=repo)

    res = await service.get_autocomplete("   ")
    assert res.suggestions == []
    repo.autocomplete_mock.assert_not_called()


@pytest.mark.asyncio
async def test_autocomplete_clamped_limit():
    repo = MockSearchRepository()
    repo.autocomplete_mock.return_value = AutocompleteResponse(
        query="ngập", suggestions=[], took_ms=5
    )
    service = SearchService(repository=repo)

    await service.get_autocomplete("ngập nước", limit=50)
    repo.autocomplete_mock.assert_called_once_with("ngập nước", None, 20)

    repo.autocomplete_mock.reset_mock()
    await service.get_autocomplete("ngập nước", limit=-5)
    repo.autocomplete_mock.assert_called_once_with("ngập nước", None, 1)


@pytest.mark.asyncio
async def test_trigger_database_sync_success():
    repo = MockSearchRepository()
    repo.sync_mock.return_value = {"incidents": 15, "events": 4, "waste_handbook": 22}
    service = SearchService(repository=repo)

    mock_db = AsyncMock()
    res = await service.trigger_database_sync(mock_db)

    assert res.success is True
    assert res.total_indexed == 41
    assert res.indexed_counts["incidents"] == 15
    assert "Đã đồng bộ thành công 41 tài liệu" in res.message


@pytest.mark.asyncio
async def test_trigger_database_sync_failure():
    repo = MockSearchRepository()
    repo.sync_mock.side_effect = RuntimeError("ES connection timeout")
    service = SearchService(repository=repo)

    mock_db = AsyncMock()
    res = await service.trigger_database_sync(mock_db)

    assert res.success is False
    assert res.total_indexed == 0
    assert "ES connection timeout" in res.message


@pytest.mark.asyncio
async def test_get_cluster_health():
    repo = MockSearchRepository()
    repo.health_mock.return_value = ClusterHealthResponse(
        status="green",
        cluster_name="greenspot-cluster",
        number_of_nodes=3,
        number_of_data_nodes=3,
        active_primary_shards=6,
        active_shards=12,
        unassigned_shards=0,
        index_name="greenspot_search_v1",
        index_doc_count=1050,
    )
    service = SearchService(repository=repo)

    res = await service.get_cluster_health()
    assert res.status == "green"
    assert res.cluster_name == "greenspot-cluster"
    assert res.number_of_nodes == 3
    assert res.index_doc_count == 1050


@pytest.mark.asyncio
async def test_search_entity_ids():
    repo = MockSearchRepository()
    service = SearchService(repository=repo)

    ids = await service.search_entity_ids("penalty", "rác")
    assert ids == ["id-1", "id-2"]

    # Empty query should return empty list
    empty_ids = await service.search_entity_ids("penalty", "   ")
    assert empty_ids == []


def main():
    print("Running search unit tests...")
    asyncio.run(test_global_search_empty_query())
    asyncio.run(test_global_search_sanitizes_query())
    asyncio.run(test_autocomplete_empty_query())
    asyncio.run(test_autocomplete_clamped_limit())
    asyncio.run(test_trigger_database_sync_success())
    asyncio.run(test_trigger_database_sync_failure())
    asyncio.run(test_get_cluster_health())
    asyncio.run(test_search_entity_ids())
    print(">>> ALL 8 SEARCH UNIT TESTS PASSED SUCCESSFULLY! <<<")


if __name__ == "__main__":
    main()
