import api from "../../../api/client";
import type {
  WasteCategoryItem,
  WasteCategoryListResponse,
  WasteCategoryCreateRequest,
  WasteCategoryUpdateRequest,
  ValidationCheckResponse,
  WasteCategoryFilterParams,
} from "../types/wasteCategory.types";

export const fetchWasteCategories = async (
  params: WasteCategoryFilterParams = {}
): Promise<WasteCategoryListResponse> => {
  const query = new URLSearchParams();
  query.append("page", (params.page || 1).toString());
  const limitVal = params.limit || params.page_size || 10;
  query.append("page_size", limitVal.toString());
  query.append("limit", limitVal.toString());

  if (params.status && params.status !== "ALL") {
    query.append("status", params.status);
  }
  if (params.search && params.search.trim()) {
    query.append("search", params.search.trim());
  }
  if (params.sort_by) {
    query.append("sort_by", params.sort_by);
  }
  if (params.sort_order) {
    query.append("sort_order", params.sort_order);
  }

  const response = await api.get<WasteCategoryListResponse>(
    `/api/v1/waste-categories?${query.toString()}`
  );
  return response.data;
};

export const fetchCategoryDetail = async (
  categoryId: number
): Promise<WasteCategoryItem> => {
  const response = await api.get<WasteCategoryItem>(
    `/api/v1/waste-categories/${categoryId}`
  );
  return response.data;
};

export const createCategory = async (
  data: WasteCategoryCreateRequest
): Promise<WasteCategoryItem> => {
  const response = await api.post<WasteCategoryItem>(
    "/api/v1/waste-categories",
    data
  );
  return response.data;
};

export const updateCategory = async (
  categoryId: number,
  data: WasteCategoryUpdateRequest
): Promise<WasteCategoryItem> => {
  const response = await api.put<WasteCategoryItem>(
    `/api/v1/waste-categories/${categoryId}`,
    data
  );
  return response.data;
};

export const deleteCategory = async (
  categoryId: number
): Promise<{ success: boolean; message: string; category_id: number }> => {
  const response = await api.delete<{
    success: boolean;
    message: string;
    category_id: number;
  }>(`/api/v1/waste-categories/${categoryId}`);
  return response.data;
};

export const checkCategoryCodeUnique = async (
  code: string
): Promise<ValidationCheckResponse> => {
  const query = new URLSearchParams({ code: code.trim() });
  const response = await api.get<ValidationCheckResponse>(
    `/api/v1/waste-categories/validate/check-code?${query.toString()}`
  );
  return response.data;
};

export const checkCategoryNameUnique = async (
  name: string,
  excludeId?: number
): Promise<ValidationCheckResponse> => {
  const query = new URLSearchParams({ name: name.trim() });
  if (excludeId) {
    query.append("exclude_id", excludeId.toString());
  }
  const response = await api.get<ValidationCheckResponse>(
    `/api/v1/waste-categories/validate/check-name?${query.toString()}`
  );
  return response.data;
};

// Aliases
export const getWasteCategories = fetchWasteCategories;
export const createWasteCategory = createCategory;
export const updateWasteCategory = updateCategory;
export const deleteWasteCategory = deleteCategory;

