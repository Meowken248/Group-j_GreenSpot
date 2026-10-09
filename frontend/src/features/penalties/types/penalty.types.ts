/**
 * Type Definitions for Penalty Regulations Domain (Chức năng 11: Tra cứu quy định xử phạt)
 */

export type TargetType = 'INDIVIDUAL' | 'ORGANIZATION';

export interface PenaltySummaryItem {
  id: string;
  title: string;
  domain: string;
  quick_category?: string | null;
  target: TargetType;
  displayed_min_fine: number;
  displayed_max_fine: number;
  displayed_avg_fine: number;
  legal_basis: string;
  amendment_warning?: string | null;
}

export interface PenaltySearchResponse {
  items: PenaltySummaryItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  target: TargetType;
}

export interface PenaltyDetailResponse {
  id: string;
  title: string;
  domain: string;
  quick_category?: string | null;
  target: TargetType;
  min_fine: number;
  max_fine: number;
  avg_fine: number;
  description: string;
  aggravating_circumstances?: string | null;
  supplementary_measures?: string | null;
  legal_basis: string;
  effective_date?: string | null;
  amendment_warning?: string | null;
  version: number;
}

export interface QuickCategoryStat {
  category_name: string;
  count: number;
  icon: string;
  description: string;
}

export type PenaltyScreenMode = 'SEARCH' | 'LIST' | 'DETAIL';
