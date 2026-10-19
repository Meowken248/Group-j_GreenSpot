import React, { useState, useEffect } from "react";
import type { ChatConversation, ChatUserSummary } from "../types/chat.types";
import { chatService } from "../services/chatService";

interface LeaveOrDeleteModalProps {
  isOpen: boolean;
  mode: "delete" | "leave";
  conversation: ChatConversation | null;
  currentUserId?: string;
  onClose: () => void;
  onConfirmDelete: (conv: ChatConversation) => Promise<void>;
  onConfirmLeave: (conv: ChatConversation, newAdminUserId?: string) => Promise<void>;
}

export const LeaveOrDeleteModal: React.FC<LeaveOrDeleteModalProps> = ({
  isOpen,
  mode,
  conversation,
  currentUserId,
  onClose,
  onConfirmDelete,
  onConfirmLeave,
}) => {
  const [selectedNewAdminId, setSelectedNewAdminId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fetchedMembers, setFetchedMembers] = useState<ChatUserSummary[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  const isDeleteMode = mode === "delete";
  const isLeaveMode = mode === "leave";

  // Kiểm tra xem người dùng hiện tại có phải là Quản trị viên của nhóm hay không
  const isAdmin =
    isLeaveMode &&
    Boolean(
      conversation?.is_admin ||
      (conversation?.admin_user_id && conversation.admin_user_id === currentUserId) ||
      (conversation?.creator_id && conversation.creator_id === currentUserId)
    );

  // Tải danh sách thành viên nhóm khi mở popup Rời nhóm
  useEffect(() => {
    if (isOpen && isLeaveMode && conversation) {
      setSelectedNewAdminId("");
      setErrorMessage(null);

      if (typeof chatService.getConversationMembers === "function") {
        setIsLoadingMembers(true);
        chatService
          .getConversationMembers(conversation.conversation_id)
          .then((members) => {
            setFetchedMembers(members || []);
          })
          .catch(() => {
            setFetchedMembers(conversation.members || []);
          })
          .finally(() => {
            setIsLoadingMembers(false);
          });
      } else {
        setFetchedMembers(conversation.members || []);
      }
    } else {
      setFetchedMembers([]);
      setSelectedNewAdminId("");
    }
  }, [isOpen, isLeaveMode, conversation?.conversation_id]);

  if (!isOpen || !conversation) return null;

  // Danh sách các thành viên khác để chuyển quyền quản trị
  const candidatePool = fetchedMembers.length > 0 ? fetchedMembers : conversation.members || [];
  const otherMembers = candidatePool.filter((m) => m.user_id !== currentUserId);

  const mustTransferAdmin = isAdmin && otherMembers.length > 0;

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      if (isDeleteMode) {
        await onConfirmDelete(conversation);
      } else if (isLeaveMode) {
        if (mustTransferAdmin && !selectedNewAdminId) {
          setErrorMessage("Bạn là Quản trị viên duy nhất. Vui lòng chọn người kế nhiệm trước khi rời nhóm.");
          setIsSubmitting(false);
          return;
        }
        await onConfirmLeave(conversation, selectedNewAdminId || undefined);
      }
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Thao tác thất bại. Vui lòng thử lại.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="chat-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="chat-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-card-header">
          <h3>
            {isDeleteMode ? "Xóa cuộc trò chuyện" : "Rời khỏi nhóm trò chuyện"}
          </h3>
          <button
            type="button"
            className="btn-close-modal"
            onClick={onClose}
            title="Đóng"
          >
            ✕
          </button>
        </div>

        <div className="modal-card-body">
          {errorMessage && (
            <div style={{ color: "#ef4444", fontSize: 13, fontWeight: 600 }}>
              ⚠️ {errorMessage}
            </div>
          )}

          {isDeleteMode ? (
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "#475569" }}>
              Bạn có chắc chắn muốn xóa cuộc trò chuyện này? Cuộc trò chuyện sẽ bị ẩn khỏi danh sách của bạn.
              {conversation.type === "direct" && " Đối phương vẫn sẽ giữ lịch sử tin nhắn phía họ."}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "#475569" }}>
                Bạn có chắc chắn muốn rời khỏi nhóm <strong>"{conversation.title}"</strong> không? Bạn sẽ không còn nhận được các tin nhắn trao đổi từ nhóm này nữa.
              </p>

              {/* Nếu là Quản trị viên duy nhất thì bắt buộc phải chuyển quyền */}
              {mustTransferAdmin && (
                <div className="form-group" style={{ marginTop: 8 }}>
                  <label htmlFor="new-admin-select" style={{ color: "#d97706" }}>
                    ⚠️ Bạn đang là Quản trị viên của nhóm. Vui lòng chỉ định Quản trị viên mới trước khi rời nhóm:
                  </label>
                  {isLoadingMembers ? (
                    <div style={{ fontSize: 13, color: "#94a3b8" }}>Đang tải danh sách thành viên nhóm...</div>
                  ) : (
                    <select
                      id="new-admin-select"
                      className="text-input"
                      value={selectedNewAdminId}
                      onChange={(e) => {
                        setSelectedNewAdminId(e.target.value);
                        setErrorMessage(null);
                      }}
                    >
                      <option value="">-- Chọn thành viên kế nhiệm --</option>
                      {otherMembers.map((member) => (
                        <option key={member.user_id} value={member.user_id}>
                          {member.full_name} {member.district ? `(${member.district})` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-card-footer">
          <button
            type="button"
            className="btn-modal-cancel"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Hủy
          </button>
          <button
            type="button"
            className="btn-modal-submit danger"
            onClick={handleConfirm}
            disabled={isSubmitting || (isLeaveMode && mustTransferAdmin && !selectedNewAdminId)}
          >
            {isSubmitting
              ? "Đang xử lý..."
              : isDeleteMode
              ? "Xóa trò chuyện"
              : mustTransferAdmin
              ? "Chuyển quyền & Rời nhóm"
              : "Rời nhóm"}
          </button>
        </div>
      </div>
    </div>
  );
};
