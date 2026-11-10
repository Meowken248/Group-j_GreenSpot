/**
 * Utility helper to resolve media URLs (images, videos, thumbnails).
 * Handles both relative backend paths (/uploads/...) and external/blob URLs.
 * An toàn tuyệt đối với cả tham số là String lẫn Object ({ url: "..." }).
 */
export const resolveMediaUrl = (url?: any): string => {
  if (!url) return "";

  // Trích xuất chuỗi URL an toàn nếu tham số truyền vào là Object (ví dụ: { url: "..." })
  const targetUrl: string =
    typeof url === "string"
      ? url
      : typeof url === "object" && url !== null && typeof url.url === "string"
      ? url.url
      : "";

  if (!targetUrl || typeof targetUrl.startsWith !== "function") return "";

  // Chuẩn hóa địa chỉ localhost:8000 cũ sang backendBase hiện tại để tránh lỗi IPv6
  const backendBase = (
    import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
  ).replace(/\/$/, "");

  if (targetUrl.startsWith("http://localhost:8000")) {
    return targetUrl.replace("http://localhost:8000", backendBase);
  }

  // Blob, Data, or already absolute HTTP/HTTPS URLs
  if (
    targetUrl.startsWith("blob:") ||
    targetUrl.startsWith("data:") ||
    targetUrl.startsWith("http://") ||
    targetUrl.startsWith("https://")
  ) {
    return targetUrl;
  }

  // Relative backend path (e.g., /uploads/incidents/...)
  const cleanPath = targetUrl.startsWith("/") ? targetUrl : `/${targetUrl}`;
  return `${backendBase}${cleanPath}`;
};

