from datetime import datetime
from typing import Optional
from sqlalchemy import String, Boolean, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class WasteHandbookItem(Base):
    """
    Chức năng 27: Thư viện sống xanh - Cẩm nang phân loại rác tại nguồn.
    Cung cấp kiến thức chuẩn hóa về từng loại rác, cách sơ chế, màu thùng và lối tắt tìm trạm thu gom.
    """
    __tablename__ = "waste_handbook_items"

    item_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    category_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True) # ORGANIC | RECYCLABLE | HAZARDOUS | OTHER
    alternative_names: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sorting_guide: Mapped[str] = mapped_column(Text, nullable=False)
    bin_color: Mapped[str] = mapped_column(String(30), nullable=False)
    bin_name: Mapped[str] = mapped_column(String(100), nullable=False)
    safety_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    has_dedicated_station: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
