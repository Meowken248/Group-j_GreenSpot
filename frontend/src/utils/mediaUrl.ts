/**
 * Utility helper to resolve media URLs (images, videos, thumbnails).
 * Handles both relative backend paths (/uploads/...) and external/blob URLs.
 */
export const resolveMediaUrl = (url?: string | null): string => {
  if (!url) return "";
  
  // Chuẩn hóa địa chỉ localhost:8000 cũ sang backendBase hiện tại để tránh lỗi IPv6
  const backendBase = (
    import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
  ).replace(/\/$/, "");

  if (url.startsWith("http://localhost:8000")) {
    return url.replace("http://localhost:8000", backendBase);
  }

  // Blob, Data, or already absolute HTTP/HTTPS URLs
  if (
    url.startsWith("blob:") ||
    url.startsWith("data:") ||
    url.startsWith("http://") ||
    url.startsWith("https://")
  ) {
    return url;
  }

  // Relative backend path (e.g., /uploads/incidents/...)
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${backendBase}${cleanPath}`;
};

