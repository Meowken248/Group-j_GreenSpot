import React, { useMemo } from "react";
import { generateQrMatrix } from "../utils/qrCodeGenerator";

interface QRCodeSvgProps {
  value: string;
  size?: number;
  className?: string;
  color?: string;
  bgColor?: string;
}

export const QRCodeSvg: React.FC<QRCodeSvgProps> = ({
  value,
  size = 200,
  className = "",
  color = "#0f172a",
  bgColor = "#ffffff",
}) => {
  const matrix = useMemo(() => {
    try {
      return generateQrMatrix(value || "GREENSPOT-EMPTY");
    } catch {
      return [];
    }
  }, [value]);

  const matrixSize = matrix.length || 21;
  const padding = 2; // Quiet zone
  const totalCells = matrixSize + padding * 2;

  return (
    <div
      className={`qr-svg-wrapper ${className}`}
      style={{
        display: "inline-block",
        background: bgColor,
        padding: "8px",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
      }}
    >
      <svg
        viewBox={`0 0 ${totalCells} ${totalCells}`}
        width={size}
        height={size}
        shapeRendering="crispEdges"
        style={{ display: "block" }}
      >
        <rect
          x={0}
          y={0}
          width={totalCells}
          height={totalCells}
          fill={bgColor}
        />
        {matrix.map((row, r) =>
          row.map((isDark, c) => {
            if (!isDark) return null;
            return (
              <rect
                key={`${r}-${c}`}
                x={c + padding}
                y={r + padding}
                width={1}
                height={1}
                fill={color}
              />
            );
          })
        )}
      </svg>
    </div>
  );
};
