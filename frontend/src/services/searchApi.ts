/**
 * Service API kết nối Elasticsearch Search Engine cho GreenSpot Frontend.
 * Tương thích Clean Architecture & Pydantic v2 DTO backend.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export interface GlobalSearchResultItem {
  entity_id: string;
  entity_type: "incident" | "event" | "post" | "sos" | "hotspot" | "handbook" | string;
  code?: string | null;
  title: string;
  description?: string | null;
  highlight_title?: string | null;
  highlight_description?: string | null;
  category?: string | null;
  status?: string | null;
  priority?: string | null;
  address?: string | null;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distance_km?: number | null;
  created_at?: string | null;
  url_path: string;
  score: number;
}

export interface GlobalSearchResponse {
  items: GlobalSearchResultItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  took_ms: number;
}

export interface AutocompleteItem {
  id: string;
  title: string;
  entity_type: string;
  category?: string | null;
  url_path: string;
}

export interface AutocompleteResponse {
  query: string;
  suggestions: AutocompleteItem[];
  took_ms: number;
}

export interface ClusterHealthResponse {
  status: "green" | "yellow" | "red" | string;
  cluster_name: string;
  number_of_nodes: number;
  number_of_data_nodes: number;
  active_primary_shards: number;
  active_shards: number;
  unassigned_shards: number;
  index_name: string;
  index_doc_count: number;
}

export interface SyncStatusResponse {
  success: boolean;
  indexed_counts: Record<string, number>;
  total_indexed: number;
  message: string;
  elapsed_seconds: number;
}

/**
 * 1. Tìm kiếm toàn cục đa thực thể qua Elasticsearch.
 */
export async function searchGlobalAPI(params: {
  q: string;
  entity_types?: string[];
  district?: string;
  status?: string;
  lat?: number;
  lon?: number;
  radius_km?: number;
  page?: number;
  page_size?: number;
}): Promise<GlobalSearchResponse> {
  const query = new URLSearchParams();
  query.set("q", params.q);
  if (params.entity_types && params.entity_types.length > 0) {
    params.entity_types.forEach((t) => query.append("entity_types", t));
  }
  if (params.district) query.set("district", params.district);
  if (params.status) query.set("status", params.status);
  if (params.lat !== undefined) query.set("lat", params.lat.toString());
  if (params.lon !== undefined) query.set("lon", params.lon.toString());
  if (params.radius_km !== undefined) query.set("radius_km", params.radius_km.toString());
  if (params.page !== undefined) query.set("page", params.page.toString());
  if (params.page_size !== undefined) query.set("page_size", params.page_size.toString());

  const token = localStorage.getItem("access_token");
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/search/global?${query.toString()}`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    throw new Error(`Tìm kiếm thất bại: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * 2. Gợi ý tìm kiếm tức thì Autocomplete (Edge N-gram).
 */
export async function getSearchAutocompleteAPI(
  query: string,
  entityTypes?: string[],
  limit: number = 8
): Promise<AutocompleteResponse> {
  if (!query.trim()) {
    return { query, suggestions: [], took_ms: 0 };
  }

  const searchParams = new URLSearchParams();
  searchParams.set("q", query.trim());
  if (entityTypes && entityTypes.length > 0) {
    entityTypes.forEach((t) => searchParams.append("entity_types", t));
  }
  searchParams.set("limit", limit.toString());

  const token = localStorage.getItem("access_token");
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/search/autocomplete?${searchParams.toString()}`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    throw new Error(`Gợi ý tìm kiếm thất bại: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * 3. Kích hoạt đồng bộ toàn diện dữ liệu PostgreSQL sang Elasticsearch.
 */
export async function triggerSearchSyncAPI(): Promise<SyncStatusResponse> {
  const token = localStorage.getItem("access_token");
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/search/sync`, {
    method: "POST",
    headers,
  });

  if (!res.ok) {
    throw new Error(`Đồng bộ dữ liệu Elasticsearch thất bại: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * 4. Kiểm tra sức khỏe cụm Elasticsearch.
 */
export async function getSearchClusterHealthAPI(): Promise<ClusterHealthResponse> {
  const token = localStorage.getItem("access_token");
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/search/health`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    throw new Error(`Lấy trạng thái cụm Elasticsearch thất bại: HTTP ${res.status}`);
  }
  return res.json();
}
