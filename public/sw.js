/**
 * Brave New World — 최소 서비스워커
 *
 * 목적:
 *  1) PWA 설치 조건 (Chrome: fetch 핸들러 필요)
 *  2) 웹 푸시 수신 준비
 *  3) 배포 후 설치된 데스크톱/모바일 앱이 옛 HTML·JS에 묶이지 않게 강제 갱신
 *
 * ★ 앱 셸/API 응답은 캐시하지 않는다 (실시간 지도·뉴스).
 * ★ activate 때 Cache Storage를 통째로 비운다.
 *   (과거 SW가 같은 이름으로 채워 둔 캐시를 “현재 버전”이라며 남기면
 *    크롬 설치 앱이 영원히 과거 배포를 보여 주는 사고가 난다.)
 */

/** 배포 시 scripts/stamp-sw-version.mjs 가 커밋 SHA로 덮어쓴다. */
const SW_VERSION = "cv-sw-v4-nocache-20260912";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.clients.claim();
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clients) {
        client.postMessage({ type: "CV_SW_UPDATED", version: SW_VERSION });
      }
    })(),
  );
});

/**
 * 문서 네비게이션만 네트워크 강제 — 브라우저 HTTP 캐시·옛 셸을 건너뛴다.
 * 그 외(타일·폰트·API)는 기본 네트워크 동작.
 */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (req.mode === "navigate") {
    event.respondWith(fetch(req, { cache: "no-store" }));
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "멋진 신세계";
  const options = {
    body: data.body || "",
    icon: "/brand/icon-512.png",
    badge: "/brand/icon-512.png",
    tag: data.tag || "cv-push",
    renotify: false,
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })(),
  );
});
