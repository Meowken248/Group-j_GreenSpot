/**
 * RadiusPickerModal (Màn 3 của Chức năng STT 08)
 * Căn cứ tài liệu: Đồ Án Chuyên Đề Web 1 - Báo Cáo.docx.pdf (Trang 101 - 102)
 * Cho phép điều chỉnh bán kính quét từ 500m đến 10km bằng Slider mượt mà
 */

import React, { useState, useEffect } from "react";
import { RADIUS_PRESETS } from "../services/feedService";

interface RadiusPickerModalProps {
  isOpen: boolean;
  currentRadius: number;
  onApply: (newRadius: number) => void;
  onClose: () => void;
}

export const RadiusPickerModal: React.FC<RadiusPickerModalProps> = ({
  isOpen,
  currentRadius,
  onApply,
  onClose,
}) => {
  const [sliderValue, setSliderValue] = useState<number>(currentRadius);

  useEffect(() => {
    if (isOpen) {
      setSliderValue(currentRadius);
    }
  }, [isOpen, currentRadius]);

  // Đóng modal khi nhấn phím Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderValue(parseFloat(e.target.value));
  };

  const handlePresetClick = (val: number) => {
    setSliderValue(val);
  };

  const handleApply = () => {
    onApply(sliderValue);
  };

  const formattedDistance =
    sliderValue < 1 ? `${Math.round(sliderValue * 1000)} m` : `${sliderValue.toFixed(1)} km`;

  return (
    <div
      className="feed-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="radius-modal-title"
    >
      <div
        className="feed-modal-content radius-picker-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header-sub">
          <span className="modal-badge-eyebrow">POPUP</span>
          <h3 id="radius-modal-title" className="modal-title-bold">
            CHỌN BÁN KÍNH
          </h3>
          <p className="modal-desc-sub">
            Quét và nạp các bài viết phản ánh môi trường xung quanh bạn
          </p>
        </div>

        {/* Khối hiển thị cự ly thời gian thực */}
        <div className="radius-display-box">
          <div className="radar-ping-icon">
            <span className="radar-circle-animate"></span>
            <span className="radar-center-dot">📡</span>
          </div>
          <div className="radius-current-val">{formattedDistance}</div>
          <div className="radius-val-label">Bán kính quét hiện tại</div>
        </div>

        {/* Thanh trượt khoảng cách Slider 500m - 10km */}
        <div className="slider-control-group">
          <input
            type="range"
            min="0.5"
            max="10.0"
            step="0.5"
            value={sliderValue}
            onChange={handleSliderChange}
            className="radius-range-slider"
            aria-label="Thanh trượt bán kính"
          />
          <div className="slider-ticks-row">
            <span>500m</span>
            <span>2km</span>
            <span>5km</span>
            <span>10km</span>
          </div>
        </div>

        {/* Các mốc cự ly nhanh */}
        <div className="preset-buttons-row">
          {RADIUS_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              className={`preset-pill-btn ${
                Math.abs(sliderValue - preset.value) < 0.1 ? "active" : ""
              }`}
              onClick={() => handlePresetClick(preset.value)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Nút hành động */}
        <div className="modal-actions-footer">
          <button
            type="button"
            className="btn-modal-cancel"
            onClick={onClose}
          >
            Huỷ
          </button>
          <button
            type="button"
            className="btn-modal-apply"
            onClick={handleApply}
          >
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
};
