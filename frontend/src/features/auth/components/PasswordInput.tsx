import React, { useState } from "react";

interface PasswordInputProps {
  id: string;
  name: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  autoComplete?: string;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  id,
  name,
  placeholder,
  value,
  onChange,
  onBlur,
  onKeyDown,
  disabled = false,
  hasError = false,
  errorMessage,
  inputRef,
  autoComplete = "off",
}) => {
  // Mặc định là ẩn nội dung theo đúng đặc tả
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const toggleVisibility = () => {
    if (!disabled) {
      setShowPassword((prev) => !prev);
    }
  };

  return (
    <div className="form-group password-group">
      <div className="input-wrapper">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type={showPassword ? "text" : "password"}
          className={`form-input ${hasError ? "has-error" : ""}`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
        />
        <button
          type="button"
          className="password-toggle-btn"
          onClick={toggleVisibility}
          disabled={disabled}
          title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          tabIndex={-1} // Để phím Tab lướt từ ô này sang ô tiếp theo mượt mà
        >
          {showPassword ? (
            // Icon con mắt gạch chéo / mở mắt (SVG sắc nét)
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
              <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>
          ) : (
            // Icon con mắt bình thường (mặc định)
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          )}
        </button>
      </div>
      {hasError && errorMessage && (
        <span id={`${id}-error`} className="input-error-msg" role="alert">
          {errorMessage}
        </span>
      )}
    </div>
  );
};
