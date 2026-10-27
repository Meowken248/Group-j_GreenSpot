import React from "react";
import type { ReportStep } from "../types/report.types";

interface StepProgressBarProps {
  currentStep: ReportStep;
  onNavigateStep: (step: ReportStep) => void;
}

const STEPS: { step: ReportStep; label: string; icon: string }[] = [
  { step: 1, label: "Loại sự cố", icon: "📋" },
  { step: 2, label: "Ảnh/video", icon: "📷" },
  { step: 3, label: "Giọng nói", icon: "🎙️" },
  { step: 4, label: "Vị trí", icon: "📍" },
  { step: 5, label: "Xác nhận", icon: "✅" },
];

export const StepProgressBar: React.FC<StepProgressBarProps> = ({
  currentStep,
  onNavigateStep,
}) => {
  return (
    <div className="report-progress-bar">
      <div className="steps-container">
        {STEPS.map((item, index) => {
          const isCompleted = item.step < currentStep;
          const isCurrent = item.step === currentStep;
          const isClickable = item.step < currentStep; // Quy tắc: Chỉ bấm quay lại được các bước đã hoàn thành

          return (
            <React.Fragment key={item.step}>
              <div
                className={`step-item ${isCurrent ? "current" : ""} ${
                  isCompleted ? "completed" : ""
                } ${isClickable ? "clickable" : "disabled"}`}
                onClick={() => {
                  if (isClickable) {
                    onNavigateStep(item.step);
                  }
                }}
                title={
                  isClickable
                    ? `Quay lại Bước ${item.step}: ${item.label}`
                    : isCurrent
                    ? `Đang ở Bước ${item.step}`
                    : `Chưa hoàn thành`
                }
              >
                <div className="step-circle">
                  {isCompleted ? (
                    <span className="check-mark">✓</span>
                  ) : (
                    <span className="step-num">{item.step}</span>
                  )}
                </div>
                <div className="step-text">
                  <span className="step-label">{item.label}</span>
                </div>
              </div>

              {index < STEPS.length - 1 && (
                <div
                  className={`step-connector ${
                    item.step < currentStep ? "completed" : ""
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div className="current-step-badge">
        Bước {currentStep}/5: {STEPS[currentStep - 1].label}
      </div>
    </div>
  );
};

