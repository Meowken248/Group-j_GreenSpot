import React, { useState, useRef, useEffect } from "react";

export interface CustomSelectOption {
  value: string | number;
  label: string;
}

interface CustomSelectDropdownProps {
  id?: string;
  value?: string | number;
  options: CustomSelectOption[];
  placeholder?: string;
  hasSearch?: boolean;
  disabled?: boolean;
  error?: boolean;
  onChange: (value: string | number | undefined) => void;
}

export const CustomSelectDropdown: React.FC<CustomSelectDropdownProps> = ({
  id,
  value,
  options,
  placeholder = "-- Chọn một mục --",
  hasSearch = true,
  disabled = false,
  error = false,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Tìm option đang được chọn
  const selectedOption = options.find(
    (opt) => String(opt.value) === String(value)
  );

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus ô tìm kiếm khi mở menu
  useEffect(() => {
    if (isOpen && hasSearch && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    if (!isOpen) {
      setSearchTerm("");
    }
  }, [isOpen, hasSearch]);

  // Đóng khi nhấn phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Lọc options theo từ khoá tìm kiếm
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  const handleSelect = (val: string | number | undefined) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`custom-select-dropdown-container ${isOpen ? "is-open" : ""} ${
        error ? "has-error" : ""
      } ${disabled ? "is-disabled" : ""}`}
    >
      {/* Nút bấm hiển thị trạng thái chọn */}
      <button
        type="button"
        id={id ? `${id}-button` : undefined}
        className={`dropdown-trigger-btn ${!selectedOption ? "is-placeholder" : ""}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="trigger-text">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className={`trigger-chevron ${isOpen ? "rotate" : ""}`}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>

      {/* Select native ẩn để đồng bộ form và kiểm thử tự động */}
      <select
        id={id}
        value={value ?? ""}
        onChange={(e) => {
          const val = e.target.value;
          onChange(val === "" ? undefined : val);
        }}
        tabIndex={-1}
        aria-hidden="true"
        style={{
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
          width: 0,
          height: 0,
          margin: 0,
          padding: 0,
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Menu thả xuống tuỳ biến */}
      {isOpen && (
        <div className="dropdown-menu-popover" role="listbox">
          {hasSearch && options.length > 6 && (
            <div className="dropdown-search-box">
              <span className="search-icon">🔍</span>
              <input
                ref={searchInputRef}
                type="text"
                className="dropdown-search-input"
                placeholder="Tìm nhanh quận/huyện…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearchTerm("")}
                  title="Xoá từ khoá"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          <div className="dropdown-options-scrollable">
            {/* Mục mặc định Tất cả / Bỏ chọn */}
            <div
              className={`dropdown-option-row ${!value ? "is-selected" : ""}`}
              onClick={() => handleSelect(undefined)}
              role="option"
              aria-selected={!value}
            >
              <span className="option-label-text">{placeholder}</span>
              {!value && <span className="option-check-icon">✓</span>}
            </div>

            {/* Danh sách các quận/huyện */}
            {filteredOptions.map((opt) => {
              const isSelected = String(value) === String(opt.value);
              return (
                <div
                  key={opt.value}
                  className={`dropdown-option-row ${
                    isSelected ? "is-selected" : ""
                  }`}
                  onClick={() => handleSelect(opt.value)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span className="option-label-text">{opt.label}</span>
                  {isSelected && <span className="option-check-icon">✓</span>}
                </div>
              );
            })}

            {filteredOptions.length === 0 && (
              <div className="dropdown-empty-state">
                <span>Không tìm thấy quận/huyện phù hợp</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

