import React, { useState, useEffect } from "react";
import type { GroupItem, GroupType, AdministrativeMetadata } from "./types/group";
import { groupService } from "./services/groupService";
import { GroupTypeSelector } from "./components/GroupTypeSelector";
import { CreateGroupForm } from "./components/CreateGroupForm";
import { GroupCreatedSuccessModal } from "./components/GroupCreatedSuccessModal";
import { InviteFriendsModal } from "./components/InviteFriendsModal";
import { GroupDetailView } from "./components/GroupDetailView";
import { MyGroupsView } from "./components/MyGroupsView";
import { ExploreGroupsView } from "./components/ExploreGroupsView";
import "./styles/groups.scss";

interface GroupsContainerProps {
  currentUser?: {
    user_id: string;
    full_name: string;
    district?: string | null;
  } | null;
  onNavigateToProfile?: () => void;
  initialTab?: "my_groups" | "explore" | "create";
}

export const GroupsContainer: React.FC<GroupsContainerProps> = ({
  currentUser,
  onNavigateToProfile,
  initialTab = "my_groups",
}) => {
  const [activeTab, setActiveTab] = useState<"my_groups" | "explore" | "create">(initialTab);
  const [selectedGroupType, setSelectedGroupType] = useState<GroupType | null>(null);

  const [metadata, setMetadata] = useState<AdministrativeMetadata>({
    districts: [],
    wards_by_district: {},
    theme_topics: [],
  });

  const [myGroups, setMyGroups] = useState<GroupItem[]>([]);
  const [exploreGroupsList, setExploreGroupsList] = useState<GroupItem[]>([]);
  const [adminGroupsCount, setAdminGroupsCount] = useState<number>(0);

  const [isLoadingMyGroups, setIsLoadingMyGroups] = useState(false);
  const [isLoadingExplore, setIsLoadingExplore] = useState(false);

  // Bộ lọc khám phá
  const [filterType, setFilterType] = useState<GroupType | "">("");
  const [filterDistrict, setFilterDistrict] = useState<string>("");
  const [searchKeyword, setSearchKeyword] = useState<string>("");

  // Chi tiết nhóm đang xem
  const [viewingGroupId, setViewingGroupId] = useState<string | null>(null);

  // Modal states
  const [createdGroup, setCreatedGroup] = useState<GroupItem | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Nạp metadata khi khởi động
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const data = await groupService.getMetadata();
        setMetadata(data);
      } catch (err) {
        console.error("Lỗi nạp metadata nhóm:", err);
      }
    };
    fetchMeta();
  }, []);

  // Nạp danh sách Nhóm của tôi
  const fetchMyGroups = async () => {
    try {
      setIsLoadingMyGroups(true);
      const res = await groupService.getMyGroups();
      setMyGroups(res.items || []);
      setAdminGroupsCount(res.admin_groups_count || 0);
    } catch (err) {
      console.error("Lỗi nạp nhóm của tôi:", err);
    } finally {
      setIsLoadingMyGroups(false);
    }
  };

  // Nạp danh sách Khám phá
  const fetchExploreGroups = async (filters?: {
    group_type?: GroupType;
    district?: string;
    q?: string;
  }) => {
    try {
      setIsLoadingExplore(true);
      const res = await groupService.exploreGroups({
        group_type: filters?.group_type || (filterType ? filterType : undefined),
        district: filters?.district || (filterDistrict ? filterDistrict : undefined),
        q: filters?.q !== undefined ? filters.q : searchKeyword,
      });
      setExploreGroupsList(res.items || []);
    } catch (err) {
      console.error("Lỗi nạp danh sách khám phá:", err);
    } finally {
      setIsLoadingExplore(false);
    }
  };

  useEffect(() => {
    if (activeTab === "my_groups") {
      fetchMyGroups();
    } else if (activeTab === "explore") {
      fetchExploreGroups();
    }
  }, [activeTab]);

  const handleGroupCreated = (group: GroupItem) => {
    setCreatedGroup(group);
    fetchMyGroups();
  };

  const handleEnterGroupFromSuccess = () => {
    if (createdGroup) {
      const gid = createdGroup.group_id;
      setCreatedGroup(null);
      setViewingGroupId(gid);
    }
  };

  const handleOpenInviteFromSuccess = () => {
    setShowInviteModal(true);
  };

  const handleJoinFromExplore = async (groupId: string) => {
    try {
      const res = await groupService.joinGroup(groupId);
      showToast(res.message || "Tham gia nhóm thành công");
      fetchExploreGroups();
      fetchMyGroups();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Tham gia thất bại");
    }
  };

  const handleGroupDisbanded = () => {
    showToast("Đã giải tán nhóm");
    setViewingGroupId(null);
    setActiveTab("my_groups");
    fetchMyGroups();
  };

  return (
    <div className="groups-container" data-testid="groups-container">
      {/* Toast thông báo chuẩn SRS 3 giây */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "#0f172a",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: 12,
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
            zIndex: 11000,
            fontSize: 14,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
          data-testid="toast-notification"
        >
          <span>🌱</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Điều Hướng */}
      <div className="groups-header">
        <div className="header-titles">
          <h1>Cộng Đồng & Nhóm Xanh</h1>
          <p>Tham gia các đội ngũ hành động vì môi trường, chống ngập và tái chế tại địa phương</p>
        </div>

        {!viewingGroupId && (
          <div className="header-nav">
            <button
              type="button"
              className={activeTab === "my_groups" ? "active" : ""}
              onClick={() => {
                setActiveTab("my_groups");
                setSelectedGroupType(null);
              }}
              data-testid="tab-my-groups"
            >
              Nhóm của tôi ({myGroups.length})
            </button>
            <button
              type="button"
              className={activeTab === "explore" ? "active" : ""}
              onClick={() => {
                setActiveTab("explore");
                setSelectedGroupType(null);
              }}
              data-testid="tab-explore"
            >
              Khám phá nhóm
            </button>
            <button
              type="button"
              className={activeTab === "create" ? "active" : ""}
              onClick={() => {
                setActiveTab("create");
                setSelectedGroupType(null);
              }}
              data-testid="tab-create-group"
            >
              + Tạo nhóm mới
            </button>
          </div>
        )}
      </div>

      {/* Nội dung chi tiết nhóm */}
      {viewingGroupId ? (
        <GroupDetailView
          groupId={viewingGroupId}
          onBack={() => setViewingGroupId(null)}
          onGroupDisbanded={handleGroupDisbanded}
        />
      ) : activeTab === "create" ? (
        /* MÀN 1 HOẶC MÀN 2 TẠO NHÓM */
        selectedGroupType ? (
          <CreateGroupForm
            groupType={selectedGroupType}
            metadata={metadata}
            userDistrict={currentUser?.district}
            onCancel={() => setSelectedGroupType(null)}
            onSuccess={handleGroupCreated}
          />
        ) : (
          <GroupTypeSelector
            selectedType={selectedGroupType}
            onSelectType={(type) => setSelectedGroupType(type)}
            adminGroupsCount={adminGroupsCount}
            userDistrict={currentUser?.district}
            onViewMyGroups={() => setActiveTab("my_groups")}
            onNavigateToProfile={onNavigateToProfile}
          />
        )
      ) : activeTab === "explore" ? (
        /* TAB KHÁM PHÁ NHÓM */
        <ExploreGroupsView
          groups={exploreGroupsList}
          metadata={metadata}
          isLoading={isLoadingExplore}
          selectedType={filterType}
          selectedDistrict={filterDistrict}
          searchKeyword={searchKeyword}
          onFilterChange={(filters) => {
            if (filters.group_type !== undefined) setFilterType(filters.group_type);
            if (filters.district !== undefined) setFilterDistrict(filters.district);
            if (filters.q !== undefined) setSearchKeyword(filters.q);
            fetchExploreGroups(filters);
          }}
          onSelectGroup={(id) => setViewingGroupId(id)}
          onJoinGroup={handleJoinFromExplore}
        />
      ) : (
        /* TAB NHÓM CỦA TÔI */
        <MyGroupsView
          groups={myGroups}
          isLoading={isLoadingMyGroups}
          onSelectGroup={(id) => setViewingGroupId(id)}
          onCreateNew={() => {
            setActiveTab("create");
            setSelectedGroupType(null);
          }}
        />
      )}

      {/* MÀN 3: POPUP ĐÃ TẠO NHÓM THÀNH CÔNG */}
      {createdGroup && (
        <GroupCreatedSuccessModal
          group={createdGroup}
          onInviteFriends={handleOpenInviteFromSuccess}
          onEnterGroup={handleEnterGroupFromSuccess}
        />
      )}

      {/* MODAL MỜI BẠN BÈ */}
      {showInviteModal && createdGroup && (
        <InviteFriendsModal
          groupId={createdGroup.group_id}
          groupName={createdGroup.name}
          isOpen={showInviteModal}
          onClose={() => {
            setShowInviteModal(false);
            setCreatedGroup(null);
            fetchMyGroups();
          }}
          onEnterGroup={() => {
            setShowInviteModal(false);
            handleEnterGroupFromSuccess();
          }}
        />
      )}
    </div>
  );
};

