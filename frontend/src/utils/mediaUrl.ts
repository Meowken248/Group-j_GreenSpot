/**
 * Utility helper to resolve media URLs (images, videos, thumbnails).
 * Handles both relative backend paths (/uploads/...) and external/blob URLs.
 */
export const resolveMediaUrl = (url?: string | null): string => {
  if (!url) return "";
  
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
  const backendBase = (
    import.meta.env.VITE_API_URL || "http://localhost:8000"
  ).replace(/\/$/, "");
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${backendBase}${cleanPath}`;
};
