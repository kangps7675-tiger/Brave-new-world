/**
 * 상황실 코너 로그 — 실제 페치와 연동 + 앰비언트 라인.
 * UI 전용; 보안/해킹과 무관.
 */

type Listener = (lines: string[]) => void;

const MAX_LINES = 8;
const listeners = new Set<Listener>();
let lines: string[] = [];

function emit() {
  const snapshot = lines.slice();
  listeners.forEach((fn) => fn(snapshot));
}

function stamp(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function pushOpsLog(message: string): void {
  const line = `[${stamp()}] ${message}`;
  lines = [...lines.slice(-(MAX_LINES - 1)), line];
  emit();
}

export function subscribeOpsLog(listener: Listener): () => void {
  listeners.add(listener);
  listener(lines.slice());
  return () => {
    listeners.delete(listener);
  };
}

const AMBIENT = [
  "HANDSHAKE · EDGE WORKER POOL … OK",
  "GDELT SNAPSHOT PULL · THEATER TAGS",
  "FIRMS VIIRS BUFFER · RETENTION 48H",
  "AIS D1 READ · VIEWPORT CULL ACTIVE",
  "ADS-B MIL FILTER · dbFlags&1",
  "NEWS RSS WARM · TRUST TIER SORT",
  "VIINA RENDER GATE · HMAC SESSION",
  "WTI RANK PIPELINE · STABILIZE EMA",
];

let ambientIdx = 0;

/** 가끔 앰비언트 한 줄 — 컴포넌트 마운트 시 타이머용 */
export function pushAmbientOpsLog(): void {
  const msg = AMBIENT[ambientIdx % AMBIENT.length]!;
  ambientIdx += 1;
  pushOpsLog(msg);
}
