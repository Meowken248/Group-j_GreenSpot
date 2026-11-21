"""
Unit & Integration Test Suite for AI Deduplication Dashboard & Report Merging
Package: BackEnd/tests/deduplication/test_deduplication.py
Tuân thủ PROJECT_RULES.md (TDD - Bước 4 & 6):
1. Kiểm tra thuật toán AI 3 yếu tố: GPS (< 50m), thời gian (< 48h), tương đồng ảnh (> 80%)
2. Kiểm tra Pydantic Schemas validation
3. Kiểm tra API GET /districts, GET /clusters (bộ lọc Quận và % tương đồng)
4. Kiểm tra API GET /compare/{cluster_id} (đối chứng song song Báo cáo A & B)
5. Kiểm tra API POST /mark-distinct ("Đã đánh dấu 2 báo cáo không trùng lặp")
6. Kiểm tra API POST /merge (Gộp báo cáo, Optimistic Locking 409, Soft Delete)
7. Kiểm tra phân quyền RBAC: Quản trị viên (Admin) / Điều phối viên (Officer) vs Citizen (403)
"""

import sys
import uuid
import unittest
from datetime import datetime, timezone
from typing import List, Optional
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException
from starlette.requests import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.interface.deduplication.deduplication_interface import IDeduplicationRepository
from app.models.rbac import User, Role
from app.models.incident import Incident, IncidentMedia
from app.models.spatial import AdministrativeUnit
from app.models.deduplication import IncidentDuplicateCluster
from app.schemas.deduplication import (
    MergeIncidentRequest,
    MarkDistinctRequest,
)
from app.services.deduplication import ai_deduplication_service
from app.api.v1.deduplication.router import (
    get_deduplication_districts,
    list_duplicate_clusters,
    get_cluster_comparison_detail,
    mark_cluster_as_distinct,
    merge_cluster_incidents,
)


class MockDeduplicationRepository(IDeduplicationRepository):
    """
    Mock Repository độc lập theo nguyên tắc DIP và Clean Architecture.
    Chạy thuần in-memory không phụ thuộc vào kết nối hạ tầng PostgreSQL vật lý.
    """

    def __init__(self):
        self.districts: List[AdministrativeUnit] = [
            AdministrativeUnit(unit_id=1, name="Quận 1", unit_code="Q1"),
            AdministrativeUnit(unit_id=2, name="Quận Bình Tân", unit_code="QBT"),
            AdministrativeUnit(unit_id=3, name="TP. Thủ Đức", unit_code="TD"),
        ]

        # Khởi tạo incidents mẫu
        self.reporter_a = User(user_id=uuid.uuid4(), full_name="Công dân A", phone_number="0901234567")
        self.reporter_b = User(user_id=uuid.uuid4(), full_name="Công dân B", phone_number="0987654321")

        self.inc_a_id = uuid.uuid4()
        self.inc_b_id = uuid.uuid4()

        self.inc_a = Incident(
            incident_id=self.inc_a_id,
            tracking_code="INC-2026-0001",
            title="Bãi rác tự phát ngõ 128 Lê Lợi",
            description="Đống rác to bốc mùi nồng nặc tràn ra ngã tư",
            address_text="128 Lê Lợi, Phường Bến Nghé, Quận 1",
            latitude=10.774500,
            longitude=106.703200,
            created_at=datetime(2026, 9, 15, 8, 15, 0, tzinfo=timezone.utc),
            version=1,
            reporter=self.reporter_a,
            media=[IncidentMedia(file_url="https://images.unsplash.com/photo-1530587191325-3db32d826c18")],
        )

        self.inc_b = Incident(
            incident_id=self.inc_b_id,
            tracking_code="INC-2026-0002",
            title="Đống xà bần rác thải góc đường Lê Lợi",
            description="Có bãi rác sinh hoạt lớn tràn ra vỉa hè",
            address_text="Góc Lê Lợi - Pasteur, Quận 1",
            latitude=10.774620,
            longitude=106.703320,
            created_at=datetime(2026, 9, 15, 9, 30, 0, tzinfo=timezone.utc),
            version=1,
            reporter=self.reporter_b,
            media=[IncidentMedia(file_url="https://images.unsplash.com/photo-1530587191325-3db32d826c18")],
        )

        self.sample_cluster_id = uuid.uuid4()
        self.sample_cluster = IncidentDuplicateCluster(
            cluster_id=self.sample_cluster_id,
            cluster_code="CL-2026-01",
            cluster_name="Nhóm rác Lê Lợi",
            incident_a_id=self.inc_a_id,
            incident_b_id=self.inc_b_id,
            report_count=2,
            similarity_rate=92.5,
            district_name="Quận 1",
            gps_distance_m=18.5,
            time_diff_hours=1.25,
            visual_similarity=95.0,
            status="PENDING_REVIEW",
            version=1,
            ai_conclusion="Khoảng cách 18.5m, chênh 1.25 giờ, độ tương đồng ảnh 95%.",
        )

        self.clusters = {
            self.sample_cluster_id: self.sample_cluster
        }
        self.incidents = {
            self.inc_a_id: self.inc_a,
            self.inc_b_id: self.inc_b,
        }

    async def get_districts(self, db: AsyncSession) -> List[AdministrativeUnit]:
        return list(self.districts)

    async def list_clusters(
        self,
        db: AsyncSession,
        district_name: Optional[str] = None,
        min_similarity: Optional[float] = None,
    ) -> List[IncidentDuplicateCluster]:
        res = []
        for c in self.clusters.values():
            if c.deleted_at is not None or c.status != "PENDING_REVIEW":
                continue
            if district_name and district_name != "Tất cả quận/huyện" and c.district_name != district_name:
                continue
            if min_similarity is not None and c.similarity_rate < min_similarity:
                continue
            res.append(c)
        return res

    async def get_cluster_by_id(
        self, db: AsyncSession, cluster_id: uuid.UUID
    ) -> Optional[IncidentDuplicateCluster]:
        c = self.clusters.get(cluster_id)
        if c and c.deleted_at is None:
            return c
        return None

    async def get_incident_with_media_and_reporter(
        self, db: AsyncSession, incident_id: uuid.UUID
    ) -> Optional[Incident]:
        return self.incidents.get(incident_id)

    async def get_incident_by_id(
        self, db: AsyncSession, incident_id: uuid.UUID
    ) -> Optional[Incident]:
        return self.incidents.get(incident_id)

    async def mark_cluster_distinct(
        self, db: AsyncSession, cluster: IncidentDuplicateCluster
    ) -> IncidentDuplicateCluster:
        cluster.status = "RESOLVED_DISTINCT"
        cluster.version += 1
        cluster.updated_at = datetime.now(timezone.utc)
        return cluster

    async def merge_cluster_incidents(
        self,
        db: AsyncSession,
        cluster: IncidentDuplicateCluster,
        primary_inc: Incident,
        secondary_inc: Incident,
    ) -> None:
        secondary_inc.master_incident_id = primary_inc.incident_id
        secondary_inc.is_duplicate_merged = True
        secondary_inc.version += 1
        secondary_inc.updated_at = datetime.now(timezone.utc)

        cluster.status = "RESOLVED_MERGED"
        cluster.version += 1
        cluster.deleted_at = datetime.now(timezone.utc)
        cluster.updated_at = datetime.now(timezone.utc)


class TestAIDeduplicationUnitCoverage(unittest.IsolatedAsyncioTestCase):
    """Bộ kiểm thử đơn vị và tích hợp cho tính năng AI Deduplication"""

    async def asyncSetUp(self):
        self.mock_repo = MockDeduplicationRepository()
        self.session = AsyncMock(spec=AsyncSession)

        admin_role = Role(role_id=1, role_name="Quản trị viên", role_code="ADMIN")
        citizen_role = Role(role_id=2, role_name="Người dân", role_code="CITIZEN")

        self.admin_user = User(
            user_id=uuid.uuid4(),
            email="admin@greenspot.vn",
            full_name="Quản trị viên Hệ thống",
            role_id=1,
            role=admin_role,
        )
        self.citizen_user = User(
            user_id=uuid.uuid4(),
            email="citizen@greenspot.vn",
            full_name="Công dân GreenSpot",
            role_id=2,
            role=citizen_role,
        )
        self.sample_cluster = self.mock_repo.sample_cluster
        self.mock_request = Request({"type": "http", "query_string": b"", "headers": []})

        # Patch deduplication_repository singleton trong router
        self.patcher = patch("app.api.v1.deduplication.router.deduplication_repository", self.mock_repo)
        self.patcher.start()

    async def asyncTearDown(self):
        self.patcher.stop()

    # =========================================================================
    # I. KIỂM THỬ THUẬT TOÁN AI (3 YẾU TỐ ĐỐI SOÁT)
    # =========================================================================

    def test_01_gps_distance_haversine(self):
        """Khoảng cách GPS: cùng tọa độ = 0m, cách ~18m, cách >50m"""
        # Cùng tọa độ
        d0 = ai_deduplication_service.calculate_gps_distance_meters(10.7745, 106.7032, 10.7745, 106.7032)
        self.assertEqual(d0, 0.0)

        # Cách nhau ~18 mét
        d18 = ai_deduplication_service.calculate_gps_distance_meters(10.774500, 106.703200, 10.774620, 106.703320)
        self.assertTrue(10.0 <= d18 <= 25.0, f"Khoảng cách thực tế: {d18}m")

        # Cách nhau > 50 mét
        d100 = ai_deduplication_service.calculate_gps_distance_meters(10.7745, 106.7032, 10.7760, 106.7045)
        self.assertGreater(d100, 50.0)

    def test_02_time_difference_hours(self):
        """Khoảng cách thời gian: chênh lệch giờ đúng định dạng"""
        t1 = datetime(2026, 9, 15, 8, 0, 0, tzinfo=timezone.utc)
        t2 = datetime(2026, 9, 15, 9, 30, 0, tzinfo=timezone.utc)
        t3 = datetime(2026, 9, 18, 8, 0, 0, tzinfo=timezone.utc)

        diff_1_5 = ai_deduplication_service.calculate_time_diff_hours(t1, t2)
        self.assertEqual(diff_1_5, 1.5)

        diff_72 = ai_deduplication_service.calculate_time_diff_hours(t1, t3)
        self.assertEqual(diff_72, 72.0)
        self.assertGreater(diff_72, 48.0)

    def test_03_cv_image_embedding_similarity(self):
        """Độ tương đồng Cosine: vector giống hệt = 100%, vuông góc = 0%"""
        v1 = [1.0, 2.0, 3.0, 4.0]
        v2 = [1.0, 2.0, 3.0, 4.0]
        sim_identical = ai_deduplication_service.compute_embedding_similarity(v1, v2)
        self.assertEqual(sim_identical, 100.0)

        v_perp1 = [1.0, 0.0]
        v_perp2 = [0.0, 1.0]
        sim_perp = ai_deduplication_service.compute_embedding_similarity(v_perp1, v_perp2)
        self.assertEqual(sim_perp, 0.0)

    def test_04_ai_evaluate_duplicate_pair_pass(self):
        """Cặp báo cáo đạt cả 3 yếu tố: GPS <50m, Time <48h, Image >80% => Trùng lặp"""
        t1 = datetime(2026, 9, 15, 8, 0, 0, tzinfo=timezone.utc)
        t2 = datetime(2026, 9, 15, 9, 15, 0, tzinfo=timezone.utc)
        is_dup, score, gps_d, time_h, img_s, expl = ai_deduplication_service.evaluate_duplicate_pair(
            lat1=10.774500, lon1=106.703200, t1=t1, image_sim=92.0,
            lat2=10.774620, lon2=106.703320, t2=t2
        )
        self.assertTrue(is_dup)
        self.assertGreaterEqual(score, 85.0)
        self.assertLess(gps_d, 50.0)
        self.assertLess(time_h, 48.0)
        self.assertGreater(img_s, 80.0)
        self.assertIn("AI xác định tỷ lệ trùng lặp", expl)

    def test_05_ai_evaluate_duplicate_pair_fail_factors(self):
        """Nếu 1 trong 3 yếu tố không đạt (ví dụ GPS > 50m) => Không trùng lặp"""
        t1 = datetime(2026, 9, 15, 8, 0, 0, tzinfo=timezone.utc)
        t2 = datetime(2026, 9, 15, 9, 15, 0, tzinfo=timezone.utc)
        # Cách nhau xa > 100m
        is_dup, score, gps_d, time_h, img_s, expl = ai_deduplication_service.evaluate_duplicate_pair(
            lat1=10.774500, lon1=106.703200, t1=t1, image_sim=95.0,
            lat2=10.780000, lon2=106.710000, t2=t2
        )
        self.assertFalse(is_dup)
        self.assertGreater(gps_d, 50.0)

    # =========================================================================
    # II. KIỂM THỬ SCHEMAS VALIDATION
    # =========================================================================

    def test_06_schemas_validation(self):
        """Validate các schema pydantic đầy đủ các trường bắt buộc"""
        uid = uuid.uuid4()
        merge_req = MergeIncidentRequest(
            cluster_id=uid,
            primary_incident_id=uid,
            secondary_incident_id=uid,
            version=1,
        )
        self.assertEqual(merge_req.version, 1)

        distinct_req = MarkDistinctRequest(cluster_id=uid, version=1)
        self.assertEqual(distinct_req.version, 1)

    # =========================================================================
    # III. KIỂM THỬ ENDPOINTS (MÀN 1 -> MÀN 4)
    # =========================================================================

    async def test_07_api_get_districts(self):
        """Màn 1: Lấy danh sách quận phục vụ bộ lọc"""
        districts = await get_deduplication_districts(
            request=self.mock_request,
            current_user=self.admin_user,
            db=self.session,
        )
        self.assertIsInstance(districts, list)
        self.assertGreaterEqual(len(districts), 1)
        names = [d.name for d in districts]
        self.assertIn("Tất cả quận/huyện", names)

    async def test_08_api_list_clusters_and_filters(self):
        """Màn 1: Lấy danh sách cụm trùng lặp, lọc theo quận và lọc theo % tương đồng"""
        # 1. Lấy tất cả
        res_all = await list_duplicate_clusters(
            request=self.mock_request,
            district_name=None,
            min_similarity=None,
            current_user=self.admin_user,
            db=self.session,
        )
        self.assertGreaterEqual(res_all.total, 1)

        # 2. Lọc theo % tương đồng >= 90% (chỉ còn Nhóm 1)
        res_90 = await list_duplicate_clusters(
            request=self.mock_request,
            district_name=None,
            min_similarity=90.0,
            current_user=self.admin_user,
            db=self.session,
        )
        for item in res_90.items:
            self.assertGreaterEqual(item.similarity_rate, 90.0)

        # 3. Lọc theo quận "Quận 1"
        res_q1 = await list_duplicate_clusters(
            request=self.mock_request,
            district_name="Quận 1",
            min_similarity=None,
            current_user=self.admin_user,
            db=self.session,
        )
        for item in res_q1.items:
            self.assertEqual(item.district_name, "Quận 1")

    async def test_09_api_list_clusters_empty_state(self):
        """Màn 1: Bộ lọc không có kết quả trả về total=0 (cho empty state UI)"""
        res_empty = await list_duplicate_clusters(
            request=self.mock_request,
            district_name="Quận Không Tồn Tại",
            min_similarity=99.9,
            current_user=self.admin_user,
            db=self.session,
        )
        self.assertEqual(res_empty.total, 0)
        self.assertEqual(len(res_empty.items), 0)

    async def test_10_api_simulated_ai_service_error(self):
        """Màn 1: Giả lập lỗi kết nối dịch vụ AI trả về HTTP 503 với thông báo chuẩn"""
        with self.assertRaises(HTTPException) as ctx:
            await list_duplicate_clusters(
                request=self.mock_request,
                district_name=None,
                min_similarity=None,
                simulate_error=True,
                current_user=self.admin_user,
                db=self.session,
            )
        self.assertEqual(ctx.exception.status_code, 503)
        self.assertIn("Không thể kết nối dịch vụ AI. Vui lòng thử lại", str(ctx.exception.detail))

    async def test_11_api_get_comparison_detail(self):
        """Màn 2: Lấy chi tiết đối chứng song song Báo cáo A & Báo cáo B"""
        comp = await get_cluster_comparison_detail(
            cluster_id=self.sample_cluster.cluster_id,
            request=self.mock_request,
            current_user=self.admin_user,
            db=self.session,
        )
        self.assertEqual(comp.cluster_id, self.sample_cluster.cluster_id)
        self.assertIsNotNone(comp.report_a.incident_id)
        self.assertIsNotNone(comp.report_b.incident_id)
        self.assertIn("Giống nhau:", comp.ai_conclusion.similarity_display)
        self.assertIn("%", comp.ai_conclusion.similarity_display)
        # Báo cáo gửi sớm hơn là report_a
        self.assertEqual(comp.ai_conclusion.recommended_primary_id, comp.report_a.incident_id)

    async def test_12_api_mark_distinct(self):
        """Màn 2: Đánh dấu không trùng lặp (False Positive)"""
        req = MarkDistinctRequest(
            cluster_id=self.sample_cluster.cluster_id,
            version=self.sample_cluster.version,
        )
        res = await mark_cluster_as_distinct(
            req=req,
            current_user=self.admin_user,
            db=self.session,
        )
        self.assertTrue(res.success)
        self.assertEqual(res.message, "Đã đánh dấu 2 báo cáo không trùng lặp")

    async def test_13_api_merge_incidents_success_and_optimistic_locking(self):
        """Màn 3 & 4: Gộp báo cáo thành công, gửi thông báo, và chặn conflict version 409"""
        new_cluster_id = uuid.uuid4()
        new_cluster = IncidentDuplicateCluster(
            cluster_id=new_cluster_id,
            cluster_code="CL-TEST-02",
            cluster_name="Nhóm Test OCC",
            incident_a_id=self.mock_repo.inc_a_id,
            incident_b_id=self.mock_repo.inc_b_id,
            report_count=2,
            similarity_rate=88.0,
            status="PENDING_REVIEW",
            version=1,
        )
        self.mock_repo.clusters[new_cluster_id] = new_cluster

        # 1. Thử gửi version sai -> Phải bắn HTTP 409 Conflict (Quy tắc 7)
        conflict_req = MergeIncidentRequest(
            cluster_id=new_cluster.cluster_id,
            primary_incident_id=new_cluster.incident_a_id,
            secondary_incident_id=new_cluster.incident_b_id,
            version=new_cluster.version + 999,  # Sai version
        )
        with self.assertRaises(HTTPException) as ctx:
            await merge_cluster_incidents(
                req=conflict_req,
                current_user=self.admin_user,
                db=self.session,
            )
        self.assertEqual(ctx.exception.status_code, 409)

        # 2. Gửi version đúng -> Gộp thành công, soft delete cluster
        valid_req = MergeIncidentRequest(
            cluster_id=new_cluster.cluster_id,
            primary_incident_id=new_cluster.incident_a_id,
            secondary_incident_id=new_cluster.incident_b_id,
            version=new_cluster.version,
        )
        merge_res = await merge_cluster_incidents(
            req=valid_req,
            current_user=self.admin_user,
            db=self.session,
        )
        self.assertTrue(merge_res.success)
        self.assertEqual(merge_res.message, "Người báo cáo nhận thông báo")

        # Kiểm tra bản ghi Báo cáo phụ đã được đánh dấu gộp
        sec_inc = await self.mock_repo.get_incident_by_id(self.session, new_cluster.incident_b_id)
        self.assertEqual(sec_inc.master_incident_id, new_cluster.incident_a_id)
        self.assertTrue(sec_inc.is_duplicate_merged)

    async def test_14_rbac_permission_check(self):
        """Chỉ Quản trị viên hoặc Điều phối viên mới có quyền, Citizen bị từ chối 403"""
        # Citizen gọi API list clusters -> Phải bị HTTP 403 Forbidden
        with self.assertRaises(HTTPException) as ctx:
            await list_duplicate_clusters(
                request=self.mock_request,
                district_name=None,
                min_similarity=None,
                current_user=self.citizen_user,
                db=self.session,
            )
        self.assertEqual(ctx.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()
