import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConversationList } from "../components/ConversationList";
import { ChatHeader } from "../components/ChatHeader";
import { MessageList } from "../components/MessageList";
import { ChatComposer } from "../components/ChatComposer";
import { CreateGroupModal } from "../components/CreateGroupModal";
import { LeaveOrDeleteModal } from "../components/LeaveOrDeleteModal";
import { ChatContainer } from "../ChatContainer";
import type { ChatConversation, ChatMessage } from "../types/chat.types";

// Mock API and Socket services
vi.mock("../services/chatService", () => ({
  chatService: {
    getConversations: vi.fn().mockResolvedValue({
      items: [
        {
          conversation_id: "conv-1",
          type: "direct",
          title: "Nguyễn Văn A",
          other_user: {
            user_id: "u-2",
            full_name: "Nguyễn Văn A",
            avatar_url: null,
            email: "a@example.com",
            is_online: true,
          },
          last_message: {
            message_id: "m-1",
            conversation_id: "conv-1",
            sender_id: "u-2",
            sender_name: "Nguyễn Văn A",
            content: "Chào bạn nhé!",
            created_at: new Date().toISOString(),
            status: "sent",
          },
          unread_count: 2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      has_more: false,
    }),
    getMessages: vi.fn().mockResolvedValue({
      items: [
        {
          message_id: "m-1",
          conversation_id: "conv-1",
          sender_id: "u-2",
          sender_name: "Nguyễn Văn A",
          content: "Chào bạn nhé!",
          created_at: new Date().toISOString(),
          status: "sent",
        },
      ],
      has_more: false,
    }),
    getFriendsForGroup: vi.fn().mockResolvedValue([
      {
        user_id: "u-2",
        full_name: "Nguyễn Văn A",
        email: "a@example.com",
        avatar_url: null,
      },
      {
        user_id: "u-3",
        full_name: "Trần Thị B",
        email: "b@example.com",
        avatar_url: null,
      },
    ]),
    createDirectConversation: vi.fn().mockResolvedValue({
      conversation_id: "conv-new-direct",
      type: "direct",
      title: "Trần Thị B",
      unread_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
    createGroupConversation: vi.fn().mockResolvedValue({
      conversation_id: "conv-new-group",
      type: "group",
      title: "Nhóm Sống Xanh",
      unread_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
    getDistrictMembers: vi.fn().mockResolvedValue([]),
    getConversationMembers: vi.fn().mockResolvedValue([]),
    markAsSeen: vi.fn().mockResolvedValue({ success: true }),
    deleteConversation: vi.fn().mockResolvedValue({ success: true }),
    leaveGroup: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock("../services/chatSocket", () => ({
  chatSocket: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    getState: vi.fn().mockReturnValue("connected"),
    on: vi.fn().mockReturnValue(() => {}),
    sendMessage: vi.fn(),
    sendTyping: vi.fn(),
    sendSeen: vi.fn(),
  },
}));

describe("Chức năng 15: Frontend Realtime Chat Messenger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("greenspot_token", "test-token");
    localStorage.setItem(
      "greenspot_user",
      JSON.stringify({
        user_id: "u-1",
        full_name: "Người Dùng Thử Nghiệm",
        email: "user@greenspot.vn",
        role: "CITIZEN",
      })
    );
  });

  describe("Màn 1: Cột Trái - Danh Sách Hội Thoại (ConversationList)", () => {
    const mockConversations: ChatConversation[] = [
      {
        conversation_id: "conv-1",
        type: "direct",
        title: "Nguyễn Văn A",
        other_user: {
          user_id: "u-2",
          full_name: "Nguyễn Văn A",
          avatar_url: null,
          is_online: true,
        },
        last_message: {
          message_id: "m-1",
          conversation_id: "conv-1",
          sender_id: "u-2",
          sender_name: "Nguyễn Văn A",
          content: "Chào bạn nhé!",
          created_at: new Date().toISOString(),
          status: "sent",
        },
        unread_count: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        conversation_id: "conv-2",
        type: "group",
        title: "Nhóm Trồng Cây",
        unread_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    it("hiển thị tiêu đề Đoạn chat, nút Tạo nhóm và các tab điều hướng", () => {
      render(
        <ConversationList
          conversations={mockConversations}
          activeTab="direct"
          onTabChange={vi.fn()}
          onSelectConversation={vi.fn()}
          onOpenCreateGroup={vi.fn()}
          onDeleteConversation={vi.fn()}
          onLeaveGroup={vi.fn()}
          searchQuery=""
          onSearchChange={vi.fn()}
          isLoading={false}
          isLoadingMore={false}
          hasMore={false}
          onLoadMore={vi.fn()}
          connectionState="connected"
          onReconnectSocket={vi.fn()}
          currentUserId="u-1"
          unreadCountsByTab={{ direct: 3, group: 0, district: 0 }}
        />
      );

      expect(screen.getByText("Đoạn chat")).toBeInTheDocument();
      expect(screen.getByText("Tạo nhóm")).toBeInTheDocument();
      expect(screen.getByText("Trực tiếp")).toBeInTheDocument();
      expect(screen.getAllByText(/Nhóm/i).length).toBeGreaterThan(0);
      expect(screen.getByText("Quận")).toBeInTheDocument();
    });

    it("hiển thị banner cảnh báo màu vàng khi mất kết nối WebSocket", () => {
      const reconnectMock = vi.fn();
      render(
        <ConversationList
          conversations={mockConversations}
          activeTab="direct"
          onTabChange={vi.fn()}
          onSelectConversation={vi.fn()}
          onOpenCreateGroup={vi.fn()}
          onDeleteConversation={vi.fn()}
          onLeaveGroup={vi.fn()}
          searchQuery=""
          onSearchChange={vi.fn()}
          isLoading={false}
          isLoadingMore={false}
          hasMore={false}
          onLoadMore={vi.fn()}
          connectionState="disconnected"
          onReconnectSocket={reconnectMock}
          currentUserId="u-1"
        />
      );

      expect(
        screen.getByText(/Mất kết nối máy chủ/i)
      ).toBeInTheDocument();
      const reconnectBtn = screen.getByText("Thử lại");
      fireEvent.click(reconnectBtn);
      expect(reconnectMock).toHaveBeenCalledTimes(1);
    });

    it("chuyển tab khi bấm vào tab Nhóm", () => {
      const handleTabChange = vi.fn();
      render(
        <ConversationList
          conversations={mockConversations}
          activeTab="direct"
          onTabChange={handleTabChange}
          onSelectConversation={vi.fn()}
          onOpenCreateGroup={vi.fn()}
          onDeleteConversation={vi.fn()}
          onLeaveGroup={vi.fn()}
          searchQuery=""
          onSearchChange={vi.fn()}
          isLoading={false}
          isLoadingMore={false}
          hasMore={false}
          onLoadMore={vi.fn()}
          connectionState="connected"
          onReconnectSocket={vi.fn()}
          currentUserId="u-1"
        />
      );

      const groupTabBtn = screen.getByRole("button", { name: /^Nhóm/i });
      fireEvent.click(groupTabBtn);
      expect(handleTabChange).toHaveBeenCalledWith("group");
    });
  });

  describe("Màn 2: Cột Phải - Header, MessageList & Composer", () => {
    const mockConv: ChatConversation = {
      conversation_id: "conv-1",
      type: "direct",
      title: "Nguyễn Văn A",
      other_user: {
        user_id: "u-2",
        full_name: "Nguyễn Văn A",
        avatar_url: null,
        is_online: true,
      },
      unread_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it("ChatHeader hiển thị tiêu đề và trạng thái Đang hoạt động / Đang nhập", () => {
      render(
        <ChatHeader
          conversation={mockConv}
          onBackMobile={vi.fn()}
          isTyping={true}
          typingUserName="Nguyễn Văn A"
          onToggleDistrictSidebar={vi.fn()}
        />
      );

      expect(screen.getByText("Nguyễn Văn A")).toBeInTheDocument();
      expect(screen.getByText(/đang nhập.../i)).toBeInTheDocument();
    });

    it("MessageList hiển thị tin nhắn đến, tin nhắn đi và trạng thái Đã xem", () => {
      const mockMessages: ChatMessage[] = [
        {
          message_id: "m-1",
          conversation_id: "conv-1",
          sender_id: "u-2",
          sender_name: "Nguyễn Văn A",
          content: "Chào bạn!",
          created_at: new Date().toISOString(),
          status: "seen",
        },
        {
          message_id: "m-2",
          conversation_id: "conv-1",
          sender_id: "u-1",
          sender_name: "Người Dùng Thử Nghiệm",
          content: "Chào A, rất vui được gặp bạn!",
          created_at: new Date().toISOString(),
          status: "seen",
        },
      ];

      render(
        <MessageList
          messages={mockMessages}
          currentUserId="u-1"
          conversationType="direct"
          hasMoreOlder={false}
          isLoadingOlder={false}
          onLoadOlder={vi.fn()}
        />
      );

      expect(screen.getByText("Chào bạn!")).toBeInTheDocument();
      expect(screen.getByText("Chào A, rất vui được gặp bạn!")).toBeInTheDocument();
      expect(screen.getByText(/Đã xem/i)).toBeInTheDocument();
    });

    it("ChatComposer hỗ trợ nhập tin nhắn, đếm ký tự 1000 và gửi khi nhấn Enter", async () => {
      const handleSendMessage = vi.fn().mockResolvedValue(true);
      const handleTyping = vi.fn();

      render(
        <ChatComposer
          onSendMessage={handleSendMessage}
          isSending={false}
          conversationType="direct"
          onTyping={handleTyping}
        />
      );

      const textarea = screen.getByPlaceholderText("Nhập tin nhắn...");
      fireEvent.change(textarea, { target: { value: "Hôm nay tôi đã phân loại rác tái chế" } });

      expect(screen.getByText("36/1000")).toBeInTheDocument();
      expect(handleTyping).toHaveBeenCalledWith(true);

      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
      await waitFor(() => {
        expect(handleSendMessage).toHaveBeenCalledWith(
          "Hôm nay tôi đã phân loại rác tái chế",
          undefined
        );
      });
    });

    it("ChatComposer không cho gửi tin rỗng", () => {
      const handleSendMessage = vi.fn().mockResolvedValue(true);
      render(
        <ChatComposer
          onSendMessage={handleSendMessage}
          isSending={false}
          conversationType="direct"
          onTyping={vi.fn()}
        />
      );

      const sendBtn = screen.getByTitle(/Gửi tin nhắn/i);
      expect(sendBtn).toBeDisabled();
    });
  });

  describe("Màn 3: Popup Tạo Chat Nhóm (CreateGroupModal)", () => {
    it("yêu cầu tiêu đề nhóm và tối thiểu 2 thành viên", async () => {
      render(
        <CreateGroupModal
          isOpen={true}
          onClose={vi.fn()}
          onCreateSuccess={vi.fn()}
        />
      );

      expect(screen.getByText("Tạo cuộc trò chuyện nhóm")).toBeInTheDocument();

      // Kiểm tra nút Tạo nhóm bị disable khi chưa đủ điều kiện
      const submitBtn = screen.getByRole("button", { name: "Tạo nhóm" });
      expect(submitBtn).toBeDisabled();

      // Nhập tiêu đề
      const titleInput = screen.getByPlaceholderText("Ví dụ: Đội tái chế Quận 1...");
      fireEvent.change(titleInput, { target: { value: "Biệt Đội Xanh" } });

      // Chờ danh sách bạn bè load (có debounce 250ms)
      await waitFor(
        () => {
          expect(screen.getByText("Nguyễn Văn A")).toBeInTheDocument();
          expect(screen.getByText("Trần Thị B")).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      const friendRows = screen.getAllByRole("checkbox");
      fireEvent.click(friendRows[0]);
      fireEvent.click(friendRows[1]);

      // Đã chọn 2 bạn + tiêu đề hợp lệ -> Nút bấm được kích hoạt
      expect(submitBtn).not.toBeDisabled();
    });
  });

  describe("Màn 4: Popup Xóa Cuộc Trò Chuyện & Rời Nhóm (LeaveOrDeleteModal)", () => {
    it("hiển thị cảnh báo xóa hội thoại 1-1 chỉ ở phía bạn", () => {
      const mockConv: ChatConversation = {
        conversation_id: "conv-1",
        type: "direct",
        title: "Nguyễn Văn A",
        unread_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      render(
        <LeaveOrDeleteModal
          isOpen={true}
          mode="delete"
          conversation={mockConv}
          onClose={vi.fn()}
          onConfirmDelete={vi.fn()}
          onConfirmLeave={vi.fn()}
        />
      );

      expect(screen.getByRole("heading", { name: "Xóa cuộc trò chuyện" })).toBeInTheDocument();
      expect(
        screen.getByText(/Cuộc trò chuyện sẽ bị ẩn khỏi danh sách của bạn/i)
      ).toBeInTheDocument();
    });

    it("yêu cầu chuyển quyền quản trị viên khi admin duy nhất muốn rời nhóm", () => {
      const mockGroupConv: ChatConversation = {
        conversation_id: "conv-2",
        type: "group",
        title: "Nhóm Quản Trị",
        admin_user_id: "u-1",
        members: [
          {
            user_id: "u-1",
            full_name: "Người Dùng Thử Nghiệm",
            role: "admin",
          },
          {
            user_id: "u-2",
            full_name: "Nguyễn Văn A",
            role: "member",
          },
        ],
        unread_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      render(
        <LeaveOrDeleteModal
          isOpen={true}
          mode="leave"
          conversation={mockGroupConv}
          currentUserId="u-1"
          onClose={vi.fn()}
          onConfirmDelete={vi.fn()}
          onConfirmLeave={vi.fn()}
        />
      );

      expect(screen.getByRole("heading", { name: "Rời khỏi nhóm trò chuyện" })).toBeInTheDocument();
      expect(
        screen.getByText(/Bạn đang là Quản trị viên của nhóm/i)
      ).toBeInTheDocument();
    });
  });

  describe("Tích Hợp Toàn Bộ Màn Hình (ChatContainer)", () => {
    it("tải danh sách hội thoại ban đầu và render thành công", async () => {
      render(
        <ChatContainer
          currentUser={{
            user_id: "u-1",
            full_name: "Người Dùng Thử Nghiệm",
          }}
        />
      );

      await waitFor(
        () => {
          expect(screen.getByText("Đoạn chat")).toBeInTheDocument();
          expect(screen.getByText("Nguyễn Văn A")).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });
});
