import api from "../../../api/client";
import { reverseGeocodeOSM } from "../../../services/osmAdvancedService";
import type {
  CreatePostPayload,
  PostDetail,
  MediaItem,
  FriendOption,
  VolunteerGroupOption,
} from "../types/postTypes";

export const postService = {
  /**
   * Tải tệp ảnh hoặc video lên máy chủ (Màn 1)
   */
  async uploadMedia(file: File): Promise<MediaItem> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post("/api/v1/posts/media", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  },

  /**
   * Tạo bài viết mới lên hệ thống (Màn 1 -> Màn 4)
   */
  async createPost(payload: CreatePostPayload): Promise<PostDetail> {
    const response = await api.post<PostDetail>("/api/v1/posts", payload);
    return response.data;
  },

  /**
   * Lấy chi tiết bài viết vừa tạo (Màn 4 -> Xem bài viết)
   */
  async getPostById(postId: string): Promise<PostDetail> {
    const response = await api.get<PostDetail>(`/api/v1/posts/${postId}`);
    return response.data;
  },

  /**
   * Lấy danh sách bạn bè để gắn thẻ (Màn 3)
   */
  async getFriends(): Promise<FriendOption[]> {
    try {
      const response = await api.get("/api/v1/friends");
      const friendsData = response.data?.friends || response.data || [];
      return friendsData.map((f: any) => ({
        user_id: f.user_id || f.id,
        full_name: f.full_name || f.name || "Bạn bè",
        avatar_url: f.avatar_url || null,
        email: f.email || "",
      }));
    } catch {
      // Fallback danh sách bạn bè mẫu nếu chưa có dữ liệu kết bạn
      return [
        {
          user_id: "66666666-0001-0000-0000-000000000001",
          full_name: "Nguyễn Văn An",
          avatar_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
          email: "req_an@ecoreport.gov.vn",
        },
        {
          user_id: "66666666-0002-0000-0000-000000000002",
          full_name: "Trần Thị Mai",
          avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
          email: "req_mai@ecoreport.gov.vn",
        },
        {
          user_id: "66666666-0003-0000-0000-000000000003",
          full_name: "Lê Hoàng Phúc",
          avatar_url: null,
          email: "req_phuc@ecoreport.gov.vn",
        },
      ];
    }
  },

  /**
   * Lấy danh sách các nhóm tình nguyện đã tham gia (Màn 3)
   */
  async getVolunteerGroups(): Promise<VolunteerGroupOption[]> {
    try {
      const response = await api.get<VolunteerGroupOption[]>("/api/v1/posts/groups/joined");
      return response.data;
    } catch {
      return [
        {
          group_id: "88888888-0001-0000-0000-000000000001",
          name: "CLB Tình nguyện Sài Gòn Xanh",
          description: "Nhóm xung kích dọn dẹp điểm nóng rác kênh rạch nội đô",
          members_count: 1280,
          district: "Quận 1",
          requires_approval: false,
        },
        {
          group_id: "88888888-0002-0000-0000-000000000002",
          name: "Cộng đồng Tái chế Nhựa & Sống xanh Thủ Đức",
          description: "Chia sẻ kinh nghiệm phân loại rác và đổi rác lấy quà",
          members_count: 850,
          district: "TP. Thủ Đức",
          requires_approval: true,
        },
        {
          group_id: "88888888-0003-0000-0000-000000000003",
          name: "Chiến binh Xanh Kênh Nhiêu Lộc - Thị Nghè",
          description: "Bảo vệ dòng kênh xanh và tuyên truyền không xả rác",
          members_count: 640,
          district: "Quận Bình Thạnh",
          requires_approval: false,
        },
      ];
    }
  },

  /**
   * Reverse Geocoding tự động chuyển toạ độ thành số nhà và tên đường thật (Màn 2)
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    try {
      // 1. Sử dụng engine OpenStreetMap / Photon Komoot chuyên sâu có cache
      const osmRes = await reverseGeocodeOSM(latitude, longitude);
      if (osmRes && osmRes.fullAddress && !osmRes.fullAddress.startsWith("Tọa độ:")) {
        // Nếu có đầy đủ số nhà và tên đường
        if (osmRes.houseNumber && osmRes.street) {
          const parts = [`Số ${osmRes.houseNumber} ${osmRes.street}`];
          if (osmRes.district) parts.push(osmRes.district);
          if (osmRes.city && osmRes.city !== osmRes.district) parts.push(osmRes.city);
          return parts.join(", ");
        }
        if (osmRes.street) {
          const parts = [osmRes.street];
          if (osmRes.district) parts.push(osmRes.district);
          if (osmRes.city && osmRes.city !== osmRes.district) parts.push(osmRes.city);
          return parts.join(", ");
        }
        return osmRes.fullAddress;
      }
    } catch (err) {
      console.warn("Lỗi dịch địa chỉ từ osmAdvancedService:", err);
    }

    // 2. Dự phòng qua BigDataCloud API tiếng Việt
    try {
      const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=vi`;
      const res = await fetch(bdcUrl);
      if (res.ok) {
        const data = await res.json();
        const parts: string[] = [];
        if (data.locality) parts.push(data.locality);
        if (data.city && data.city !== data.locality) parts.push(data.city);
        if (data.principalSubdivision && !parts.includes(data.principalSubdivision)) {
          parts.push(data.principalSubdivision);
        }
        if (parts.length > 0) {
          return parts.join(", ");
        }
      }
    } catch {
      // Bỏ qua lỗi mạng
    }

    // 3. Fallback vị trí gần nhất
    return `Khu vực toạ độ (${latitude.toFixed(4)}, ${longitude.toFixed(4)}), TP. Hồ Chí Minh`;
  },
};
