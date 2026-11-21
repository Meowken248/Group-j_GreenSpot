export interface WasteCategoryItem {
  code: string;
  name: string;
  description: string;
  color_hex: string;
  icon_name: string;
  bin_name: string;
  examples_hint: string;
  item_count: number;
}

export interface WasteItemSummary {
  item_id: string;
  name: string;
  category_code: string;
  category_name: string;
  category_color: string;
  image_url?: string | null;
  bin_name: string;
}

export interface WasteItemDetail {
  item_id: string;
  name: string;
  category_code: string;
  category_name: string;
  category_color: string;
  alternative_names?: string | null;
  image_url?: string | null;
  sorting_guide: string;
  bin_color: string;
  bin_name: string;
  safety_notes?: string | null;
  has_dedicated_station: boolean;
  station_action_label: string; // "Tìm điểm thu gom" hoặc "Thu gom rác sinh hoạt định kỳ"
  facility_filter_type?: string | null;
}

export interface WasteHandbookOverview {
  categories: WasteCategoryItem[];
  featured_items: WasteItemSummary[];
}
