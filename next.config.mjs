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
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      // API 응답은 캐시·색인 대상이 아니다
      {
        source: "/api/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  // Cesium ESM + workers — Next 기본 transpile 대상에 포함
  transpilePackages: ["cesium"],
  eslint: { ignoreDuringBuilds: relaxNextBuildGates },
  typescript: { ignoreBuildErrors: relaxNextBuildGates },
  experimental: {
    optimizePackageImports: ["maplibre-gl"],
    // wrangler/miniflare를 서버 번들에 넣으면 blake3-wasm·esbuild가 깨짐
    serverComponentsExternalPackages: [
      "wrangler",
      "miniflare",
      "blake3-wasm",
      "esbuild",
      "workerd",
    ],
  },
  webpack: (config, { isServer, dev }) => {
    // Cesium이 Node fs 등을 요구할 때 클라이언트 번들 깨짐 방지
    if (!isServer) {
      config.resolve = config.resolve ?? {};
      config.resolve.fallback = {
        ...(config.resolve.fallback ?? {}),
        fs: false,
        http: false,
        https: false,
        zlib: false,
        url: false,
      };
    }

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
