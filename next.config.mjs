/** @type {import('next').NextConfig} */
const nextConfig = {
  // 기존 unused-vars가 build를 막지 않도록 (webpack 번들 오류와 별개)
  eslint: { ignoreDuringBuilds: true },
  // 로컬/저메모리에서 next 내장 tsc가 OOM 나므로 게이트는 `npx tsc --noEmit`
  typescript: { ignoreBuildErrors: true },
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

      // Downloads·OneDrive 등 동기화 폴더에서 filesystem 캐시 손상 → HMR 중 청크 404 방지
      config.cache = { type: "memory" };

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
    } else {
      // production build도 OneDrive 경로에서 filesystem 캐시가 멈춘 것처럼 보일 수 있음
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
