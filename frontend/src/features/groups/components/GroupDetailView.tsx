import React, { useState, useEffect } from "react";
import type { GroupItem } from "../types/group";
import { groupService } from "../services/groupService";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import { DisbandGroupModal } from "./DisbandGroupModal";

interface GroupDetailViewProps {
  groupId: string;
  onBack: () => void;
  onGroupDisbanded: () => void;
}

export const GroupDetailView: React.FC<GroupDetailViewProps> = ({
  groupId,
  onBack,
  onGroupDisbanded,
}) => {
  const [group, setGroup] = useState<GroupItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDisbandModal, setShowDisbandModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetail = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await groupService.getGroupDetail(groupId);
      setGroup(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Không thể tải thông tin nhóm");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [groupId]);

  const handleJoin = async () => {
    if (!group || actionLoading) return;
    try {
      setActionLoading(true);
      await groupService.joinGroup(groupId);
      await fetchDetail();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Tham gia nhóm thất bại");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!group || actionLoading) return;
    if (!window.confirm("Bạn chắc chắn muốn rời nhóm này?")) return;

    try {
      setActionLoading(true);
      await groupService.leaveGroup(groupId);
      await fetchDetail();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Rời nhóm thất bại");
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: "64px 0", color: "#64748b" }}>
        Đang tải thông tin nhóm…
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="empty-state">
        <div className="empty-icon">⚠️</div>
        <h3>{error || "Nhóm không còn tồn tại"}</h3>
        <button
          type="button"
          onClick={onBack}
          style={{
            padding: "8px 16px",
            background: "#059669",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const isAdmin = group.my_role === "ADMIN";

  return (
    <div className="group-detail-view" data-testid="group-detail-view">
      {/* Nút quay lại */}
      <div style={{ marginBottom: 16 }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            color: "#059669",
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 14,
          }}
          data-testid="btn-back-to-list"
        >
          ← Quay lại danh sách nhóm
        </button>
      </div>

      {/* Banner & Cover */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 20,
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            height: 220,
            background: "#cbd5e1",
            position: "relative",
          }}
        >
          {group.cover_image_url ? (
            <img
              src={resolveMediaUrl(group.cover_image_url)}
              alt="Ảnh bìa nhóm"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "linear-gradient(135deg, #059669, #10b981)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontSize: 48,
              }}
            >
              🌿
            </div>
          )}

          <div
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              background: "rgba(15, 23, 42, 0.75)",
              backdropFilter: "blur(4px)",
              color: "#ffffff",
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {group.privacy === "PUBLIC" ? "🌐 Công khai" : "🔒 Riêng tư"}
          </div>
        </div>

        {/* Thông tin chính */}
        <div style={{ padding: "24px 32px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span
                style={{
                  background: "#ecfdf5",
                  color: "#047857",
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                {group.group_type === "DISTRICT" ? "Theo quận" : group.group_type === "WARD" ? "Theo phường" : "Theo chủ đề"}
              </span>
              {group.district && (
                <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>
                  📍 {group.district} {group.ward ? `• ${group.ward}` : ""}
                </span>
              )}
              {group.theme_topic && (
                <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>
                  🏷️ {group.theme_topic}
                </span>
              )}
            </div>

            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: "0 0 10px 0" }} data-testid="detail-group-name">
              {group.name}
            </h1>

            <div style={{ display: "flex", gap: 20, fontSize: 14, color: "#64748b" }}>
              <span>
                👥 <strong>{group.members_count}</strong> thành viên
              </span>
              <span>
                📝 <strong>{group.posts_count}</strong> bài viết
              </span>
              {group.creator_name && (
                <span>
                  👑 Người lập: <strong>{group.creator_name}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Nút hành động */}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowDisbandModal(true)}
                style={{
                  padding: "10px 16px",
                  background: "#fef2f2",
                  color: "#dc2626",
                  border: "1.5px solid #fecaca",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
                data-testid="btn-open-disband-modal"
              >
                🗑️ Giải tán nhóm
              </button>
            )}

            {group.is_member ? (
              <button
                type="button"
                onClick={handleLeave}
                disabled={actionLoading}
                style={{
                  padding: "10px 18px",
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                data-testid="btn-leave-group"
              >
                Rời nhóm
              </button>
            ) : (
              <button
                type="button"
                onClick={handleJoin}
                disabled={actionLoading}
                style={{
                  padding: "10px 24px",
                  background: "#059669",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
                data-testid="btn-join-group"
              >
                Tham gia nhóm
              </button>
            )}
          </div>
        </div>

        {/* Giới thiệu nhóm */}
        {group.description && (
          <div
            style={{
              padding: "16px 32px 24px",
              borderTop: "1px solid #f1f5f9",
              fontSize: 14,
              color: "#334155",
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4, color: "#0f172a" }}>Giới thiệu nhóm</div>
            {group.description}
          </div>
        )}
      </div>

      {/* Popup Giải tán nhóm */}
      <DisbandGroupModal
        groupId={group.group_id}
        groupName={group.name}
        isOpen={showDisbandModal}
        onClose={() => setShowDisbandModal(false)}
        onSuccess={() => {
          setShowDisbandModal(false);
          onGroupDisbanded();
        }}
      />
    </div>
  );
};

