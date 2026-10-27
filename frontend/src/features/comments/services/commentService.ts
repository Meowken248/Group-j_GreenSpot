/**
 * Service API Client cho Chức năng 14: Bình luận, Trả lời bình luận và Chia sẻ bài viết
 */

import api from "../../../api/client";
import type {
  CommentListResponse,
  CommentItem,
  ReplyListResponse,
  ReplyItem,
  SharePostRequest,
  SharePostResponse,
  ShareFriendOption,
  ShareGroupOption,
} from "../types/commentTypes";

export const commentService = {
  /**
   * Lấy danh sách bình luận cấp 1 của bài viết (Màn 1)
   */
  async getPostComments(
    postId: string,
    page: number = 1,
    limit: number = 10,
    sort: string = "relevant"
  ): Promise<CommentListResponse> {
    const res = await api.get<CommentListResponse>(`/api/v1/posts/${postId}/comments`, {
      params: { page, limit, sort },
    });
    return res.data;
  },

  /**
   * Tải ảnh đính kèm bình luận (tái sử dụng endpoint chuẩn của hệ thống /api/v1/posts/media)
   */
  async uploadMedia(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post<{ url: string }>("/api/v1/posts/media", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data.url;
  },

  /**
   * Đăng bình luận cấp 1 (Màn 1)
   */
  async createComment(
    postId: string,
    content?: string,
    mediaUrl?: string | null
  ): Promise<CommentItem> {
    const res = await api.post<CommentItem>(`/api/v1/posts/${postId}/comments`, {
      content: content || "",
      media_url: mediaUrl || null,
    });
    return res.data;
  },

  /**
   * Lấy toàn bộ câu trả lời của một bình luận gốc (Màn 2)
   */
  async getCommentReplies(commentId: string): Promise<ReplyListResponse> {
    const res = await api.get<ReplyListResponse>(`/api/v1/comments/${commentId}/replies`);
    return res.data;
  },

  /**
   * Đăng câu trả lời cho một bình luận hoặc reply (Màn 2)
   */
  async createReply(
    commentId: string,
    content?: string,
    replyToUserId?: string,
    mediaUrl?: string | null
  ): Promise<ReplyItem> {
    const res = await api.post<ReplyItem>(`/api/v1/comments/${commentId}/replies`, {
      content: content || "",
      reply_to_user_id: replyToUserId || null,
      media_url: mediaUrl || null,
    });
    return res.data;
  },

  /**
   * Xóa mềm bình luận
   */
  async deleteComment(commentId: string): Promise<{ success: boolean; message: string }> {
    const res = await api.delete<{ success: boolean; message: string }>(`/api/v1/comments/${commentId}`);
    return res.data;
  },

  /**
   * Chia sẻ bài viết (Màn 3)
   */
  async sharePost(postId: string, payload: SharePostRequest): Promise<SharePostResponse> {
    const res = await api.post<SharePostResponse>(`/api/v1/posts/${postId}/share`, payload);
    return res.data;
  },

  /**
   * Lấy danh sách bạn bè để chọn khi chia sẻ
   */
  async getFriendsForShare(query?: string): Promise<ShareFriendOption[]> {
    try {
      const res = await api.get<any[]>("/api/v1/friends/list", {
        params: query ? { query } : undefined,
      });
      return (res.data || []).map((f) => ({
        user_id: f.user_id || f.friend_user_id,
        full_name: f.full_name || f.name || "Bạn bè",
        avatar_url: f.avatar_url,
        email: f.email,
      }));
    } catch {
      return [];
    }
  },

  /**
   * Lấy danh sách nhóm tình nguyện để chọn khi chia sẻ
   */
  async getGroupsForShare(): Promise<ShareGroupOption[]> {
    try {
      const res = await api.get<any[]>("/api/v1/posts/groups/joined");
      return (res.data || []).map((g) => ({
        group_id: g.group_id,
        name: g.name,
        description: g.description,
        members_count: g.members_count,
        district: g.district,
        requires_approval: Boolean(g.requires_approval),
        can_post: !g.requires_approval, // Nhóm duyệt bài bị coi là cần kiểm duyệt
      }));
    } catch {
      return [];
    }
  },
};

