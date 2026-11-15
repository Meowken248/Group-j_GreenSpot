import React, { useState, useRef, useEffect, useCallback } from "react";

interface ChatComposerProps {
  onSendMessage: (content: string, imageFile?: File) => Promise<boolean>;
  isSending: boolean;
  isDistrict: boolean;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  onSendMessage,
  isSending,
  isDistrict,
  onTyping,
  disabled = false,
}) => {
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<any>(null);

  const MAX_CHARS = 1000;

  // Xử lý bộ đếm lùi Cooldown chống spam (dành cho Chat Quận)
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Giải phóng Blob preview URL khi đổi ảnh
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Tự động co giãn chiều cao của Textarea
  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  // Xử lý khi người dùng nhập nội dung
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= MAX_CHARS) {
      setContent(val);
      adjustTextareaHeight();
      setErrorMessage(null);

      // Gửi sự kiện typing (bật)
      onTyping(true);

      // Tắt typing sau 2 giây nếu không gõ thêm
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      typingTimerRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    }
  };

  // Chọn ảnh đính kèm
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Kiểm tra định dạng (JPG, PNG)
    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setErrorMessage("Chỉ hỗ trợ tệp ảnh định dạng JPG hoặc PNG");
      return;
    }

    // Kiểm tra dung lượng <= 5MB
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Dung lượng hình ảnh không được vượt quá 5MB");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setErrorMessage(null);

    // Reset input
    e.target.value = "";
  };

  // Khóa ngăn chặn bấm đúp chuột tức thì
  const isSubmittingRef = useRef(false);

  // Hủy ảnh đính kèm
  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Thực hiện gửi tin nhắn (Chuẩn Doanh nghiệp: Optimistic clearing <1ms, gõ liên tục, phục hồi tệp khi lỗi)
  const handleSubmit = async () => {
    const textToSend = content.trim();
    if ((!textToSend && !selectedFile) || isSubmittingRef.current || cooldown > 0 || disabled) {
      return;
    }
    // Nếu đang có tiến trình upload file khác thì chặn gửi thêm file đính kèm cùng lúc
    if (selectedFile && isSending) {
      return;
    }

    isSubmittingRef.current = true;

    // Tắt typing ngay khi bấm gửi
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    onTyping(false);

    // Lưu lại dữ liệu dự phòng để phục hồi nếu gặp sự cố mạng
    const fileToSend = selectedFile;
    const currentPreviewUrl = previewUrl;

    // Chuẩn doanh nghiệp: Xóa sạch input ngay lập tức và giữ focus để người dùng có thể gõ tiếp tin nhắn tiếp theo
    setContent("");
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }

    // Kích hoạt cooldown 3 giây nếu là Chat Quận
    if (isDistrict) {
      setCooldown(3);
    }

    // Cho phép người dùng gõ và gửi tin nhắn tiếp theo ngay sau khi input được dọn sạch
    isSubmittingRef.current = false;

    const success = await onSendMessage(textToSend, fileToSend || undefined);
    if (!success) {
      // Nếu có lỗi mạng hoặc lỗi upload, phục hồi đầy đủ cả text và tệp ảnh đính kèm
      setContent(textToSend);
      if (fileToSend) {
        setSelectedFile(fileToSend);
        setPreviewUrl(currentPreviewUrl || URL.createObjectURL(fileToSend));
      }
      if (isDistrict) {
        setCooldown(0);
      }
    } else {
      // Gửi thành công hoàn toàn thì mới giải phóng bộ nhớ blob URL
      if (currentPreviewUrl) {
        URL.revokeObjectURL(currentPreviewUrl);
      }
    }
  };

  // Bấm Enter để gửi, Shift+Enter để xuống dòng
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isSubmitDisabled =
    (!content.trim() && !selectedFile) ||
    (selectedFile ? isSending : false) ||
    cooldown > 0 ||
    disabled;

  return (
    <div className="chat-composer-bar">
      {/* Thông báo lỗi nếu có */}
      {errorMessage && (
        <div style={{ color: "#ef4444", fontSize: 12, fontWeight: 600 }}>
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Khung xem trước hình ảnh đính kèm */}
      {previewUrl && (
        <div className="media-attachment-preview">
          <img src={previewUrl} alt="Ảnh chuẩn bị gửi" />
          <button
            type="button"
            className="btn-remove-preview"
            onClick={handleRemoveFile}
            title="Hủy ảnh đính kèm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hàng nhập liệu */}
      <div className="composer-input-row">
        {/* Nút chọn ảnh */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={handleFileSelect}
        />
        <button
          type="button"
          className="btn-attach-media"
          onClick={() => fileInputRef.current?.click()}
          title="Đính kèm hình ảnh (JPG, PNG <= 5MB)"
          disabled={disabled || isSending}
        >
          📷
        </button>

        {/* Textarea nhập tin nhắn */}
        <textarea
          ref={textareaRef}
          className="composer-textarea"
          placeholder={
            cooldown > 0
              ? `Vui lòng chờ ${cooldown}s trước khi gửi tiếp...`
              : "Nhập tin nhắn..."
          }
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          disabled={disabled || cooldown > 0}
          rows={1}
        />

        {/* Nút gửi */}
        <button
          type="button"
          className="btn-send-message"
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
          title={cooldown > 0 ? `Chờ ${cooldown}s` : "Gửi tin nhắn"}
        >
          {isSending ? "⏳" : "➤"}
        </button>
      </div>

      {/* Footer phụ: Đếm ký tự & Thông báo Cooldown */}
      <div className="composer-footer-meta">
        <div>
          {cooldown > 0 && (
            <span className="cooldown-text">
              ⏱️ Đang chờ giãn cách gửi tin: {cooldown}s
            </span>
          )}
        </div>
        <div>
          <span>{content.length}/{MAX_CHARS}</span>
        </div>
      </div>
    </div>
  );
};
