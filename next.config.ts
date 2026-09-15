import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hỗ trợ đóng gói ứng dụng tối ưu cho Docker (kích thước nhỏ gọn, chạy độc lập)
  output: "standalone",
};

export default nextConfig;
