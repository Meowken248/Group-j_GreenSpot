import React, { useState, useEffect, useRef, useCallback } from "react";
import { AuthHeader } from "../components/AuthHeader";
import { AuthFooter } from "../components/AuthFooter";
import { Toast } from "../components/Toast";
import { OtpErrorModal } from "../components/OtpErrorModal";
import type { ToastState } from "../types/auth.types";
import { AUTH_STORAGE_KEYS } from "../types/auth.types";
import { maskEmail } from "../utils/validators";
import { verifyOtp, resendOtp } from "../services/authService";
import "../styles/OtpVerificationPage.scss";

interface OtpVerificationPageProps {
  email: string;
  onNavigateToLogin: () => void;
  onNavigateToActivated: () => void;
  onBackToRegister: () => void;
  onLogoClick?: () => void;
}

export const OtpVerificationPage: React.FC<OtpVerificationPageProps> = ({
  email: propEmail,
  onNavigateToActivated,
  onBackToRegister,
  onLogoClick,
}) => {
  // 1. Quản lý Email và SessionStorage
  const [currentEmail, setCurrentEmail] = useState<string>(() => {
    return propEmail || sessionStorage.getItem(AUTH_STORAGE_KEYS.EMAIL) || "";
  });

  // 2. Ô nhập 6 số
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 3. Bộ đếm ngược 60 giây
  const [countdown, setCountdown] = useState<number>(60);
  const [isResendDisabledPermanently, setIsResendDisabledPermanently] = useState<boolean>(false);

  // 4. Quản lý số lần nhập sai (khóa sau 5 lần)
  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    const saved = sessionStorage.getItem(AUTH_STORAGE_KEYS.FAILED_ATTEMPTS);
    return saved ? parseInt(saved, 10) : 0;
  });

  // 5. Trạng thái Popup Màn 4
  const [showErrorModal, setShowErrorModal] = useState<boolean>(false);

  // 6. UI state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ id: Date.now(), message, type });
  };

  // Hàm tính toán và cập nhật countdown từ sessionStorage
  const updateCountdownFromStorage = useCallback(() => {
    const sentTimeStr = sessionStorage.getItem(AUTH_STORAGE_KEYS.OTP_SENT_TIME);
    if (sentTimeStr) {
      const sentTime = parseInt(sentTimeStr, 10);
      const elapsed = Math.floor((Date.now() - sentTime) / 1000);
      const remaining = Math.max(0, 60 - elapsed);
      setCountdown(remaining);
    } else {
      const now = Date.now();
      sessionStorage.setItem(AUTH_STORAGE_KEYS.OTP_SENT_TIME, now.toString());
      setCountdown(60);
    }
  }, []);

  // Kiểm tra Session khi mở màn hình: Nếu không có email hợp lệ -> chuyển về Màn 1
  useEffect(() => {
    const effectiveEmail = propEmail || sessionStorage.getItem(AUTH_STORAGE_KEYS.EMAIL);
    if (!effectiveEmail || effectiveEmail.trim().length === 0) {
      onBackToRegister();
      return;
    }

    setCurrentEmail(effectiveEmail);
    sessionStorage.setItem(AUTH_STORAGE_KEYS.EMAIL, effectiveEmail);

    // Tính lại bộ đếm theo thời gian thực đã trôi qua
    updateCountdownFromStorage();

    // Tự động focus vào ô đầu tiên khi mở màn hình
    inputRefs.current[0]?.focus();
  }, [propEmail, onBackToRegister, updateCountdownFromStorage]);

  // Vòng lặp đếm ngược mỗi giây
  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  // Xử lý gõ ký tự vào từng ô (chỉ nhận số 0-9)
  const handleDigitChange = (index: number, value: string) => {
    if (isSubmitting) return;

    // Lấy ký tự cuối cùng vừa gõ
    const char = value.slice(-1);

    // Chỉ nhận số 0-9 theo đặc tả
    if (!/^\d$/.test(char)) {
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);

    // Nhập xong tự nhảy sang ô kế tiếp
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Xử lý phím Backspace và Enter
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (otpDigits[index] !== "") {
        // Xóa ô hiện tại
        const newDigits = [...otpDigits];
        newDigits[index] = "";
        setOtpDigits(newDigits);
      } else if (index > 0) {
        // Lùi về ô trước và xóa ô đó
        const newDigits = [...otpDigits];
        newDigits[index - 1] = "";
        setOtpDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "Enter") {
      // Nhấn Enter có tác dụng như bấm nút Xác nhận nếu đã đủ 6 số
      if (otpDigits.every((d) => d !== "")) {
        handleConfirm();
      }
    }
  };

  // Xử lý Dán (Paste) chuỗi
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").trim();

    // Đặc tả: Chỉ nhận chuỗi đúng 6 chữ số, nếu không đúng thì bỏ qua
    if (/^\d{6}$/.test(pasteData)) {
      const digits = pasteData.split("");
      setOtpDigits(digits);
      inputRefs.current[5]?.focus();
    }
  };

  // Reset 6 ô nhập và đặt con trỏ về ô đầu tiên
  const resetInputs = () => {
    setOtpDigits(["", "", "", "", "", ""]);
    inputRefs.current[0]?.focus();
  };

  // Xử lý bấm "Xác nhận"
  const handleConfirm = async () => {
    if (isSubmitting) return;

    // Kiểm tra đủ 6 chữ số
    if (!otpDigits.every((d) => d !== "")) return;

    // Nếu đã bị khóa do sai quá 5 lần -> hiện lại Popup rút gọn, không so sánh mã
    if (failedAttempts >= 5) {
      setShowErrorModal(true);
      return;
    }

    setIsSubmitting(true);
    const otpCode = otpDigits.join("");

    try {
      const result = await verifyOtp(currentEmail, otpCode);

      setIsSubmitting(false);

      if (result.success) {
        // Kích hoạt thành công -> chuyển sang Màn 3
        sessionStorage.removeItem(AUTH_STORAGE_KEYS.FAILED_ATTEMPTS);
        sessionStorage.removeItem(AUTH_STORAGE_KEYS.OTP_SENT_TIME);
        showToast("Kích hoạt tài khoản thành công", "success");

        setTimeout(() => {
          onNavigateToActivated();
        }, 600);
      } else {
        if (result.status === "NETWORK_ERROR") {
          // Mất kết nối hoặc máy chủ lỗi: không tính vào số lần sai, giữ nguyên 6 số
          showToast("Không thể kết nối đến máy chủ. Vui lòng thử lại", "error");
        } else {
          // Mã sai hoặc đã hết hạn
          const newFailedCount = failedAttempts + 1;
          setFailedAttempts(newFailedCount);
          sessionStorage.setItem(AUTH_STORAGE_KEYS.FAILED_ATTEMPTS, newFailedCount.toString());

          // Hiển thị Popup Màn 4
          setShowErrorModal(true);
        }
      }
    } catch {
      setIsSubmitting(false);
      showToast("Không thể kết nối đến máy chủ. Vui lòng thử lại", "error");
    }
  };

  // Xử lý gửi lại mã (Từ nút Màn 2 hoặc nút trên Popup Màn 4)
  const handleResend = async () => {
    if (countdown > 0 || isResendDisabledPermanently) return;

    setShowErrorModal(false);
    setIsSubmitting(true);

    try {
      const result = await resendOtp(currentEmail);
      setIsSubmitting(false);

      if (result.success) {
        // Gửi thành công: reset OTP cũ, đặt lại đếm sai về 0, hạn 5 phút tính lại, xóa 6 ô, chạy lại 60s
        showToast(result.message || "Mã OTP mới đã được gửi đến email của bạn", "success");

        const now = Date.now();
        sessionStorage.setItem(AUTH_STORAGE_KEYS.OTP_SENT_TIME, now.toString());
        sessionStorage.setItem(AUTH_STORAGE_KEYS.FAILED_ATTEMPTS, "0");
        setFailedAttempts(0);
        setCountdown(60);
        resetInputs();
      } else {
        if (result.status === "RATE_LIMITED") {
          showToast(result.message, "error");
          setIsResendDisabledPermanently(true);
        } else {
          showToast(result.message || "Không thể gửi mã OTP. Vui lòng thử lại sau", "error");
        }
      }
    } catch {
      setIsSubmitting(false);
      showToast("Không thể kết nối đến máy chủ. Vui lòng thử lại", "error");
    }
  };

  // Xử lý bấm "Nhập lại" trên Popup Màn 4
  const handleRetryFromModal = () => {
    setShowErrorModal(false);
    resetInputs();
  };

  // Kiểm tra cả 6 ô đã có số hay chưa
  const isFilledAll = otpDigits.every((d) => d !== "");

  return (
    <div className="otp-page-wrapper">
      {/* Toast thông báo góc trên bên phải */}
      <Toast toast={toast} onClose={() => setToast(null)} duration={3000} />

      {/* Header từ trên xuống */}
      <AuthHeader onLogoClick={onLogoClick} />

      {/* Popup Màn 4 khi nhập sai hoặc hết hạn */}
      <OtpErrorModal
        isOpen={showErrorModal}
        isLocked={failedAttempts >= 5}
        countdownSeconds={countdown}
        onRetry={handleRetryFromModal}
        onResend={handleResend}
      />

      {/* Nội dung chính Màn 2: Khung XÁC THỰC EMAIL */}
      <main className="otp-main-content">
        <section className="otp-card" aria-labelledby="otp-heading">
          <div className="otp-header-section">
            <div className="badge-tag">
              <span>📩</span>
              <span>BƯỚC 2: XÁC THỰC EMAIL</span>
            </div>
            <h1 id="otp-heading" className="card-title">XÁC THỰC EMAIL</h1>

            {/* Phần 1: Dòng thông báo kèm email đã che bớt và dòng phụ hiệu lực 5 phút */}
            <p className="email-notification-row">
              Mã OTP đã gửi tới email:
              <span className="masked-email">{maskEmail(currentEmail)}</span>
            </p>
            <span className="validity-subtext">Mã có hiệu lực trong 5 phút</span>
          </div>

          {/* Phần 2: 6 ô vuông nhập 1 chữ số (0–9) */}
          <div
            className="otp-inputs-wrapper"
            role="group"
            aria-label="Nhập 6 chữ số mã OTP"
          >
            {otpDigits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                id={`otp-box-${idx}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                className={`otp-square-box ${digit ? "filled" : ""}`}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                disabled={isSubmitting}
                autoComplete="one-time-code"
                aria-label={`Chữ số thứ ${idx + 1}`}
              />
            ))}
          </div>

          {/* Phần 3: Nút "Xác nhận" và Nút "Gửi lại mã" */}
          <div className="otp-actions-wrapper">
            <button
              type="button"
              className="btn-verify-otp"
              disabled={!isFilledAll || isSubmitting}
              onClick={handleConfirm}
            >
              {isSubmitting ? "Đang xác thực..." : "Xác nhận"}
            </button>

            <button
              type="button"
              className="btn-resend-otp"
              disabled={countdown > 0 || isSubmitting || isResendDisabledPermanently}
              onClick={handleResend}
            >
              {countdown > 0
                ? `Gửi lại mã sau ${countdown}s`
                : "Gửi lại mã"}
            </button>
          </div>
        </section>
      </main>

      {/* Footer dưới cùng */}
      <AuthFooter />
    </div>
  );
};
