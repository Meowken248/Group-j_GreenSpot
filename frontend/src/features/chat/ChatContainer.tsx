import React, { useState, useEffect, useCallback, useRef } from "react";
import type {
  ConversationType,
  ChatConversation,
  ChatMessage,
  ChatUserSummary,
  SocketConnectionState,
} from "./types/chat.types";
import { chatService } from "./services/chatService";
import { chatSocket } from "./services/chatSocket";
import { ConversationList } from "./components/ConversationList";
import { ChatView } from "./components/ChatView";
import { CreateGroupModal } from "./components/CreateGroupModal";
import { LeaveOrDeleteModal } from "./components/LeaveOrDeleteModal";
import { NewDirectChatModal } from "./components/NewDirectChatModal";
import { AUTH_STORAGE_KEYS } from "../auth/types/auth.types";
import "./styles/Chat.scss";

interface ChatContainerProps {
  initialTargetUserId?: string | null;
  initialConversationId?: string | null;
  onNavigateLogin?: () => void;
  currentUser?: any;
  onBackToHome?: () => void;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  initialTargetUserId,
  initialConversationId,
  onNavigateLogin,
  currentUser: propCurrentUser,
  onBackToHome,
}) => {
  // 1. Quản lý người dùng hiện tại
  const [localUser] = useState<any>(() => {
    try {
      const userStr = localStorage.getItem(AUTH_STORAGE_KEYS.USER_INFO);
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  });

  const currentUser = propCurrentUser || localUser;
  const currentUserId = String(currentUser?.user_id || currentUser?.id || "");
  const isLoggedIn = Boolean(
    currentUser && localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN)
  );

  // 2. State Màn 1: Danh sách hội thoại & Tab
  const [activeTab, setActiveTab] = useState<ConversationType>("direct");
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<ChatConversation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasMoreConversations, setHasMoreConversations] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMoreConversations, setIsLoadingMoreConversations] =
    useState(false);

  // 3. State Màn 2: Danh sách tin nhắn & Soạn tin
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [hasMoreOlderMessages, setHasMoreOlderMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // 4. State Chat Quận: Thành viên online
  const [districtMembers, setDistrictMembers] = useState<ChatUserSummary[]>([]);
  const [isLoadingDistrictMembers, setIsLoadingDistrictMembers] =
    useState(false);

  // 5. State Realtime WebSocket & Typing
  const [connectionState, setConnectionState] = useState<SocketConnectionState>(
    chatSocket.getState()
  );
  const [typingMap, setTypingMap] = useState<
    Record<string, { user_id: string; full_name: string }>
  >({});

  // 6. State Responsive Mobile View
  // Trên mobile: false = hiển thị danh sách, true = hiển thị khung chat
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);

  // Quản lý timeout 12s cho các tin nhắn optimistic đang gửi
  const pendingTimeoutMapRef = useRef<Map<string, any>>(new Map());

  // Dọn dẹp tất cả timers khi unmount
  useEffect(() => {
    return () => {
      pendingTimeoutMapRef.current.forEach((timer: any) => clearTimeout(timer));
      pendingTimeoutMapRef.current.clear();
    };
  }, []);

  // 7. State Modals
  const [isNewDirectChatOpen, setIsNewDirectChatOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    mode: "delete" | "leave";
    conversation: ChatConversation | null;
  }>({
    isOpen: false,
    mode: "delete",
    conversation: null,
  });

  // Tự động kiểm tra đăng nhập
  useEffect(() => {
    if (!isLoggedIn && onNavigateLogin) {
      onNavigateLogin();
    }
  }, [isLoggedIn, onNavigateLogin]);

  // Kết nối WebSocket khi component mount
  useEffect(() => {
    if (!isLoggedIn) return;

    chatSocket.connect();

    // Lắng nghe thay đổi trạng thái kết nối
    const unbindConn = chatSocket.on(
      "CONNECTION_CHANGE",
      (state: SocketConnectionState) => {
        setConnectionState(state);
      }
    );

    return () => {
      unbindConn();
    };
  }, [isLoggedIn]);

  // -------------------------------------------------------------
  // TẢI DANH SÁCH HỘI THOẠI (MÀN 1)
  // -------------------------------------------------------------
  const fetchConversations = useCallback(
    async (resetPage: boolean = true) => {
      try {
        if (resetPage) {
          setIsLoadingConversations(true);
        } else {
          setIsLoadingMoreConversations(true);
        }

        const targetPage = resetPage ? 1 : page + 1;
        const res = await chatService.getConversations(
          activeTab,
          targetPage,
          20,
          searchQuery
        );

        if (resetPage) {
          setConversations(() => {
            const serverItems = res.items || [];
            // Nếu có selectedConversation (ví dụ từ targetUserId hoặc mới tạo)
            // mà serverItems chưa chứa, giữ lại ở đầu danh sách
            if (
              selectedConversation &&
              !serverItems.some(
                (c) => c.conversation_id === selectedConversation.conversation_id
              )
            ) {
              return [selectedConversation, ...serverItems];
            }
            return serverItems;
          });
          setPage(1);
        } else {
          setConversations((prev) => [...prev, ...(res.items || [])]);
          setPage(targetPage);
        }

        setHasMoreConversations(res.has_more);
      } catch (err) {
        console.error("Lỗi tải danh sách hội thoại:", err);
      } finally {
        setIsLoadingConversations(false);
        setIsLoadingMoreConversations(false);
      }
    },
    [activeTab, page, searchQuery]
  );

  // Tải danh sách khi đổi Tab hoặc tìm kiếm
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchConversations(true);
    }, 250);
    return () => clearTimeout(timer);
  }, [activeTab, searchQuery]);

  // Tải thêm trang tiếp theo khi cuộn xuống đáy
  const handleLoadMoreConversations = () => {
    if (!isLoadingMoreConversations && hasMoreConversations) {
      fetchConversations(false);
    }
  };

  // -------------------------------------------------------------
  // CHỌN HỘI THOẠI & TẢI 30 TIN NHẮN (MÀN 2)
  // -------------------------------------------------------------
  const handleSelectConversation = useCallback(
    async (conv: ChatConversation) => {
      setSelectedConversation(conv);
      setIsMobileChatOpen(true);
      setMessages([]);
      setHasMoreOlderMessages(false);

      // Cập nhật URL Hash và SessionStorage để F5 tự động mở lại đúng người đang chat
      try {
        sessionStorage.setItem("greenspot_active_chat_conv_id", conv.conversation_id);
        const currentHash = window.location.hash;
        const newHash = `#messages?conv=${conv.conversation_id}`;
        if (currentHash !== newHash) {
          window.history.replaceState(null, "", newHash);
        }
      } catch {
        // ignore
      }

      // Đánh dấu đã đọc trong danh sách
      setConversations((prev) =>
        prev.map((c) =>
          c.conversation_id === conv.conversation_id
            ? { ...c, unread_count: 0 }
            : c
        )
      );

      // Gửi báo đã xem tin nhắn
      chatService.markAsSeen(conv.conversation_id).catch(() => {});
      chatSocket.sendSeen(conv.conversation_id, "");

      // Tải 30 tin nhắn mới nhất
      try {
        setIsLoadingMessages(true);
        const res = await chatService.getMessages(conv.conversation_id, undefined, 30);
        setMessages(res.items || []);
        setHasMoreOlderMessages(res.has_more);
      } catch (err) {
        console.error("Lỗi tải tin nhắn:", err);
      } finally {
        setIsLoadingMessages(false);
      }

      // Nếu là Chat Quận, tải danh sách thành viên trực tuyến
      if (conv.type === "district") {
        try {
          setIsLoadingDistrictMembers(true);
          const members = await chatService.getDistrictMembers(conv.conversation_id);
          setDistrictMembers(members || []);
        } catch {
          setDistrictMembers([]);
        } finally {
          setIsLoadingDistrictMembers(false);
        }
      } else {
        setDistrictMembers([]);
      }
    },
    []
  );

  // Khởi tạo đoạn chat 1-1 từ chọn bạn bè trong Modal
  const handleStartDirectChat = async (targetUserId: string) => {
    try {
      setIsNewDirectChatOpen(false);
      setActiveTab("direct");
      const directConv = await chatService.createDirectConversation(targetUserId);
      setConversations((prev) => {
        const filtered = prev.filter(
          (c) => c.conversation_id !== directConv.conversation_id
        );
        return [directConv, ...filtered];
      });
      handleSelectConversation(directConv);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Không thể khởi tạo cuộc trò chuyện với người này");
    }
  };

  // Xử lý mở thẳng chat 1-1 nếu có initialTargetUserId
  useEffect(() => {
    if (!initialTargetUserId || !isLoggedIn) return;

    let isMounted = true;
    (async () => {
      try {
        const directConv = await chatService.createDirectConversation(
          initialTargetUserId
        );
        if (isMounted) {
          setActiveTab("direct");
          setConversations((prev) => {
            const filtered = prev.filter(
              (c) => c.conversation_id !== directConv.conversation_id
            );
            return [directConv, ...filtered];
          });
          handleSelectConversation(directConv);
        }
      } catch (err) {
        console.error("Lỗi khởi tạo chat 1-1 từ liên kết:", err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [initialTargetUserId, isLoggedIn, handleSelectConversation]);

  // Xử lý mở lại cuộc trò chuyện từ URL Deep-link (#messages?conv={id}) hoặc sessionStorage khi F5
  useEffect(() => {
    if (!isLoggedIn) return;
    if (selectedConversation) return;

    let targetConvId = initialConversationId;
    if (!targetConvId) {
      try {
        targetConvId = sessionStorage.getItem("greenspot_active_chat_conv_id");
      } catch {
        targetConvId = null;
      }
    }

    if (targetConvId) {
      // Tìm trong danh sách hội thoại đã tải trước
      const existing = conversations.find((c) => c.conversation_id === targetConvId);
      if (existing) {
        if (existing.type && (existing.type === "direct" || existing.type === "group" || existing.type === "district")) {
          setActiveTab(existing.type);
        }
        handleSelectConversation(existing);
      } else if (!isLoadingConversations) {
        // Tải chi tiết từ API nếu chưa có trong trang đầu
        chatService
          .getConversationDetail(targetConvId)
          .then((conv) => {
            if (conv) {
              if (conv.type && (conv.type === "direct" || conv.type === "group" || conv.type === "district")) {
                setActiveTab(conv.type);
              }
              setConversations((prev) => {
                if (prev.some((c) => c.conversation_id === conv.conversation_id)) return prev;
                return [conv, ...prev];
              });
              handleSelectConversation(conv);
            }
          })
          .catch(() => {
            try {
              sessionStorage.removeItem("greenspot_active_chat_conv_id");
            } catch {}
            // Xóa param ?conv=... khỏi URL hash để tránh useEffect lặp tải vô tận khi re-render
            try {
              if (window.location.hash.includes("conv=")) {
                window.history.replaceState(null, "", "#messages");
              }
            } catch {}
          });
      }
    } else if (
      window.innerWidth >= 768 &&
      !initialTargetUserId &&
      conversations.length > 0 &&
      !selectedConversation &&
      !isLoadingConversations
    ) {
      // Chuẩn Messenger/Slack Desktop: Tự động mở cuộc trò chuyện đầu tiên nếu chưa chọn ai
      handleSelectConversation(conversations[0]);
    }
  }, [
    initialConversationId,
    initialTargetUserId,
    isLoggedIn,
    conversations,
    selectedConversation,
    isLoadingConversations,
    handleSelectConversation,
  ]);

  // Cuộn ngược tải 30 tin cũ hơn
  const handleLoadOlderMessages = async () => {
    if (
      !selectedConversation ||
      isLoadingOlderMessages ||
      !hasMoreOlderMessages ||
      messages.length === 0
    ) {
      return;
    }

    const oldestMessageId = messages[0].message_id;
    try {
      setIsLoadingOlderMessages(true);
      const res = await chatService.getMessages(
        selectedConversation.conversation_id,
        oldestMessageId,
        30
      );
      setMessages((prev) => [...(res.items || []), ...prev]);
      setHasMoreOlderMessages(res.has_more);
    } catch (err) {
      console.error("Lỗi tải tin nhắn cũ:", err);
    } finally {
      setIsLoadingOlderMessages(false);
    }
  };

  // -------------------------------------------------------------
  // GỬI TIN NHẮN (MÀN 2 COMPOSER)
  // -------------------------------------------------------------
  const handleSendMessage = async (
    content: string,
    imageFile?: File
  ): Promise<boolean> => {
    if (!selectedConversation) return false;

    const convId = selectedConversation.conversation_id;
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. Tải ảnh lên nếu có
    let mediaUrl: string | undefined = undefined;
    if (imageFile) {
      try {
        setIsSendingMessage(true);
        const uploaded = await chatService.uploadChatImage(imageFile);
        mediaUrl = uploaded.url;
      } catch (err: any) {
        alert(err.message || "Tải ảnh thất bại");
        setIsSendingMessage(false);
        return false;
      }
    }

    // 2. Tạo tin nhắn tạm thời (Optimistic UI)
    const optimisticMessage: ChatMessage = {
      message_id: tempId,
      temp_id: tempId,
      conversation_id: convId,
      sender_id: currentUserId,
      sender: {
        user_id: currentUserId,
        full_name: currentUser?.full_name || "Tôi",
        avatar_url: currentUser?.avatar_url,
      },
      content,
      media_url: mediaUrl,
      media_type: mediaUrl ? "image" : "text",
      created_at: new Date().toISOString(),
      status: "sending",
      is_mine: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    // 3. Cập nhật preview trong danh sách hội thoại & đưa lên đầu
    setConversations((prev) => {
      const exists = prev.some((c) => c.conversation_id === convId);
      if (exists) {
        const updatedList = prev.map((c) =>
          c.conversation_id === convId
            ? { ...c, last_message: optimisticMessage, updated_at: optimisticMessage.created_at }
            : c
        );
        const targetConv = updatedList.find((c) => c.conversation_id === convId);
        const others = updatedList.filter((c) => c.conversation_id !== convId);
        return targetConv ? [targetConv, ...others] : updatedList;
      }
      if (selectedConversation) {
        const newConvItem: ChatConversation = {
          ...selectedConversation,
          last_message: optimisticMessage,
          updated_at: optimisticMessage.created_at,
        };
        return [newConvItem, ...prev];
      }
      return prev;
    });

    // 4. Gửi qua WebSocket (ưu tiên) hoặc HTTP fallback
    try {
      setIsSendingMessage(true);
      const isSentWs = chatSocket.sendMessage({
        conversation_id: convId,
        content,
        media_url: mediaUrl,
        temp_id: tempId,
      });

      if (isSentWs) {
        // Thiết lập timeout 12 giây: nếu sau 12 giây không nhận được ack từ server thì chuyển sang error
        const timer = setTimeout(() => {
          setMessages((prev) =>
            prev.map((m) =>
              m.temp_id === tempId && m.status === "sending"
                ? { ...m, status: "error" }
                : m
            )
          );
          pendingTimeoutMapRef.current.delete(tempId);
        }, 12000);
        pendingTimeoutMapRef.current.set(tempId, timer);
      } else {
        // Fallback HTTP
        const savedMsg = await chatService.sendMessageHttp({
          conversation_id: convId,
          content,
          media_url: mediaUrl,
          temp_id: tempId,
        });

        // Thay thế tin nhắn tạm thời bằng tin nhắn thật từ server
        setMessages((prev) =>
          prev.map((m) =>
            m.temp_id === tempId || (m.status === "sending" && m.content === content)
              ? { ...savedMsg, status: "sent", is_mine: true }
              : m
          )
        );
      }
      return true;
    } catch {
      // Đánh dấu lỗi gửi
      setMessages((prev) =>
        prev.map((m) =>
          m.temp_id === tempId ? { ...m, status: "error" } : m
        )
      );
      return false;
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Gửi lại tin nhắn lỗi
  const handleRetryMessage = async (failedMsg: ChatMessage) => {
    if (!selectedConversation) return;

    setMessages((prev) =>
      prev.map((m) =>
        m.message_id === failedMsg.message_id ? { ...m, status: "sending" } : m
      )
    );

    try {
      const retryTempId = failedMsg.temp_id || failedMsg.message_id;
      const isSent = chatSocket.sendMessage({
        conversation_id: selectedConversation.conversation_id,
        content: failedMsg.content,
        media_url: failedMsg.media_url,
        temp_id: retryTempId,
      });

      if (isSent) {
        const timer = setTimeout(() => {
          setMessages((prev) =>
            prev.map((m) =>
              (m.temp_id === retryTempId || m.message_id === retryTempId) && m.status === "sending"
                ? { ...m, status: "error" }
                : m
            )
          );
          pendingTimeoutMapRef.current.delete(retryTempId);
        }, 12000);
        pendingTimeoutMapRef.current.set(retryTempId, timer);
      } else {
        await chatService.sendMessageHttp({
          conversation_id: selectedConversation.conversation_id,
          content: failedMsg.content,
          media_url: failedMsg.media_url,
        });

        setMessages((prev) =>
          prev.map((m) =>
            m.message_id === failedMsg.message_id
              ? { ...m, status: "sent" }
              : m
          )
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.message_id === failedMsg.message_id ? { ...m, status: "error" } : m
        )
      );
    }
  };

  // Gửi trạng thái đang soạn tin (Typing)
  const handleTyping = (isTyping: boolean) => {
    if (selectedConversation) {
      chatSocket.sendTyping(selectedConversation.conversation_id, isTyping);
    }
  };

  // -------------------------------------------------------------
  // LẮNG NGHE SỰ KIỆN TỪ WEBSOCKET (REALTIME ENGINE)
  // -------------------------------------------------------------
  useEffect(() => {
    // 1. Nhận tin nhắn mới (NEW_MESSAGE)
    const unbindMsg = chatSocket.on("NEW_MESSAGE", (newMsg: ChatMessage) => {
      // Hủy timer timeout nếu tin nhắn gửi đi đã được broadcast xác nhận
      if (newMsg.temp_id) {
        const timer = pendingTimeoutMapRef.current.get(newMsg.temp_id);
        if (timer) {
          clearTimeout(timer);
          pendingTimeoutMapRef.current.delete(newMsg.temp_id);
        }
      }

      // Nếu tin nhắn thuộc cuộc trò chuyện đang mở
      if (selectedConversation?.conversation_id === newMsg.conversation_id) {
        setMessages((prev) => {
          // 1. Tránh trùng lặp nếu tin nhắn này đã tồn tại trong danh sách (qua ID thực)
          if (prev.some((m) => m.message_id === newMsg.message_id)) {
            return prev;
          }

          // 2. Nếu có tin nhắn tạm (temp_id), thay thế nó bằng tin nhắn xác nhận từ server
          if (newMsg.temp_id && prev.some((m) => m.temp_id === newMsg.temp_id)) {
            return prev.map((m) =>
              m.temp_id === newMsg.temp_id ? { ...newMsg, status: "sent", is_mine: true } : m
            );
          }

          // 3. Nếu là tin nhắn của chính mình và có tin nhắn tạm đang sending
          if (newMsg.sender_id === currentUserId) {
            const pendingIdx = prev.findIndex(
              (m) =>
                (m.status === "sending" || m.message_id.startsWith("temp_")) &&
                m.content === newMsg.content
            );
            if (pendingIdx !== -1) {
              const next = [...prev];
              next[pendingIdx] = { ...newMsg, status: "sent", is_mine: true };
              return next;
            }
          }

          return [...prev, { ...newMsg, is_mine: newMsg.sender_id === currentUserId }];
        });

        // Tự động đánh dấu đã xem nếu người gửi không phải là tôi
        if (newMsg.sender_id !== currentUserId) {
          chatSocket.sendSeen(newMsg.conversation_id, newMsg.message_id);
          chatService.markAsSeen(newMsg.conversation_id, newMsg.message_id).catch(() => {});
        }
      }

      // Cập nhật tin nhắn cuối cùng và đẩy hội thoại lên đầu danh sách
      setConversations((prev) => {
        const found = prev.find((c) => c.conversation_id === newMsg.conversation_id);
        const isCurrentOpen = selectedConversation?.conversation_id === newMsg.conversation_id;
        const isFromMe = newMsg.sender_id === currentUserId;

        if (found) {
          const updated: ChatConversation = {
            ...found,
            last_message: newMsg,
            updated_at: newMsg.created_at,
            unread_count: isCurrentOpen || isFromMe ? found.unread_count : (found.unread_count || 0) + 1,
          };
          return [updated, ...prev.filter((c) => c.conversation_id !== newMsg.conversation_id)];
        } else if (selectedConversation && selectedConversation.conversation_id === newMsg.conversation_id) {
          const newConvItem: ChatConversation = {
            ...selectedConversation,
            last_message: newMsg,
            updated_at: newMsg.created_at,
            unread_count: 0,
          };
          return [newConvItem, ...prev];
        } else {
          // Lấy thông tin chi tiết cuộc trò chuyện thực tế từ server để hiển thị đúng loại (direct/group/district)
          chatService
            .getConversationDetail(newMsg.conversation_id)
            .then((convDetail: ChatConversation) => {
              setConversations((current) => {
                const found = current.some((c) => c.conversation_id === convDetail.conversation_id);
                const updatedDetail = {
                  ...convDetail,
                  last_message: newMsg,
                  unread_count: Math.max(convDetail.unread_count || 1, 1),
                };
                if (found) {
                  return current.map((c) =>
                    c.conversation_id === convDetail.conversation_id ? updatedDetail : c
                  );
                }
                return [updatedDetail, ...current];
              });
            })
            .catch(() => {});

          return prev;
        }
      });
    });

    // 2. Nhận xác nhận tin đã gửi từ WebSocket (MESSAGE_SENT)
    const unbindSent = chatSocket.on("MESSAGE_SENT", (data: any) => {
      if (!data) return;
      const ackTempId = data.temp_id;
      if (ackTempId) {
        const timer = pendingTimeoutMapRef.current.get(ackTempId);
        if (timer) {
          clearTimeout(timer);
          pendingTimeoutMapRef.current.delete(ackTempId);
        }
        if (data.message) {
          setMessages((prev) =>
            prev.map((m) =>
              m.temp_id === ackTempId ? { ...data.message, status: "sent", is_mine: true } : m
            )
          );
        }
      }
    });

    // 3. Nhận phản hồi báo lỗi từ WebSocket (ERROR)
    const unbindError = chatSocket.on("ERROR", (data: any) => {
      if (!data) return;
      const failedTempId = data.temp_id;
      if (failedTempId) {
        const timer = pendingTimeoutMapRef.current.get(failedTempId);
        if (timer) {
          clearTimeout(timer);
          pendingTimeoutMapRef.current.delete(failedTempId);
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.temp_id === failedTempId ? { ...m, status: "error" } : m
          )
        );
      }
      if (data.message) {
        console.warn("[ChatSocket ERROR]:", data.message);
      }
    });

    // 4. Nhận trạng thái soạn tin (TYPING_STATUS)
    const unbindTyping = chatSocket.on("TYPING_STATUS", (data: any) => {
      if (data && data.user_id !== currentUserId) {
        if (data.is_typing) {
          setTypingMap((prev) => ({
            ...prev,
            [data.conversation_id]: {
              user_id: data.user_id,
              full_name: data.full_name,
            },
          }));
        } else {
          setTypingMap((prev) => {
            const next = { ...prev };
            delete next[data.conversation_id];
            return next;
          });
        }
      }
    });

    // 3. Nhận trạng thái đã xem (MESSAGE_SEEN)
    const unbindSeen = chatSocket.on("MESSAGE_SEEN", (data: any) => {
      if (selectedConversation?.conversation_id === data.conversation_id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.sender_id === currentUserId ? { ...m, status: "seen" } : m
          )
        );
      }
    });

    // 4. Nhận trạng thái Online (USER_ONLINE_STATUS)
    const unbindOnline = chatSocket.on("USER_ONLINE_STATUS", (data: any) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.type === "direct") {
            const hasUser = c.members?.some((m) => m.user_id === data.user_id);
            if (hasUser) {
              return {
                ...c,
                is_online: data.is_online,
                members: c.members.map((m) =>
                  m.user_id === data.user_id ? { ...m, is_online: data.is_online } : m
                ),
              };
            }
          }
          return c;
        })
      );
    });

    // 5. Nhận cập nhật cuộc trò chuyện từ WebSocket (CONVERSATION_UPDATE)
    const unbindConvUpdate = chatSocket.on("CONVERSATION_UPDATE", (data: any) => {
      if (!data || !data.conversation_id) return;
      const convId = String(data.conversation_id);
      setConversations((prev) => {
        const found = prev.find((c) => c.conversation_id === convId);
        if (found) {
          const updated: ChatConversation = {
            ...found,
            last_message: data.last_message
              ? {
                  message_id: String(data.last_message.message_id),
                  conversation_id: convId,
                  sender_id: String(data.last_message.sender_id),
                  sender: {
                    user_id: String(data.last_message.sender_id),
                    full_name: data.last_message.sender_name || "",
                  },
                  content: data.last_message.content || "",
                  media_url: data.last_message.media_url || null,
                  created_at: data.last_message.created_at || data.last_message_at,
                }
              : found.last_message,
            updated_at: data.last_message_at || found.updated_at,
          };
          return [updated, ...prev.filter((c) => c.conversation_id !== convId)];
        }
        return prev;
      });
    });

    return () => {
      unbindMsg();
      unbindSent();
      unbindError();
      unbindConvUpdate();
      unbindTyping();
      unbindSeen();
      unbindOnline();
    };
  }, [selectedConversation, currentUserId]);

  // -------------------------------------------------------------
  // XÓA HỘI THOẠI & RỜI NHÓM (MÀN 4)
  // -------------------------------------------------------------
  const handleConfirmDelete = async (conv: ChatConversation) => {
    await chatService.deleteConversation(conv.conversation_id);
    setConversations((prev) =>
      prev.filter((c) => c.conversation_id !== conv.conversation_id)
    );
    if (selectedConversation?.conversation_id === conv.conversation_id) {
      setSelectedConversation(null);
      setIsMobileChatOpen(false);
    }
  };

  const handleConfirmLeave = async (
    conv: ChatConversation,
    newAdminUserId?: string
  ) => {
    if (newAdminUserId) {
      await chatService.transferAdminAndLeave(conv.conversation_id, newAdminUserId);
    } else {
      await chatService.leaveGroup(conv.conversation_id);
    }
    setConversations((prev) =>
      prev.filter((c) => c.conversation_id !== conv.conversation_id)
    );
    if (selectedConversation?.conversation_id === conv.conversation_id) {
      setSelectedConversation(null);
      setIsMobileChatOpen(false);
    }
  };

  // Tính tổng số tin chưa đọc theo từng tab
  const unreadCountsByTab = conversations.reduce(
    (acc, c) => {
      if (c.unread_count > 0) {
        acc[c.type] = (acc[c.type] || 0) + c.unread_count;
      }
      return acc;
    },
    { direct: 0, group: 0, district: 0 } as Record<ConversationType, number>
  );

  return (
    <div className="greenspot-chat-page">
      {/* CỘT TRÁI (MÀN 1): Danh sách đoạn chat */}
      <ConversationList
        className={isMobileChatOpen ? "mobile-hidden" : ""}
        onBackToHome={onBackToHome}
        conversations={conversations}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSearchQuery("");
        }}
        selectedConversationId={selectedConversation?.conversation_id}
        onSelectConversation={handleSelectConversation}
        onOpenNewChat={() => setIsNewDirectChatOpen(true)}
        onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
        onDeleteConversation={(conv) =>
          setConfirmModal({ isOpen: true, mode: "delete", conversation: conv })
        }
        onLeaveGroup={(conv) =>
          setConfirmModal({ isOpen: true, mode: "leave", conversation: conv })
        }
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isLoading={isLoadingConversations}
        isLoadingMore={isLoadingMoreConversations}
        hasMore={hasMoreConversations}
        onLoadMore={handleLoadMoreConversations}
        connectionState={connectionState}
        onReconnectSocket={() => chatSocket.connect()}
        currentUserId={currentUserId}
        unreadCountsByTab={unreadCountsByTab}
      />

      {/* CỘT PHẢI (MÀN 2): Chi tiết cuộc trò chuyện */}
      <ChatView
        className={!isMobileChatOpen ? "mobile-hidden" : ""}
        conversation={selectedConversation}
        currentUserId={currentUserId}
        messages={messages}
        isLoadingMessages={isLoadingMessages}
        isLoadingOlder={isLoadingOlderMessages}
        hasMoreOlder={hasMoreOlderMessages}
        onLoadOlder={handleLoadOlderMessages}
        onSendMessage={handleSendMessage}
        isSendingMessage={isSendingMessage}
        onRetryMessage={handleRetryMessage}
        onBackMobile={() => setIsMobileChatOpen(false)}
        isTyping={
          selectedConversation
            ? Boolean(typingMap[selectedConversation.conversation_id])
            : false
        }
        typingUserName={
          selectedConversation
            ? typingMap[selectedConversation.conversation_id]?.full_name
            : undefined
        }
        onTyping={handleTyping}
        districtMembers={districtMembers}
        isLoadingDistrictMembers={isLoadingDistrictMembers}
      />

      {/* Popup Tin nhắn mới 1-1 */}
      <NewDirectChatModal
        isOpen={isNewDirectChatOpen}
        onClose={() => setIsNewDirectChatOpen(false)}
        onSelectFriend={handleStartDirectChat}
      />

      {/* MÀN 3: Popup Tạo nhóm */}
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onCreateSuccess={(newConv) => {
          setActiveTab("group");
          setConversations((prev) => [newConv, ...prev]);
          handleSelectConversation(newConv);
        }}
      />

      {/* MÀN 4: Popup Rời nhóm / Xóa trò chuyện */}
      <LeaveOrDeleteModal
        isOpen={confirmModal.isOpen}
        mode={confirmModal.mode}
        conversation={confirmModal.conversation}
        currentUserId={currentUserId}
        onClose={() =>
          setConfirmModal({ isOpen: false, mode: "delete", conversation: null })
        }
        onConfirmDelete={handleConfirmDelete}
        onConfirmLeave={handleConfirmLeave}
      />
    </div>
  );
};
