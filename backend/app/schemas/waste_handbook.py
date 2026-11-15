from typing import Optional, List
from pydantic import BaseModel

class WasteCategoryResponse(BaseModel):
    code: str
    name: str
    description: str
    color_hex: str
    icon_name: str
    bin_name: str
    examples_hint: str
    item_count: int

class WasteItemSummaryResponse(BaseModel):
    item_id: str
    name: str
    category_code: str
    category_name: str
    category_color: str
    image_url: Optional[str] = None
    bin_name: str

class WasteItemDetailResponse(BaseModel):
    item_id: str
    name: str
    category_code: str
    category_name: str
    category_color: str
    alternative_names: Optional[str] = None
    image_url: Optional[str] = None
    sorting_guide: str
    bin_color: str
    bin_name: str
    safety_notes: Optional[str] = None
    has_dedicated_station: bool
    station_action_label: str  # "Tìm điểm thu gom" vs "Thu gom rác sinh hoạt định kỳ"
    facility_filter_type: Optional[str] = None  # Dùng để lọc trên bản đồ WebGIS

class WasteHandbookOverviewResponse(BaseModel):
    categories: List[WasteCategoryResponse]
    featured_items: List[WasteItemSummaryResponse]
