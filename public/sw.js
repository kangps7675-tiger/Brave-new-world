/**
 * Conflict View — 최소 서비스워커
 *
 * 목적 2가지뿐:
 *  1) PWA 설치 가능 조건 충족 (Chrome은 fetch 핸들러가 있는 SW를 요구)
 *  2) 향후 웹 푸시 수신 준비 (push / notificationclick 핸들러)
 *
 * ★ 캐싱은 일부러 하지 않는다.
 *   이 앱은 GDELT·FIRMS·AIS·뉴스 등 전부 실시간 데이터라, SW가 응답을 캐시하면
 *   유저가 낡은 상황판을 보게 되는 심각한 문제가 생긴다. fetch는 그대로 통과시킨다.
 */

const SW_VERSION = "cv-sw-v1";

self.addEventListener("install", (event) => {
  // 새 SW를 즉시 활성화 — 배포 후 유저가 낡은 SW에 묶이지 않게
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // 혹시 과거 버전이 남긴 캐시가 있으면 정리 (현재는 캐시를 만들지 않음)
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== SW_VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

/** 설치 가능 조건용 — 네트워크 그대로 통과(캐시 없음) */
self.addEventListener("fetch", (event) => {
  // respondWith를 호출하지 않으면 브라우저 기본 동작(네트워크)으로 처리된다.
  // 핸들러 존재 자체가 installability 요건이므로 이대로 둔다.
  void event;
});

/**
 * 웹 푸시 수신 — 서버(VAPID) 붙이면 바로 동작.
 * payload 예: { title, body, url, tag }
 */
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
    icon: "/icon",
    badge: "/icon",
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
      // 이미 열린 탭이 있으면 그걸 포커스
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
