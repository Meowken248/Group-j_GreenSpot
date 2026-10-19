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
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from app.database import AsyncSessionLocal, engine
from app.models.rbac import User, Role
from app.models.incident import Incident
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


class TestAIDeduplicationUnitCoverage(unittest.IsolatedAsyncioTestCase):
    """Bộ kiểm thử đơn vị và tích hợp cho tính năng AI Deduplication"""

    async def asyncSetUp(self):
        await engine.dispose()
        self.session = AsyncSessionLocal()

        # Tạo / lấy Admin user với eagerly loaded role
        admin_res = await self.session.execute(
            select(User).options(selectinload(User.role)).join(Role).where(Role.role_code == "ADMIN")
        )
        self.admin_user = admin_res.scalars().first()

        # Tạo / lấy Citizen user với eagerly loaded role
        cit_res = await self.session.execute(
            select(User).options(selectinload(User.role)).join(Role).where(Role.role_code == "CITIZEN")
        )
        self.citizen_user = cit_res.scalars().first()

        # Lấy 1 cluster mẫu trong CSDL
        cl_res = await self.session.execute(
            select(IncidentDuplicateCluster).where(
                IncidentDuplicateCluster.deleted_at.is_(None),
                IncidentDuplicateCluster.status == "PENDING_REVIEW",
            )
        )
        self.sample_cluster = cl_res.scalars().first()
        if not self.sample_cluster:
            from app.seeds.deduplication.seed_data import seed_deduplication_data
            await seed_deduplication_data()
            cl_res = await self.session.execute(
                select(IncidentDuplicateCluster).where(
                    IncidentDuplicateCluster.deleted_at.is_(None),
                    IncidentDuplicateCluster.status == "PENDING_REVIEW",
                )
            )
            self.sample_cluster = cl_res.scalars().first()

    async def asyncTearDown(self):
        try:
            await self.session.rollback()
            await self.session.close()
        except Exception:
            pass
        await engine.dispose()

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
            district_name=None,
            min_similarity=None,
            current_user=self.admin_user,
            db=self.session,
        )
        self.assertGreaterEqual(res_all.total, 1)

        # 2. Lọc theo % tương đồng >= 90% (chỉ còn Nhóm 1)
        res_90 = await list_duplicate_clusters(
            district_name=None,
            min_similarity=90.0,
            current_user=self.admin_user,
            db=self.session,
        )
        for item in res_90.items:
            self.assertGreaterEqual(item.similarity_rate, 90.0)

        # 3. Lọc theo quận "Quận 1"
        res_q1 = await list_duplicate_clusters(
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
        self.assertIsNotNone(self.sample_cluster, "Cần có cluster mẫu trong CSDL")
        comp = await get_cluster_comparison_detail(
            cluster_id=self.sample_cluster.cluster_id,
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
        self.assertIsNotNone(self.sample_cluster, "Cần có cluster mẫu trong CSDL")
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
        # Lấy 1 cluster khác đang PENDING_REVIEW
        cl_res = await self.session.execute(
            select(IncidentDuplicateCluster)
            .where(IncidentDuplicateCluster.status == "PENDING_REVIEW")
            .where(IncidentDuplicateCluster.deleted_at.is_(None))
        )
        target_cluster = cl_res.scalars().first()
        if not target_cluster:
            target_cluster = IncidentDuplicateCluster(
                cluster_id=uuid.uuid4(),
                cluster_code=f"TEST-CLUSTER-{uuid.uuid4().hex[:6]}",
                cluster_name="Nhóm Test",
                incident_a_id=self.sample_cluster.incident_a_id,
                incident_b_id=self.sample_cluster.incident_b_id,
                report_count=2,
                similarity_rate=88.0,
                status="PENDING_REVIEW",
                version=1,
            )
            self.session.add(target_cluster)
            await self.session.commit()

        # 1. Thử gửi version sai -> Phải bắn HTTP 409 Conflict (Quy tắc 7)
        conflict_req = MergeIncidentRequest(
            cluster_id=target_cluster.cluster_id,
            primary_incident_id=target_cluster.incident_a_id,
            secondary_incident_id=target_cluster.incident_b_id,
            version=target_cluster.version + 999,  # Sai version
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
            cluster_id=target_cluster.cluster_id,
            primary_incident_id=target_cluster.incident_a_id,
            secondary_incident_id=target_cluster.incident_b_id,
            version=target_cluster.version,
        )
        merge_res = await merge_cluster_incidents(
            req=valid_req,
            current_user=self.admin_user,
            db=self.session,
        )
        self.assertTrue(merge_res.success)
        self.assertEqual(merge_res.message, "Người báo cáo nhận thông báo")

        # Kiểm tra bản ghi Báo cáo phụ đã được đánh dấu gộp
        sec_inc = await self.session.get(Incident, target_cluster.incident_b_id)
        self.assertEqual(sec_inc.master_incident_id, target_cluster.incident_a_id)
        self.assertTrue(sec_inc.is_duplicate_merged)

    async def test_14_rbac_permission_check(self):
        """Chỉ Quản trị viên hoặc Điều phối viên mới có quyền, Citizen bị từ chối 403"""
        if not self.citizen_user:
            self.skipTest("Không có user citizen trong CSDL")

        # Citizen gọi API list clusters -> Phải bị HTTP 403 Forbidden
        with self.assertRaises(HTTPException) as ctx:
            await list_duplicate_clusters(
                district_name=None,
                min_similarity=None,
                current_user=self.citizen_user,
                db=self.session,
            )
        self.assertEqual(ctx.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()
