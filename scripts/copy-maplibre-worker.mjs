#!/usr/bin/env node
/**
 * MapLibre GL JS v6는 번들러(webpack 등) 환경에서 워커 URL을
 * `import.meta.url` 기준으로 안정적으로 자동 감지하지 못한다 — 공식
 * v5→v6 마이그레이션 가이드에 명시된 사항. `setWorkerUrl()`을 직접
 * 호출해야 하는데, `new URL("maplibre-gl/dist/maplibre-gl-worker.mjs",
 * import.meta.url)` 패턴은 Next.js의 webpack 클라이언트 번들(네이티브 ESM이
 * 아닌 webpack 런타임 위에서 도는 번들)에서는 `import.meta.url`이 실제
 * 파일 경로를 가리키지 않아 실패한다 — 워커 객체 자체는 에러 없이
 * 생성되지만 내부 스크립트가 비어있어 dispatcher가 보내는 모든 메시지에
 * 응답이 없다(콘솔 에러도 없음). 그 결과 style.json·TileJSON·sprite는
 * 정상 로드되는데 벡터 타일 .pbf 요청은 단 한 건도 나가지 않고 베이스맵이
 * 완전히 빈 채로 남는다.
 *
 * 대신 워커(+ shared) 파일을 public/에 그대로 복사해두고
 * setWorkerUrl("/maplibre-gl-worker.mjs")처럼 평범한 정적 URL 문자열로
 * 가리킨다. v6 worker.mjs는 `./maplibre-gl-shared.mjs`를 상대 import하므로
 * shared도 반드시 같은 public/ 루트에 있어야 한다 — worker만 복사하면
 * 워커 모듈이 404로 죽고 .pbf가 0건인 채 화면이 비게 된다.
 *
 * package.json의 predev/prebuild에서 자동 실행됨.
 */
import { existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const distDir = join(projectRoot, "node_modules", "maplibre-gl", "dist");
const destDir = join(projectRoot, "public");

/** worker가 상대 import하는 파일까지 포함 — 빠진 파일이 있으면 워커가 조용히 죽음 */
const FILES = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

function needsCopy(src, dest) {
  if (!existsSync(dest)) return true;
  const s = statSync(src);
  const d = statSync(dest);
  return s.mtimeMs > d.mtimeMs || s.size !== d.size;
}

if (!existsSync(join(distDir, "maplibre-gl-worker.mjs"))) {
  console.error(
    `[copy-maplibre-worker] ${distDir}/maplibre-gl-worker.mjs 없음 — maplibre-gl 설치를 확인하세요.`,
  );
  process.exit(1);
}

if (!existsSync(destDir)) {
  mkdirSync(destDir, { recursive: true });
}

let copied = 0;
let skipped = 0;
for (const name of FILES) {
  const src = join(distDir, name);
  const dest = join(destDir, name);
  if (!existsSync(src)) {
    console.error(
      `[copy-maplibre-worker] 필수 파일 없음: ${src} — v6 worker는 shared 없이 동작하지 않습니다 (.pbf 0건).`,
    );
    process.exit(1);
  }
  if (needsCopy(src, dest)) {
    copyFileSync(src, dest);
    console.log(`[copy-maplibre-worker] ${name} -> public/${name} 복사 완료`);
    copied += 1;
  } else {
    console.log(`[copy-maplibre-worker] public/${name} 최신 상태 — 건너뜀`);
    skipped += 1;
  }
}

if (copied === 0 && skipped === 0) {
  console.error("[copy-maplibre-worker] 복사된 파일 없음");
  process.exit(1);
}
