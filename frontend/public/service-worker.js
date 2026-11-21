/**
 * GreenSpot Offline-First Service Worker (STT 19)
 * Quản lý bộ đệm tài nguyên tĩnh để mở lại ứng dụng khi offline.
 * Tuân thủ R05: Đóng và mở lại trình duyệt hoặc F5 vẫn mở được giao diện phản ánh.
 */

const CACHE_NAME = "greenspot-offline-v1";
const STATIC_ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/favicon.svg",
  "/icons.svg",
  "/manifest.json",
];

// Cài đặt Service Worker và nạp trước các tài nguyên cơ sở
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS_TO_CACHE).catch((err) => {
        console.warn("[SW] Cache nạp trước một số asset thất bại:", err);
      });
    })
  );
  self.skipWaiting();
});

// Kích hoạt Service Worker và dọn dẹp các cache phiên bản cũ
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("[SW] Xóa cache cũ:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Điều phối các yêu cầu Fetch
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Không cache các yêu cầu ghi (POST, PUT, DELETE, PATCH)
  if (req.method !== "GET") {
    return;
  }

  // Không cache các endpoint xác thực nhạy cảm hoặc socket
  if (
    url.pathname.startsWith("/api/v1/auth") ||
    url.pathname.includes("/ws") ||
    url.pathname.includes("/socket.io")
  ) {
    return;
  }

  // Chiến lược Stale-While-Revalidate cho danh mục rác đô thị (/api/v1/waste-categories)
  if (url.pathname.startsWith("/api/v1/waste-categories")) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(req).then((cachedResponse) => {
          const fetchPromise = fetch(req)
            .then((networkResponse) => {
              if (networkResponse.ok) {
                cache.put(req, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Chiến lược Cache-First có Network-Fallback cho các tài nguyên tĩnh (.js, .css, .svg, .png, font)
  const isStaticAsset =
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.startsWith("/assets/");

  if (isStaticAsset) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(req)
          .then((res) => {
            if (res.ok) {
              const resClone = res.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(req, resClone);
              });
            }
            return res;
          })
          .catch(() => caches.match("/index.html"));
      })
    );
    return;
  }

  // Cho trang HTML chính: Network-First có Fallback về Cache
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => {
        return caches.match("/index.html") || caches.match("/");
      })
    );
  }
});
