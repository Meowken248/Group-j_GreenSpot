/**
 * GroupMembersTab.tsx
 * Tab danh sách thành viên nhóm cộng đồng (Chức năng 16)
 * Hiển thị avatar, tên, vai trò (ADMIN, MODERATOR, MEMBER), ngày gia nhập và nút mời bạn bè.
 */

import React, { useState, useEffect } from "react";
import { groupService } from "../services/groupService";
import type { GroupMemberItem } from "../types/group";
import { resolveMediaUrl } from "../../../utils/mediaUrl";

interface GroupMembersTabProps {
  groupId: string;
  isAdmin: boolean;
  onInviteClick?: () => void;
}

export const GroupMembersTab: React.FC<GroupMembersTabProps> = ({
  groupId,
  isAdmin: _isAdmin,
  onInviteClick,
}) => {
  const [members, setMembers] = useState<GroupMemberItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    const fetchMembers = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await groupService.getGroupMembers(groupId);
        if (isMounted) {
          setMembers(data.items || []);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.response?.data?.detail || "Không thể tải danh sách thành viên");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMembers();
    return () => {
      isMounted = false;
    };
  }, [groupId]);

  const filteredMembers = members.filter((m) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      m.full_name.toLowerCase().includes(term) ||
      (m.district && m.district.toLowerCase().includes(term))
    );
  });

  const admins = filteredMembers.filter((m) => m.role === "ADMIN" || m.role === "MODERATOR");
  const regularMembers = filteredMembers.filter((m) => m.role !== "ADMIN" && m.role !== "MODERATOR");

  return (
    <div
      className="group-members-tab"
      data-testid="group-members-tab"
      style={{
        background: "#ffffff",
        borderRadius: "16px",
        border: "1px solid #e2e8f0",
        padding: "24px",
        boxShadow: "0 2px 10px -2px rgba(0, 0, 0, 0.04)",
      }}
    >
      {/* Thanh công cụ tìm kiếm và nút Mời bạn bè */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "20px",
          paddingBottom: "16px",
          borderBottom: "1px solid #f1f5f9",
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: 700,
              color: "#0f172a",
            }}
          >
            Thành viên nhóm ({members.length})
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
            Những công dân tích cực tham gia bảo vệ môi trường trong nhóm này.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <input
            type="text"
            placeholder="Tìm thành viên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              fontSize: "13px",
              width: "180px",
              outline: "none",
            }}
          />

          {onInviteClick && (
            <button
              type="button"
              onClick={onInviteClick}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                background: "#059669",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              data-testid="btn-open-invite"
            >
              <span>+</span>
              <span>Mời bạn bè</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
          Đang tải danh sách thành viên…
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "30px 0", color: "#ef4444" }}>
          {error}
        </div>
      ) : members.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
          Chưa có thành viên nào trong nhóm.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Nhóm Quản trị viên */}
          {admins.length > 0 && (
            <div>
              <h4
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#475569",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  margin: "0 0 12px 0",
                }}
              >
                Quản trị viên & Điều phối viên ({admins.length})
              </h4>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: "12px",
                }}
              >
                {admins.map((mem) => renderMemberCard(mem))}
              </div>
            </div>
          )}

          {/* Nhóm Thành viên */}
          <div>
            <h4
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "#475569",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                margin: "0 0 12px 0",
              }}
            >
              Thành viên ({regularMembers.length})
            </h4>
            {regularMembers.length === 0 ? (
              <div style={{ fontSize: "13px", color: "#94a3b8", padding: "8px 0" }}>
                {searchTerm ? "Không tìm thấy thành viên phù hợp." : "Chưa có thành viên nào khác."}
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: "12px",
                }}
              >
                {regularMembers.map((mem) => renderMemberCard(mem))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  function renderMemberCard(mem: GroupMemberItem) {
    const isOwner = mem.role === "ADMIN";
    return (
      <div
        key={mem.user_id}
        data-testid={`member-card-${mem.user_id}`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "12px 14px",
          borderRadius: "12px",
          border: "1px solid #f1f5f9",
          background: "#f8fafc",
          transition: "all 0.2s ease",
        }}
      >
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            overflow: "hidden",
            background: "#e2e8f0",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            color: "#475569",
          }}
        >
          {mem.avatar_url ? (
            <img
              src={resolveMediaUrl(mem.avatar_url)}
              alt={mem.full_name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span>{mem.full_name.charAt(0).toUpperCase()}</span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "2px",
            }}
          >
            <span
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#0f172a",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {mem.full_name}
            </span>
            {isOwner && (
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#b45309",
                  background: "#fef3c7",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  flexShrink: 0,
                }}
              >
                👑 Quản trị viên
              </span>
            )}
            {mem.role === "MODERATOR" && (
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#1d4ed8",
                  background: "#dbeafe",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  flexShrink: 0,
                }}
              >
                🛡️ Điều phối
              </span>
            )}
          </div>

          <div
            style={{
              fontSize: "12px",
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {mem.district && (
              <span style={{ color: "#059669", fontWeight: 600 }}>
                📍 {mem.district}
              </span>
            )}
            {mem.joined_at && (
              <span>
                Tham gia: {new Date(mem.joined_at).toLocaleDateString("vi-VN")}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }
};
