import api from "../../api/client";
import type {
  QRScanPayload,
  QRScanResult,
  QRCodeDetail,
  QRCodeCreatePayload,
  QRCodeListResult,
} from "./types";

export const qrScanApi = {
  scanQRCode: async (payload: QRScanPayload): Promise<QRScanResult> => {
    const res = await api.post<QRScanResult>("/api/v1/gamification/qr/scan", payload);
    return res.data;
  },

  getQRInfo: async (code: string): Promise<QRCodeDetail> => {
    const res = await api.get<QRCodeDetail>(`/api/v1/gamification/qr/info/${code}`);
    return res.data;
  },

  createQRCode: async (payload: QRCodeCreatePayload): Promise<QRCodeDetail> => {
    const res = await api.post<QRCodeDetail>("/api/v1/gamification/qr/create", payload);
    return res.data;
  },

  listQRCodes: async (params?: {
    search?: string;
    qr_type?: string;
    page?: number;
    limit?: number;
  }): Promise<QRCodeListResult> => {
    const res = await api.get<QRCodeListResult>("/api/v1/gamification/qr/list", { params });
    return res.data;
  },
};

