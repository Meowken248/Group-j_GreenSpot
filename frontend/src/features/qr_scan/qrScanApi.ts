import api from "../../api/client";
import type { QRScanPayload, QRScanResult, QRCodeDetail } from "./types";

export const qrScanApi = {
  scanQRCode: async (payload: QRScanPayload): Promise<QRScanResult> => {
    const res = await api.post<QRScanResult>("/api/v1/gamification/qr/scan", payload);
    return res.data;
  },

  getQRInfo: async (code: string): Promise<QRCodeDetail> => {
    const res = await api.get<QRCodeDetail>(`/api/v1/gamification/qr/info/${code}`);
    return res.data;
  },
};
