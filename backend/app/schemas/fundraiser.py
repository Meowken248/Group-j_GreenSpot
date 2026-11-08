import uuid
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


VIETNAM_PROVINCES = {
    "Hà Nội", "Hải Phòng", "Quảng Ninh", "Bắc Ninh", "Hải Dương", "Hưng Yên",
    "Hà Nam", "Nam Định", "Ninh Bình", "Thái Bình", "Vĩnh Phúc", "Hà Giang",
    "Cao Bằng", "Bắc Kạn", "Tuyên Quang", "Lào Cai", "Yên Bái", "Thái Nguyên",
    "Lạng Sơn", "Bắc Giang", "Phú Thọ", "Điện Biên", "Lai Châu", "Sơn La",
    "Hòa Bình", "Đà Nẵng", "Thừa Thiên Huế", "Quảng Nam", "Quảng Ngãi",
    "Bình Định", "Phú Yên", "Khánh Hòa", "Ninh Thuận", "Bình Thuận", "Thanh Hóa",
    "Nghệ An", "Hà Tĩnh", "Quảng Bình", "Quảng Trị", "Kon Tum", "Gia Lai",
    "Đắk Lắk", "Đắk Nông", "Lâm Đồng", "TP. Hồ Chí Minh", "Cần Thơ", "Bình Dương",
    "Đồng Nai", "Bà Rịa - Vũng Tàu", "Tây Ninh", "Bình Phước", "Long An",
    "Tiền Giang", "Bến Tre", "Trà Vinh", "Vĩnh Long", "Đồng Tháp", "An Giang",
    "Kiên Giang", "Hậu Giang", "Sóc Trăng", "Bạc Liêu", "Cà Mau", "Toàn quốc",
}

VALID_DISTRICTS = {
    "Quận 1", "Quận 3", "Quận 4", "Quận 5", "Quận 6", "Quận 7", "Quận 8",
    "Quận 10", "Quận 11", "Quận 12", "Quận Bình Thạnh", "Quận Bình Tân",
    "Quận Gò Vấp", "Quận Phú Nhuận", "Quận Tân Bình", "Quận Tân Phú",
    "Thành phố Thủ Đức", "Huyện Bình Chánh", "Huyện Cần Giờ",
    "Huyện Củ Chi", "Huyện Hóc Môn", "Huyện Nhà Bè",
}


class FundraiserCampaignBase(BaseModel):
    title: str = Field(..., max_length=100, description="Tên chiến dịch, tối đa 100 ký tự")
    description: str = Field(..., max_length=2000, description="Mô tả chiến dịch, tối đa 2000 ký tự")
    district: str = Field(..., description="Quận/huyện thuộc 22 quận/huyện TP.HCM")
    target_amount: int = Field(..., gt=0, description="Mục tiêu gây quỹ (VNĐ), phải lớn hơn 0")
    end_date: date = Field(..., description="Hạn chót chiến dịch, từ ngày mai và tối đa 90 ngày")
    cover_image_url: Optional[str] = Field(None, max_length=500)
    bank_account_name: str = Field(..., max_length=100, description="Tên chủ tài khoản nhận")
    bank_account_number: str = Field(..., max_length=50, description="Số tài khoản ngân hàng")
    bank_name: str = Field(..., max_length=100, description="Tên ngân hàng")

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Vui lòng nhập tên chiến dịch")
        if len(s) > 100:
            raise ValueError("Tên tối đa 100 ký tự")
        return s

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Vui lòng nhập mô tả chiến dịch")
        if len(s) > 2000:
            raise ValueError("Mô tả tối đa 2000 ký tự")
        return s

    @field_validator("target_amount")
    @classmethod
    def validate_target_amount(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Mục tiêu phải là số lớn hơn 0")
        return v

    @field_validator("district")
    @classmethod
    def validate_district(cls, v: str) -> str:
        s = v.strip()
        if not s or len(s) < 2:
            raise ValueError("Vui lòng chọn địa bàn hợp lệ")
        # Khớp với Tỉnh/Thành Việt Nam
        matched_province = [p for p in VIETNAM_PROVINCES if s.lower() == p.lower()]
        if matched_province:
            return matched_province[0]
        # Khớp với Quận/Huyện TP.HCM
        matched_district = [d for d in VALID_DISTRICTS if s.lower() in d.lower()]
        if matched_district:
            return matched_district[0]
        # Cho phép các địa bàn toàn quốc hợp lệ
        if len(s) <= 100:
            return s
        raise ValueError(f"Địa bàn '{s}' vượt quá 100 ký tự")


class FundraiserCampaignCreateRequest(FundraiserCampaignBase):
    pass


class FundraiserCampaignUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=2000)
    district: Optional[str] = None
    target_amount: Optional[int] = None
    end_date: Optional[date] = None
    cover_image_url: Optional[str] = None


class FundraiserDonationCreateRequest(BaseModel):
    amount: int = Field(..., ge=10000, description="Số tiền quyên góp tối thiểu 10.000 VNĐ")
    message: Optional[str] = Field(None, max_length=200, description="Lời nhắn, tối đa 200 ký tự")
    is_anonymous: bool = Field(False, description="Tùy chọn quyên góp ẩn danh")

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: int) -> int:
        if v < 10000:
            raise ValueError("Số tiền tối thiểu là 10.000 VNĐ")
        return v

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v.strip()) > 200:
            raise ValueError("Lời nhắn tối đa 200 ký tự")
        return v.strip() if v else None


class FundraiserExpenseCreateRequest(BaseModel):
    content: str = Field(..., max_length=255, description="Nội dung khoản chi")
    amount: int = Field(..., gt=0, description="Số tiền chi (VNĐ)")
    expense_date: date = Field(..., description="Ngày chi tiêu")
    proof_image_url: str = Field(..., max_length=500, description="Ảnh chứng từ/hóa đơn")

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Vui lòng nhập nội dung khoản chi")
        return s


class FundraiserApprovalRequest(BaseModel):
    action: str = Field(..., description="'approve' hoặc 'reject'")
    rejection_reason: Optional[str] = Field(None, description="Lý do từ chối nếu action == 'reject'")


class FundraiserDonationItem(BaseModel):
    donation_id: uuid.UUID
    donor_name: str
    amount: int
    message: Optional[str] = None
    is_anonymous: bool
    created_at: datetime

    class Config:
        from_attributes = True


class FundraiserExpenseItem(BaseModel):
    expense_id: uuid.UUID
    content: str
    amount: int
    expense_date: date
    proof_image_url: str
    created_at: datetime

    class Config:
        from_attributes = True


class FundraiserCampaignItem(BaseModel):
    campaign_id: uuid.UUID
    creator_id: uuid.UUID
    creator_name: Optional[str] = None
    creator_avatar: Optional[str] = None
    title: str
    description: str
    cover_image_url: Optional[str] = None
    target_amount: int
    total_donated: int
    donation_count: int
    total_spent: int
    district: str
    end_date: date
    status: str
    rejection_reason: Optional[str] = None
    days_left: int
    percent_achieved: float
    remaining_balance: int
    created_at: datetime

    # Thông tin tài khoản nhận tiền (chỉ trả về khi có quyền)
    bank_account_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_name: Optional[str] = None

    class Config:
        from_attributes = True


class FundraiserCampaignListResponse(BaseModel):
    items: List[FundraiserCampaignItem]
    total: int
    page: int
    page_size: int

