/**
 * WebSocket Engine Client cho Chức năng 15: Nhắn tin thời gian thực
 */

import { AUTH_STORAGE_KEYS } from "../../auth/types/auth.types";
import type {
  WebSocketEventType,
  SocketConnectionState,
  SendMessagePayload,
} from "../types/chat.types";
import { mapMessageItem } from "./chatService";

type EventHandler<T = any> = (data: T) => void;

class ChatSocketManager {
  private socket: WebSocket | null = null;
  private state: SocketConnectionState = "disconnected";
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: any = null;
  private pingTimer: any = null;
  private isIntentionallyClosed = false;

  // Lưu trữ các callbacks theo event type
  private listeners: Map<string, Set<EventHandler>> = new Map();

  constructor() {
    this.listeners.set("NEW_MESSAGE", new Set());
    this.listeners.set("CONVERSATION_UPDATE", new Set());
    this.listeners.set("MESSAGE_SENT", new Set());
    this.listeners.set("TYPING_STATUS", new Set());
    this.listeners.set("USER_ONLINE_STATUS", new Set());
    this.listeners.set("MESSAGE_SEEN", new Set());
    this.listeners.set("ERROR", new Set());
    this.listeners.set("CONNECTION_CHANGE", new Set());

    // Đăng ký bộ lắng nghe sự kiện Tab & Mạng để đánh thức kết nối tức thì (0ms)
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
      window.addEventListener("focus", this.handleWindowFocus);
      window.addEventListener("online", this.handleNetworkOnline);
    }
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      this.reconnectIfStale("visibilitychange");
    }
  };

  private handleWindowFocus = () => {
    this.reconnectIfStale("window_focus");
  };

  private handleNetworkOnline = () => {
    this.reconnectIfStale("network_online");
  };

  /**
   * Đánh thức kết nối tức thì (0ms delay) khi tab active trở lại
   */
  public reconnectIfStale(_reason: string = "wake_up") {
    if (this.isIntentionallyClosed) return;

    const token = localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) return;

    if (
      !this.socket ||
      this.socket.readyState === WebSocket.CLOSED ||
      this.socket.readyState === WebSocket.CLOSING
    ) {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      this.reconnectAttempts = 0;
      this.connect();
    } else if (this.socket.readyState === WebSocket.OPEN) {
      // Gửi Ping ngay lập tức để kiểm tra kết nối có bị dead ngầm không
      try {
        this.socket.send(JSON.stringify({ action: "PING" }));
      } catch {
        this.socket.close();
        this.connect();
      }
    }
  }

  /**
   * Tính toán WebSocket URL dựa trên cấu hình môi trường
   */
  private getWsUrl(): string | null {
    const token = localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) return null;

    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
    const wsProtocol = apiUrl.startsWith("https") ? "wss" : "ws";
    const host = apiUrl.replace(/^https?:\/\//, "");

    return `${wsProtocol}://${host}/api/v1/chat/ws?token=${encodeURIComponent(token)}`;
  }

  /**
   * Lấy trạng thái kết nối hiện tại
   */
  public getState(): SocketConnectionState {
    return this.state;
  }

  /**
   * Cập nhật và phát sự kiện thay đổi trạng thái
   */
  private setState(newState: SocketConnectionState) {
    if (this.state !== newState) {
      this.state = newState;
      this.emit("CONNECTION_CHANGE", newState);
    }
  }

  /**
   * Bắt đầu kết nối WebSocket
   */
  public connect() {
    this.isIntentionallyClosed = false;

    // Nếu đã kết nối hoặc đang kết nối thì không tạo mới
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const wsUrl = this.getWsUrl();
    if (!wsUrl) {
      this.setState("disconnected");
      return;
    }

    this.setState("connecting");

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.setState("connected");
        this.reconnectAttempts = 0;
        this.startHeartbeat();
      };

      this.socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const eventName = payload.event || payload.type;

          if (!eventName) return;

          switch (eventName) {
            case "CONNECTED":
              break;

            case "PONG":
              break;

            case "NEW_MESSAGE": {
              const rawMsg = payload.message || payload.data;
              if (rawMsg) {
                const mappedMsg = mapMessageItem(rawMsg);
                this.emit("NEW_MESSAGE", mappedMsg);
              }
              break;
            }

            case "MESSAGE_SENT": {
              const rawMsg = payload.message || payload.data;
              if (rawMsg) {
                if (payload.temp_id && !rawMsg.temp_id) {
                  rawMsg.temp_id = payload.temp_id;
                }
                const mappedMsg = mapMessageItem(rawMsg);
                this.emit("MESSAGE_SENT", mappedMsg);
                this.emit("NEW_MESSAGE", mappedMsg);
              }
              break;
            }

            case "USER_TYPING":
            case "TYPING_STATUS": {
              this.emit("TYPING_STATUS", {
                conversation_id: payload.conversation_id || payload.data?.conversation_id,
                user_id: payload.user_id || payload.data?.user_id,
                full_name: payload.full_name || payload.data?.full_name,
                is_typing: Boolean(
                  payload.is_typing ?? payload.data?.is_typing ?? true
                ),
              });
              break;
            }

            case "MESSAGE_SEEN": {
              this.emit("MESSAGE_SEEN", {
                conversation_id: payload.conversation_id || payload.data?.conversation_id,
                user_id: payload.user_id || payload.data?.user_id,
              });
              break;
            }

            case "USER_ONLINE_STATUS": {
              this.emit("USER_ONLINE_STATUS", payload.data || payload);
              break;
            }

            case "CONVERSATION_UPDATE": {
              this.emit("CONVERSATION_UPDATE", payload.data || payload);
              break;
            }

            case "ERROR": {
              this.emit("ERROR", payload);
              break;
            }

            default:
              this.emit(eventName, payload.data || payload);
              break;
          }
        } catch (err) {
          console.warn("[ChatSocket] Lỗi parse JSON sự kiện:", err);
        }
      };

      this.socket.onerror = (err) => {
        console.warn("[ChatSocket] Lỗi WebSocket:", err);
        this.setState("error");
      };

      this.socket.onclose = () => {
        this.stopHeartbeat();
        this.socket = null;

        if (!this.isIntentionallyClosed) {
          this.setState("disconnected");
          this.scheduleReconnect();
        } else {
          this.setState("disconnected");
        }
      };
    } catch (err) {
      console.warn("[ChatSocket] Không thể khởi tạo kết nối:", err);
      this.setState("error");
      this.scheduleReconnect();
    }
  }

  /**
   * Lập lịch tự động kết nối lại với thuật toán Exponential Backoff
   */
  private scheduleReconnect() {
    if (this.reconnectTimer || this.isIntentionallyClosed) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn("[ChatSocket] Đã thử kết nối lại tối đa. Dừng tự động kết nối.");
      return;
    }

    // Thời gian chờ: 1s, 2s, 4s, 8s, tối đa 10s
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  /**
   * Đóng kết nối có chủ đích (khi đăng xuất hoặc component unmount hoàn toàn)
   */
  public disconnect() {
    this.isIntentionallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.setState("disconnected");
  }

  /**
   * Ping định kỳ giữ kết nối (25s một lần để chống reverse proxy timeout)
   */
  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingTimer = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        try {
          this.socket.send(JSON.stringify({ action: "PING" }));
        } catch {
          this.reconnectIfStale("ping_error");
        }
      }
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  /**
   * Gửi tin nhắn mới qua WebSocket
   */
  public sendMessage(payload: SendMessagePayload): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    this.socket.send(
      JSON.stringify({
        action: "SEND_MESSAGE",
        conversation_id: payload.conversation_id,
        content: payload.content,
        media_url: payload.media_url || null,
        temp_id: payload.temp_id,
      })
    );
    return true;
  }

  /**
   * Gửi trạng thái đang soạn tin (Typing indicator)
   */
  public sendTyping(conversationId: string, isTyping: boolean): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    this.socket.send(
      JSON.stringify({
        action: "TYPING",
        conversation_id: conversationId,
        is_typing: isTyping,
      })
    );
    return true;
  }

  /**
   * Gửi trạng thái đã xem tin nhắn
   */
  public sendSeen(conversationId: string, _messageId?: string): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    this.socket.send(
      JSON.stringify({
        action: "MARK_READ",
        conversation_id: conversationId,
      })
    );
    return true;
  }

  /**
   * Đăng ký lắng nghe sự kiện
   */
  public on(event: WebSocketEventType | "CONNECTION_CHANGE" | "MESSAGE_SENT", handler: EventHandler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    // Trả về hàm huỷ đăng ký
    return () => {
      this.off(event, handler);
    };
  }

  /**
   * Huỷ lắng nghe sự kiện
   */
  public off(event: WebSocketEventType | "CONNECTION_CHANGE" | "MESSAGE_SENT", handler: EventHandler) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Phát sự kiện tới tất cả các subscribers
   */
  private emit(event: string, data: any) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (err) {
          console.error(`[ChatSocket] Lỗi trong handler của sự kiện ${event}:`, err);
        }
      });
    }
  }
}

// Xuất singleton instance để dùng chung trong toàn bộ ứng dụng
export const chatSocket = new ChatSocketManager();

/**
 * Phát âm thanh chuông nhẹ báo tin nhắn mới chuẩn Web Audio API (không tải tệp ngoài)
 */
export function playChatNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    // Hợp âm Re 587Hz -> La 880Hz
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Autoplay restrictions or headless env
  }
}

