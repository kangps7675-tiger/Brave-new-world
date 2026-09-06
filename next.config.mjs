/**
 * Content-Security-Policy.
 *
 * 기본은 **Report-Only** — MapLibre(worker/blob)·Google Fonts·t.me/YouTube 임베드·
 * R2 CDN을 쓰기 때문에 곧바로 강제하면 화면이 깨질 수 있다. 위반 로그를 한동안
 * 관찰한 뒤 `CSP_ENFORCE=true` 로 전환한다.
 *
 * script-src:
 *  - 'unsafe-inline': Next.js 하이드레이션 + UI_FONT_BOOT_SCRIPT(FOUC 방지).
 *    nonce 미들웨어를 붙이면 제거 가능 — 후속 과제.
 *  - 'unsafe-eval': **development only** (webpack/HMR). 프로덕션·enforce 경로에는
 *    넣지 않는다. 앱 코드에 eval/new Function 의존이 없다.
 */
const isDev = process.env.NODE_ENV === "development";

const CSP_DIRECTIVES = [
  "default-src 'self'",
  isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com"
    : "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
  // Tailwind/MapLibre 런타임 스타일 주입 + Google Fonts
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // 지도 타일·아이콘·위성 이미지는 출처가 매우 다양하다
  "img-src 'self' data: blob: https:",
  // 오디오(Freesound 프리뷰·R2)
  "media-src 'self' blob: https:",
  // 외부 OSINT API·R2 CDN·타일 서버
  "connect-src 'self' https: wss:",
  // MapLibre 는 blob: worker 를 만든다
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  // t.me / YouTube 임베드
  "frame-src 'self' https://t.me https://www.youtube.com https://www.youtube-nocookie.com",
  // 클릭재킹 차단
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const CSP_HEADER_NAME =
  process.env.CSP_ENFORCE === "true"
    ? "Content-Security-Policy"
    : "Content-Security-Policy-Report-Only";

/**
 * 전역 보안 헤더.
 * HSTS 는 HTTPS 응답에서만 의미가 있고, 로컬 http://localhost 개발을 막지 않도록
 * 프로덕션 빌드에서만 붙인다.
 */
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "geolocation=(), microphone=(), camera=(), payment=(), usb=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: CSP_HEADER_NAME, value: CSP_DIRECTIVES },
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

/**
 * next build 내장 ESLint/tsc.
 *
 * - 배포(Vercel/CI/CF): 켠다 — `next build`만 도는 경로에서 타입·린트 구멍이 생기지 않게.
 * - 로컬: 기본 완화 — OneDrive·저메모리에서 내장 tsc OOM / 레거시 unused-vars 회피.
 *   강제하려면 `NEXT_RELAX_BUILD_GATES=0`, 로컬에서도 끄려면 `=1`.
 * - CI quality 잡은 별도로 `npm run lint` + `npx tsc --noEmit` 을 이미 돌린다.
 */
const relaxNextBuildGates = (() => {
  if (process.env.NEXT_RELAX_BUILD_GATES === "1") return true;
  if (process.env.NEXT_RELAX_BUILD_GATES === "0") return false;
  const isRemoteBuild = Boolean(
    process.env.CI || process.env.VERCEL || process.env.CF_PAGES,
  );
  return !isRemoteBuild;
})();

/** OneDrive·동기화 폴더에서만 webpack filesystem 캐시가 깨지므로 memory로 우회 */
function shouldUseMemoryWebpackCache(dev) {
  if (process.env.NEXT_WEBPACK_MEMORY_CACHE === "1") return true;
  if (process.env.NEXT_WEBPACK_MEMORY_CACHE === "0") return false;
  if (dev) return true;
  try {
    return /onedrive/i.test(process.cwd());
  } catch {
    return false;
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@deck.gl/core",
    "@deck.gl/mapbox",
    "@deck.gl/geo-layers",
    "@deck.gl/mesh-layers",
    "@deck.gl/layers",
    "@loaders.gl/core",
    "@loaders.gl/3d-tiles",
    "@loaders.gl/tiles",
    "@luma.gl/core",
    "@luma.gl/engine",
    "@math.gl/core",
  ],
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      // API 응답은 캐시·색인 대상이 아니다
      {
        source: "/api/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      // 서비스워커 스크립트는 브라우저가 기본적으로 HTTP 캐시에 태워버릴 수 있다.
      // 그러면 sw.js를 아무리 고쳐도(또는 배포해도) 기존 탭은 예전에 캐시된
      // 바이트를 계속 활성 SW로 쓰게 되고 — 실측: 예전에 깔린 SW가 이 프로젝트의
      // 실시간 지도 fetch(vector .pbf 타일, 신규 워커 스크립트 등)를 전부 영원히
      // pending 상태로 붙잡아 지도가 통째로 검게 죽는 원인이었다. no-cache로
      // 브라우저가 매번 네트워크에 재확인하게 해서 새 버전이 확실히 활성화되게 한다.
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      // PMTiles needs HTTP Range for random tile access
      {
        source: "/tiles/osm/:path*",
        headers: [
          { key: "Accept-Ranges", value: "bytes" },
          { key: "Cache-Control", value: "public, max-age=86400, immutable" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Expose-Headers",
            value: "Accept-Ranges, Content-Range, Content-Length, Content-Type",
          },
        ],
      },
      // MapLibre v6 worker (+ shared) — MIME/캐시 고정.
      // nosniff 환경에서 .mjs가 잘못된 타입으로 나가면 모듈 워커가 조용히 실패한다.
      {
        source: "/maplibre-gl-worker.mjs",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
      {
        source: "/maplibre-gl-shared.mjs",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
    ];
  },
  eslint: { ignoreDuringBuilds: relaxNextBuildGates },
  typescript: { ignoreBuildErrors: relaxNextBuildGates },
  experimental: {
    // ⚠️ "maplibre-gl"을 여기 넣지 말 것.
    // MapLibre는 CSP-safe worker를 `new Worker(new URL('./maplibre-gl-csp-worker', import.meta.url))`
    // 패턴(자기참조 정적 URL)으로 번들링한다. optimizePackageImports의 SWC 모듈 재작성이
    // 이 정적 참조 경계를 건드려 dev/prod 모두에서 워커 스크립트가 조용히 깨지는 것을
    // 실사용 환경에서 확인했다 — style.json·TileJSON·sprite는 정상 로드되고
    // map.loaded()/isStyleLoaded()도 false로 멈추지 않지만, 실제 vector .pbf 타일
    // fetch가 **단 한 건도** 나가지 않는다: `dispatcher.actor.sendAsync(...)`가
    // 영원히 pending 상태로 걸려(콘솔 에러 없음, 'error' 이벤트 없음) 타일이
    // "loading" 상태에서 멈추고 베이스맵 캔버스가 완전히 빈 채로(alpha=0) 남는다.
    // (Carto 빈 TileJSON 문제와는 별개의 원인.)
    serverComponentsExternalPackages: [
      "wrangler",
      "miniflare",
      "blake3-wasm",
      "esbuild",
      "workerd",
    ],
  },
  webpack: (config, { isServer, dev }) => {
    if (isServer) {
      const prev = config.externals;
      const extras = ["wrangler", "miniflare", "blake3-wasm", "workerd"];
      if (Array.isArray(prev)) {
        config.externals = [...prev, ...extras];
      } else if (typeof prev === "function") {
        config.externals = [
          prev,
          ({ request }, callback) => {
            if (request && extras.includes(request)) return callback(null, `commonjs ${request}`);
            callback();
          },
        ];
      } else {
        config.externals = extras;
      }
    }

    config.resolve = config.resolve ?? {};
    config.resolve.fallback = {
      ...(config.resolve.fallback ?? {}),
      fs: false,
      net: false,
      tls: false,
    };

    if (dev) {
      config.output = {
        ...config.output,
        // MapLibre 최초 컴파일이 길어질 수 있어 청크 타임아웃 여유
        chunkLoadTimeout: 600000,
      };

      // 상위 폴더(System Volume Information 등) 감시로 인한 Watchpack EINVAL 방지
      // ignored는 단일 RegExp 또는 문자열 glob 배열만 허용 — RegExp가 섞인 배열은 스키마 오류
      config.watchOptions = {
        aggregateTimeout: config.watchOptions?.aggregateTimeout ?? 5,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/.next/**",
          "**/System Volume Information/**",
        ],
      };
    }

    // dev 기본 · OneDrive cwd 프로덕션 로컬 빌드만 memory.
    // CI/Vercel 등 일반 경로는 webpack filesystem 캐시(증분 빌드)를 유지한다.
    if (shouldUseMemoryWebpackCache(dev)) {
      config.cache = { type: "memory" };
    }

    return config;
  },
};

export default nextConfig;

// Cloudflare OpenNext 로컬 바인딩 (패키지 설치 시에만). 미설치여도 next dev는 동작.
import("@opennextjs/cloudflare")
  .then((m) => m.initOpenNextCloudflareForDev())
  .catch(() => {});
