import type { ReportFormData, ReportStep } from "../../reports/types/report.types";

export type QueueStatus = "QUEUED" | "SENDING" | "SENT" | "FAILED";

export interface StoredMediaBlob {
  client_file_id: string;
  blob: Blob;
  name: string;
  media_type: "IMAGE" | "VIDEO" | "AUDIO";
  mime_type: string;
  size: number;
  captured_at: string; // ISO 8601
  preview_url?: string;
}

export interface OfflineDraft {
  draft_id: string;
  user_id: string;
  title: string;
  formData: ReportFormData;
  media_blobs: StoredMediaBlob[];
  voice_blob?: Blob | null;
  saved_at: string;
  current_step: ReportStep;
  updated_at: number;
}

export interface OfflineQueueItem {
  queue_id: string;
  client_submission_id: string;
  idempotency_key: string;
  user_id: string;
  title: string;
  category_id: number;
  category_name: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  latitude: number;
  longitude: number;
  address_text: string;
  is_anonymous: boolean;
  reporter_phone?: string;
  media_blobs: StoredMediaBlob[];
  voice_blob?: Blob | null;
  status: QueueStatus;
  retry_count: number;
  max_retries: number;
  next_retry_at: number | null;
  last_error: string | null;
  incident_id?: string;
  incident_code?: string;
  points_awarded?: number;
  created_at: number;
  updated_at: number;
}

export interface SyncResultSummary {
  total: number;
  success_count: number;
  failed_count: number;
  successful_incidents: { code: string; incident_id?: string; title: string }[];
  errors: { queue_id: string; title: string; error: string }[];
  synced_at: string;
}

export interface QueueStatistics {
  pending_count: number;
  failed_count: number;
  sending_count: number;
  last_synced_at: string | null;
}
