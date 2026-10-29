"""
GreenSpot API Router - Green Points & Rewards (Chức năng 28 & 29)
Cung cấp các RESTful Endpoints cho:
- Chức năng 28: Trung tâm chính sách & cơ chế tích lũy Điểm thưởng Công dân Xanh
- Chức năng 29: Quản lý ví điểm và sao kê lịch sử biến động điểm xanh
"""

import uuid
import csv
import io
from typing import Optional
from fastapi import APIRouter, Depends, Header, Query, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.rbac import User
from app.api.v1.rbac import get_current_active_user
from app.utils.security import decode_access_token
from app.services.reward_service import RewardService
from app.schemas.reward import (
    PointPolicyResponse,
    DailyLimitsPolicyResponse,
    ClaimPointRequest,
    ClaimPointResponse,
    WalletSummaryResponse,
    TransactionHistoryFilter,
    TransactionHistoryResponse,
    TransactionDetailResponse,
    EcoRewardItem,
    CreateRewardRequest,
    UpdateRewardRequest,
    RewardCatalogResponse,
    RedemptionAnalyticsResponse,
    RedeemRewardRequest,
    RedeemRewardResponse,
    UserVoucherItem,
    UserVoucherListResponse,
    MarkVoucherUsedResponse,
)

router = APIRouter(prefix="/rewards", tags=["Điểm thưởng, Ví điểm, Danh mục quà tặng & Voucher (28, 29, 30, 31)"])


async def get_optional_current_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Dependency trích xuất người dùng nếu có token; không bắt buộc (dành cho màn hình xem công khai)"""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        return None
    sub = payload.get("sub")
    if not sub:
        return None
    try:
        user_uuid = uuid.UUID(sub)
        user = await db.get(User, user_uuid)
        if user and user.status == "ACTIVE":
            return user
    except Exception:
        pass
    return None


# --------------------------------------------------------------------------
# CHỨC NĂNG 28: CƠ CHẾ TÍCH LŨY ĐIỂM THƯỞNG CÔNG DÂN XANH
# --------------------------------------------------------------------------

@router.get("/policy", response_model=PointPolicyResponse)
async def get_points_policy(
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    [Chức năng 28 - Màn 1] Bảng Quy chuẩn Tích lũy Điểm Xanh & Chính sách khen thưởng:
    - Công khai cho mọi công dân tra cứu tỷ lệ cộng điểm (+50đ báo cáo, +100đ nghiệm thu, +50đ check-in, +2đ cảm xúc, +30đ thử thách...)
    - Nếu đã đăng nhập: Trả kèm số dư ví điểm, cấp bậc danh hiệu (Đồng, Bạc, Vàng, Kim Cương) và thanh tiến trình thăng hạng.
    """
    service = RewardService(db)
    user_id = current_user.user_id if current_user else None
    return await service.get_points_policy(user_id=user_id)


@router.get("/limits-policy", response_model=DailyLimitsPolicyResponse)
async def get_daily_limits_policy(
    db: AsyncSession = Depends(get_db),
):
    """
    [Chức năng 28 - Màn 2] Điều khoản Định ngạch Tích điểm & Chế tài Chống gian lận:
    - Quy định hạn mức tối đa trong vòng 24 giờ (Trần 200đ báo cáo/ngày, 20đ cảm xúc/ngày...)
    - Điều kiện ràng buộc GPS hiện trường và ảnh thật không cắt ghép
    - Chế tài xử phạt trừ -100đ đến -500đ và đóng băng tài khoản khi vi phạm.
    """
    service = RewardService(db)
    return await service.get_daily_limits_policy()


@router.post("/claim", response_model=ClaimPointResponse)
async def claim_green_points(
    req: ClaimPointRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    [Chức năng 28 - Màn 3 Popup] Thực hiện nhận Điểm Thưởng Công Dân Xanh tức thì:
    - Kiểm tra kiểm soát hạn mức ngày (Anti-flood Rate Limit)
    - Kiểm tra tọa độ GPS hiện trường chống Fake GPS
    - Ghi nhận an toàn vào bảng `reward_transactions` và cộng `users.green_points`
    - Tự động kiểm tra và kích hoạt chúc mừng thăng hạng hội viên mới
    - Trả về dữ liệu popup "+{n} ĐIỂM XANH" có mã giao dịch đối soát #TX-...
    """
    service = RewardService(db)
    return await service.claim_points(user_id=current_user.user_id, req=req)


# --------------------------------------------------------------------------
# CHỨC NĂNG 29: VÍ ĐIỂM VÀ LỊCH SỬ BIẾN ĐỘNG ĐIỂM XANH
# --------------------------------------------------------------------------

@router.get("/wallet", response_model=WalletSummaryResponse)
async def get_wallet_summary(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    [Chức năng 29 - Màn 1] Bảng điều khiển tài chính sinh thái cá nhân (Green Wallet Dashboard):
    - Cột SỐ DƯ: Điểm hiện có, cấp bậc hiện tại kèm huy hiệu và thanh tiến trình thăng hạng
    - Cột TÓM TẮT: Điểm tích lũy kiếm tuần này (+{n} điểm) và tổng điểm đã dùng để đổi quà
    - Cột HÀNH ĐỘNG: Điều hướng sang Đổi quà hoặc Tra cứu lịch sử sao kê.
    """
    service = RewardService(db)
    # Tự động nạp dữ liệu mẫu sinh động nếu tài khoản mới chưa có giao dịch nào
    await service.seed_initial_demo_transactions(current_user.user_id)
    return await service.get_wallet_summary(user_id=current_user.user_id)


@router.get("/history", response_model=TransactionHistoryResponse)
async def get_transaction_history(
    flow_type: Optional[str] = Query(None, description="ALL, EARN (điểm cộng), REDEEM (điểm trừ)"),
    time_range: Optional[str] = Query(None, description="7_DAYS, 30_DAYS, THIS_MONTH, ALL"),
    start_date: Optional[str] = Query(None, description="Ngày bắt đầu (ISO format)"),
    end_date: Optional[str] = Query(None, description="Ngày kết thúc (ISO format)"),
    page: int = Query(1, ge=1, description="Trang hiện tại"),
    page_size: int = Query(15, ge=1, le=100, description="Số giao dịch mỗi trang"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    [Chức năng 29 - Màn 2] Sao kê nhật ký biến động điểm thưởng (Point Statement Ledger):
    - Khối BỘ LỌC: Lọc theo luồng (Cộng / Trừ) và mốc thời gian (7 ngày, 30 ngày, tháng này)
    - Khối LỊCH SỬ: Danh sách dòng giao dịch sắp xếp mới nhất lên đầu, phân biệt màu xanh lá (+) và cam (-)
    - Hỗ trợ phân trang và thống kê tổng thu/chi điểm trong kỳ lọc.
    """
    service = RewardService(db)
    await service.seed_initial_demo_transactions(current_user.user_id)
    f = TransactionHistoryFilter(
        flow_type=flow_type,
        time_range=time_range,
        start_date=start_date,
        end_date=end_date,
        page=page,
        page_size=page_size,
    )
    return await service.get_transaction_history(user_id=current_user.user_id, f=f)


@router.get("/transactions/{transaction_id}", response_model=TransactionDetailResponse)
async def get_transaction_detail(
    transaction_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    [Chức năng 29 - Màn 3 Popup] Chứng từ đối soát điện tử của giao dịch (Popup chi tiết):
    - Hiển thị: Hành động, Số điểm (±), Trạng thái, Thời gian chính xác, Mã giao dịch định danh duy nhất (#TX-...)
    - Ghi chú đối soát và cơ chế bảo chứng minh bạch.
    """
    service = RewardService(db)
    return await service.get_transaction_detail(
        transaction_id=transaction_id, user_id=current_user.user_id
    )


@router.get("/export-statement")
async def export_statement(
    flow_type: Optional[str] = Query(None),
    time_range: Optional[str] = Query("30_DAYS"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Xuất sao kê ví điểm điện tử định dạng CSV / Văn bản phục vụ báo cáo và lưu trữ đối chiếu cá nhân.
    """
    service = RewardService(db)
    f = TransactionHistoryFilter(
        flow_type=flow_type,
        time_range=time_range,
        page=1,
        page_size=1000,
    )
    data = await service.get_transaction_history(user_id=current_user.user_id, f=f)

    output = io.StringIO()
    writer = csv.writer(output, dialect="excel")
    writer.writerow([
        "MÃ GIAO DỊCH",
        "HÀNH ĐỘNG / NỘI DUNG",
        "SỐ ĐIỂM BIẾN ĐỘNG",
        "SỐ DƯ SAU GIAO DỊCH",
        "TRẠNG THÁI",
        "THỜI GIAN THỰC HIỆN",
    ])

    for item in data.items:
        writer.writerow([
            item.transaction_code,
            item.action_title,
            f"+{item.points_amount}" if item.points_amount > 0 else str(item.points_amount),
            item.balance_after,
            item.status,
            item.created_at.strftime("%H:%M:%S %d/%m/%Y"),
        ])

    csv_data = output.getvalue().encode("utf-8-sig")
    filename = f"sao_ke_diem_xanh_{current_user.email}_{datetime.now().strftime('%Y%m%d')}.csv"

    return StreamingResponse(
        io.BytesIO(csv_data),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ==============================================================================
# CHỨC NĂNG 30: QUẢN TRỊ CRUD DANH MỤC QUÀ TẶNG XANH VÀ KHO VOUCHER
# ==============================================================================

@router.get(
    "/catalog",
    response_model=RewardCatalogResponse,
    summary="Danh mục quà tặng xanh & kho voucher sinh thái (Chức năng 30 Màn 1)",
)
async def get_reward_catalog(
    search: Optional[str] = Query(None, description="Tìm theo tên quà tặng hoặc thương hiệu ESG"),
    stock_status: Optional[str] = Query("ALL", description="Tất cả (ALL), Còn hàng (IN_STOCK), Hết hàng (OUT_OF_STOCK)"),
    db: AsyncSession = Depends(get_db),
):
    """
    Lấy danh sách các phần quà sinh thái và voucher đổi điểm.
    Hỗ trợ công dân tra cứu đổi quà và Quản trị viên theo dõi tồn kho.
    """
    service = RewardService(db)
    return await service.get_reward_catalog(search=search, stock_status=stock_status)


@router.get(
    "/catalog/{reward_id}",
    response_model=EcoRewardItem,
    summary="Chi tiết một quà tặng / lô voucher theo ID",
)
async def get_reward_detail(
    reward_id: int,
    db: AsyncSession = Depends(get_db),
):
    service = RewardService(db)
    return await service.get_reward_by_id(reward_id=reward_id)


@router.post(
    "/catalog",
    response_model=EcoRewardItem,
    status_code=status.HTTP_201_CREATED,
    summary="Thêm quà tặng sinh thái hoặc lô voucher mới vào kho (Chức năng 30 Màn 2)",
)
async def create_new_reward(
    payload: CreateRewardRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Khởi tạo quà tặng hoặc lô voucher mới vào hệ thống.
    Yêu cầu quyền Quản trị viên (hoặc tài khoản hợp lệ).
    """
    service = RewardService(db)
    return await service.create_reward(payload)


@router.put(
    "/catalog/{reward_id}",
    response_model=EcoRewardItem,
    summary="Cập nhật thông tin và điều chỉnh kho voucher (Chức năng 30 Màn 3)",
)
async def update_existing_reward(
    reward_id: int,
    payload: UpdateRewardRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Cập nhật thông tin quà tặng, hạn dùng hoặc điều chỉnh số lượng tồn kho.
    Không cho phép giảm tồn kho nhỏ hơn số voucher chưa sử dụng.
    """
    service = RewardService(db)
    return await service.update_reward(reward_id=reward_id, req=payload)


@router.delete(
    "/catalog/{reward_id}",
    summary="Xóa hoặc gỡ bỏ quà tặng khỏi kho (Chức năng 30 Màn 4 & Màn 5)",
)
async def delete_reward_item(
    reward_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Xóa quà tặng khỏi danh mục hoặc vô hiệu hóa nếu có voucher đang lưu hành.
    """
    service = RewardService(db)
    return await service.delete_reward(reward_id=reward_id)


@router.get(
    "/analytics",
    response_model=RedemptionAnalyticsResponse,
    summary="Bảng điều khiển phân tích số liệu quy đổi quà tặng (Chức năng 30 Màn 6)",
)
async def get_redemption_analytics(
    time_range: str = Query("MONTH", description="Khoảng thời gian: WEEK, MONTH, QUARTER"),
    db: AsyncSession = Depends(get_db),
):
    """
    Cung cấp các biểu đồ cột, biểu đồ đường xu hướng và Top quà tặng đổi nhiều nhất.
    """
    service = RewardService(db)
    return await service.get_redemption_analytics(time_range=time_range)


@router.get(
    "/analytics/export",
    summary="Xuất báo cáo thống kê quy đổi quà tặng định dạng CSV",
)
async def export_redemption_analytics(
    time_range: str = Query("MONTH", description="Khoảng thời gian: WEEK, MONTH, QUARTER"),
    db: AsyncSession = Depends(get_db),
):
    service = RewardService(db)
    data = await service.get_redemption_analytics(time_range=time_range)

    output = io.StringIO()
    writer = csv.writer(output, dialect="excel")
    writer.writerow(["BÁO CÁO THỐNG KÊ QUY ĐỔI QUÀ TẶNG SINH THÁI GREENSPOT"])
    writer.writerow([f"KHOẢNG THỜI GIAN: {time_range}"])
    writer.writerow([f"TỔNG LƯỢT ĐỔI: {data.total_redemptions}", f"TỔNG ĐIỂM TIÊU THỤ: {data.total_points_spent}"])
    writer.writerow([])
    writer.writerow(["TOP VẬT PHẨM ĐỔI NHIỀU NHẤT", "NHÀ TÀI TRỢ / THƯƠNG HIỆU", "SỐ LƯỢT ĐỔI", "TỶ LỆ PHẦN TRĂM (%)"])
    for item in data.top_rewards:
        writer.writerow([item["title"], item.get("brand", "GreenSpot ESG"), item["count"], f"{item['percentage']}%"])

    csv_data = output.getvalue().encode("utf-8-sig")
    filename = f"thong_ke_doi_qua_{time_range}_{datetime.now().strftime('%Y%m%d')}.csv"

    return StreamingResponse(
        io.BytesIO(csv_data),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ==============================================================================
# CHỨC NĂNG 31: QUẢN LÝ DANH SÁCH QUÀ TẶNG CÁ NHÂN ĐÃ ĐỔI & VOUCHER WALLET
# ==============================================================================

@router.post(
    "/redeem",
    response_model=RedeemRewardResponse,
    summary="Đổi Điểm Xanh lấy E-Voucher / Quà tặng sinh thái (Chức năng 31)",
)
async def redeem_reward_voucher(
    payload: RedeemRewardRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Thực hiện đổi Điểm Xanh lấy quà tặng: Trừ điểm, trừ tồn kho,
    tạo mã voucher và lưu vào kho voucher cá nhân.
    """
    service = RewardService(db)
    return await service.redeem_reward(user_id=current_user.user_id, reward_id=payload.reward_id)


@router.get(
    "/my-vouchers",
    response_model=UserVoucherListResponse,
    summary="Kho voucher và quà tặng cá nhân của công dân (Chức năng 31 Màn 1)",
)
async def get_my_vouchers(
    status_filter: Optional[str] = Query("ALL", description="Lọc theo: ALL, ACTIVE (Còn hạn), USED (Đã dùng), EXPIRED (Hết hạn)"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Xem danh sách quà tặng và E-Voucher cá nhân đã quy đổi thành công.
    Tự động gắn cờ cảnh báo voucher sắp hết hạn dưới 3 ngày.
    """
    service = RewardService(db)
    return await service.get_user_vouchers(user_id=current_user.user_id, status_filter=status_filter)


@router.get(
    "/my-vouchers/{voucher_id}",
    response_model=UserVoucherItem,
    summary="Chi tiết voucher cá nhân & màn hình xuất trình chứng từ điện tử (Chức năng 31 Màn 2)",
)
async def get_my_voucher_detail(
    voucher_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Màn hình xuất trình mã vạch / mã QR cho thu ngân hoặc sao chép mã.
    """
    service = RewardService(db)
    return await service.get_user_voucher_detail(user_id=current_user.user_id, voucher_id=voucher_id)


@router.post(
    "/my-vouchers/{voucher_id}/use",
    response_model=MarkVoucherUsedResponse,
    summary="Đánh dấu đã sử dụng voucher (Chức năng 31 Màn 3 Popup)",
)
async def mark_voucher_as_used(
    voucher_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Xác nhận chuyển trạng thái voucher sang 'Đã dùng' và đóng dấu khóa.
    """
    service = RewardService(db)
    return await service.mark_voucher_used(user_id=current_user.user_id, voucher_id=voucher_id)
