import type { SyntheticEvent } from "react";
import placeholder from "../assets/image-unavailable.svg";

export function showImageFallback(event: SyntheticEvent<HTMLImageElement>) {
  const img = event.currentTarget;
  const fallback = new URL(placeholder, window.location.href).href;
  if (img.src === fallback) return;
  img.src = fallback;
  img.title = "Không tải được ảnh gốc. Ảnh thay thế đang được hiển thị.";
}
