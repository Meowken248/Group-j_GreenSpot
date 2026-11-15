/**
 * Service API Client: Sinh nhật bạn bè & Thiệp xanh sinh thái (Feature STT 17)
 * Căn cứ tài liệu: Đồ Án Chuyên Đề Web 1 - Báo Cáo.docx.pdf (Trang 142 - 147)
 */

import api from "../../../api/client";
import type {
  BirthdayCardTemplate,
  BirthdayTodayResponse,
  BirthdayWishListResponse,
  BirthdayWishReadResponse,
  BirthdayWishSendPayload,
  BirthdayWishSendResponse,
} from "../types/birthday.types";

export const birthdayService = {
  /**
   * Khối "SINH NHẬT HÔM NAY" trên Bảng tin (chỉ bạn bè đang bật hiển thị ngày sinh)
   */
  async getTodayBirthdays(limit = 3): Promise<BirthdayTodayResponse> {
    const res = await api.get<BirthdayTodayResponse>("/api/v1/birthday/today", {
      params: { limit },
    });
    return res.data;
  },

  /**
   * Danh sách mẫu thiệp xanh sinh thái dùng cho popup tặng thiệp
   */
  async getCardTemplates(): Promise<BirthdayCardTemplate[]> {
    const res = await api.get<BirthdayCardTemplate[]>("/api/v1/birthday/card-templates");
    return res.data;
  },

  /**
   * Gửi lời chúc xanh (MESSAGE) hoặc tặng thiệp xanh sinh thái (CARD)
   */
  async sendWish(payload: BirthdayWishSendPayload): Promise<BirthdayWishSendResponse> {
    const res = await api.post<BirthdayWishSendResponse>("/api/v1/birthday/wishes", payload);
    return res.data;
  },

  /**
   * Hộp thư lời chúc / thiệp xanh sinh nhật đã nhận
   */
  async getReceivedWishes(limit = 20, offset = 0): Promise<BirthdayWishListResponse> {
    const res = await api.get<BirthdayWishListResponse>("/api/v1/birthday/wishes/received", {
      params: { limit, offset },
    });
    return res.data;
  },

  /**
   * Đánh dấu đã đọc (không truyền wish_ids = đánh dấu toàn bộ hộp thư)
   */
  async markWishesRead(wishIds?: string[]): Promise<BirthdayWishReadResponse> {
    const res = await api.post<BirthdayWishReadResponse>(
      "/api/v1/birthday/wishes/read",
      wishIds && wishIds.length > 0 ? { wish_ids: wishIds } : {}
    );
    return res.data;
  },
};
