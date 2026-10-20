"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { GLOBAL_BOOT_SHADER_CAMERA_Z } from "@/lib/globeCamera";
import { getLoadingShaderPlan } from "@/lib/renderTier";
import { releaseWebglContext } from "@/lib/webglSupport";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";

/**
 * 환영 편지와 같은 이름 설명.
 * 한 문장씩 나타났다가 사라진다.
 */
const NAME_LINES = [
  "여기 있는 데이터들은 가상이 아닌 현실입니다.",
  "헉슬리의 소설에서 ‘멋진’은 칭찬이 아니라 경고입니다.",
  "그 이름을 빌린 이 곳은, 전쟁과 돈이 한 지구본을 나눠 쓰는 세상입니다.",
];

const NAME_LINE_HOLD_MS = 3400;
const NAME_LINE_FADE_MS = 480;
/** 환영 편지와 같은 바탕. 모노·네온은 점수판처럼 보인다. */
const LOADING_PROSE_FONT =
  'var(--font-letter-hand), "RIDIBatang", Georgia, "Times New Roman", serif';
const LOADING_FIGURE_FONT =
  'var(--font-wanted), var(--font-ui), "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';

const VERT = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

/** 초록 육지 · 스치는 구름 · 야경 도시 불빛 · 우주 배경 */
const FRAG = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  // /*FBM_OCTAVES*/ 토큰 — createProgram에서 2|4로 치환 (P1-3)
  for (int i = 0; i < /*FBM_OCTAVES*/4; i++) {
    v += a * snoise(p);
    p = p * 2.02 + vec3(1.7, 9.2, 3.4);
    a *= 0.5;
  }
  return v;
}

vec3 rotateY(vec3 p, float a) {
  float cs = cos(a);
  float sn = sin(a);
  return vec3(p.x * cs + p.z * sn, p.y, -p.x * sn + p.z * cs);
}

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec3 spaceBackground(vec2 uv) {
  vec3 col = vec3(0.0, 0.0, 0.0);
  vec2 grid = floor(uv * vec2(640.0, 360.0));
  float star = hash21(grid);
  if (star > 0.9965) {
    float twinkle = 0.55 + 0.45 * sin(uTime * 2.4 + star * 40.0);
    col += vec3(0.85, 0.9, 1.0) * twinkle * smoothstep(0.9965, 0.999, star);
  }
  return col;
}

vec2 normalToLatLng(vec3 n) {
  float lat = asin(clamp(n.y, -1.0, 1.0));
  float lng = atan(n.x, n.z);
  return vec2(lat, lng);
}

float wrapLngDelta(float d) {
  return abs(mod(d + 3.14159265, 6.2831853) - 3.14159265);
}

/** 대략적 대륙 타원 + 노이즈 해안선 — 육지/바다 실루엣이 보이도록 */
float continentField(vec3 n) {
  vec2 ll = normalToLatLng(n);
  float field = 0.0;
  // center lat,lng · radius lat,lng (radians)
  field = max(field, 1.0 - length(vec2((ll.x - 0.45) / 0.55, wrapLngDelta(ll.y + 1.75) / 0.95))); // 유라시아
  field = max(field, 1.0 - length(vec2((ll.x - 0.15) / 0.72, wrapLngDelta(ll.y + 1.55) / 0.55))); // 아프리카
  field = max(field, 1.0 - length(vec2((ll.x - 0.72) / 0.42, wrapLngDelta(ll.y + 1.75) / 1.35))); // 북미
  field = max(field, 1.0 - length(vec2((ll.x + 0.25) / 0.55, wrapLngDelta(ll.y + 1.05) / 0.55))); // 남미
  field = max(field, 1.0 - length(vec2((ll.x + 0.45) / 0.38, wrapLngDelta(ll.y - 2.35) / 0.72))); // 호주
  field = max(field, 1.0 - length(vec2((ll.x + 0.95) / 0.28, wrapLngDelta(ll.y + 0.2) / 1.1))); // 남극
  field = max(field, 1.0 - length(vec2((ll.x - 0.15) / 0.22, wrapLngDelta(ll.y - 1.85) / 0.45))); // SE Asia / 인도
  float coast = fbm(n * 3.1 + vec3(1.4, 0.2, 2.7)) * 0.22;
  return clamp(field + coast - 0.12, 0.0, 1.0);
}

float landMask(vec3 n) {
  return smoothstep(0.28, 0.55, continentField(n));
}

vec3 cityLights(vec3 n, float land) {
  float coarse = fbm(n * 5.5 + vec3(0.4, 1.2, 2.8));
  float fine = fbm(n * 14.0 + vec3(3.1, 0.7, 5.2));
  float density = smoothstep(0.34, 0.78, coarse * 0.65 + fine * 0.55);
  density *= land;
  density *= smoothstep(0.92, 0.35, abs(n.y));
  vec3 warm = vec3(1.0, 0.72, 0.32);
  vec3 cool = vec3(0.55, 0.78, 1.0);
  return mix(warm, cool, fine * 0.35) * density * 1.55;
}

/** 경도 방향으로 스쳐 지나가는 구름층 */
float cloudCover(vec3 n, float time) {
  vec3 drift = rotateY(n, time * 0.07);
  float bands = fbm(drift * 2.4 + vec3(time * 0.05, 0.0, time * 0.03));
  float wisps = fbm(drift * 6.5 + vec3(1.2, time * 0.08, 0.4));
  float cover = smoothstep(0.12, 0.55, bands * 0.7 + wisps * 0.45);
  cover *= smoothstep(0.95, 0.55, abs(n.y));
  return cover * cover;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
  vec3 col = spaceBackground(uv);

  vec3 ro = vec3(uv * 1.12, ${GLOBAL_BOOT_SHADER_CAMERA_Z});
  vec3 rd = normalize(vec3(uv, -1.32));
  float spin = uTime * 0.11;

  float b = dot(ro, rd);
  float c = dot(ro, ro) - 1.0;
  float disc = b * b - c;

  if (disc >= 0.0) {
    float tHit = -b - sqrt(disc);
    if (tHit > 0.0) {
      vec3 p = ro + rd * tHit;
      vec3 n = normalize(rotateY(p, spin));
      vec3 lightDir = normalize(vec3(-0.42, 0.18, 0.88));
      float ndl = dot(n, lightDir);
      float night = smoothstep(0.22, -0.42, ndl);
      float twilight = smoothstep(0.35, -0.05, ndl) * (1.0 - night);

      float land = landMask(n);
      // 낮: 바다 청록 / 육지 초록
      vec3 oceanDay = vec3(0.04, 0.10, 0.20);
      vec3 landDay = vec3(0.12, 0.38, 0.16);
      vec3 landDayDeep = vec3(0.06, 0.22, 0.10);
      float veg = 0.55 + 0.45 * fbm(n * 5.0 + vec3(0.3, 1.1, 0.7));
      landDay = mix(landDayDeep, landDay, veg);
      // 밤: 어두운 초록 실루엣
      vec3 oceanNight = vec3(0.006, 0.012, 0.035);
      vec3 landNight = vec3(0.02, 0.07, 0.035);
      float polarW = smoothstep(0.78, 0.94, abs(n.y));
      vec3 polarDay = vec3(0.62, 0.66, 0.70);
      vec3 polarNight = vec3(0.12, 0.14, 0.18);

      vec3 daySurf = mix(oceanDay, landDay, land);
      daySurf = mix(daySurf, polarDay, polarW * (0.45 + 0.4 * land));
      vec3 nightSurf = mix(oceanNight, landNight, land);
      nightSurf = mix(nightSurf, polarNight, polarW * 0.7);

      vec3 lights = cityLights(n, land) * (night + twilight * 0.4);
      float dayGlow = clamp(ndl, 0.0, 1.0);
      vec3 daySide = daySurf * (0.4 + dayGlow * 0.9);
      vec3 nightSide = nightSurf + lights;

      col = mix(daySide, nightSide, smoothstep(0.12, -0.18, ndl));

      // 구름 — 지구보다 살짝 빠르게 스침
      float clouds = cloudCover(n, uTime);
      vec3 cloudLit = vec3(0.92, 0.95, 1.0) * (0.35 + dayGlow * 0.75);
      vec3 cloudDim = vec3(0.12, 0.14, 0.18);
      vec3 cloudCol = mix(cloudDim, cloudLit, 1.0 - night * 0.85);
      col = mix(col, cloudCol, clouds * (0.55 + 0.25 * (1.0 - night)));
      lights *= (1.0 - clouds * 0.7);
      col += lights * night * 0.15;

      float rim = pow(1.0 - max(dot(n, -rd), 0.0), 2.8);
      col += vec3(0.15, 0.38, 0.72) * rim * 0.42;
      col += vec3(0.45, 0.62, 0.95) * rim * rim * 0.18;

      float spec = pow(clamp(dot(reflect(-lightDir, n), -rd), 0.0, 1.0), 24.0);
      col += vec3(0.7, 0.82, 1.0) * spec * 0.1 * (0.25 + dayGlow) * (1.0 - land * 0.7) * (1.0 - clouds * 0.5);
    }
  }

  col = pow(col, vec3(1.02));
  gl_FragColor = vec4(col, 1.0);
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("shader create failed");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "unknown";
    gl.deleteShader(shader);
    throw new Error(log);
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext, fbmOctaves: 2 | 4 = 4) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERT);
  const fragSource = FRAG.replace("/*FBM_OCTAVES*/4", String(fbmOctaves));
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragSource);
  const program = gl.createProgram();
  if (!program) throw new Error("program create failed");
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? "unknown";
    throw new Error(log);
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return program;
}

/** 셰이더가 없거나 컨텍스트를 반납한 뒤에도 흰 캔버스가 비치지 않게 깔아 둔다.
 *  가운데 남색 원광 대신 앱 본문과 같은 먹색(#06070a)과 옅은 민트.
 */
const STATIC_BACKDROP: CSSProperties = {
  backgroundColor: "#06070a",
  backgroundImage:
    "radial-gradient(1px 1px at 18% 26%, rgba(255,255,255,.5) 50%, transparent 50%)," +
    "radial-gradient(1px 1px at 72% 18%, rgba(255,255,255,.38) 50%, transparent 50%)," +
    "radial-gradient(1px 1px at 41% 74%, rgba(255,255,255,.45) 50%, transparent 50%)," +
    "radial-gradient(ellipse 78% 58% at 50% 42%, rgba(0, 255, 204, 0.06) 0%, transparent 62%)," +
    "radial-gradient(ellipse 42% 32% at 82% 14%, rgba(69, 243, 255, 0.035) 0%, transparent 54%)," +
    "radial-gradient(ellipse 38% 28% at 14% 86%, rgba(255, 0, 127, 0.028) 0%, transparent 50%)",
  backgroundSize: "240px 240px, 320px 320px, 400px 400px, 100% 100%, 100% 100%, 100% 100%",
};

type GlobeLoadingScreenProps = {
  progress: number;
  fading?: boolean;
  /**
   * 대시보드(MapLibre)가 이미 마운트됨 — 로딩 셰이더 rAF를 멈춰
   * GPU·메인 스레드를 첫 지구본 프레임에 양보한다.
   */
  yieldGpu?: boolean;
  /** 데이터는 끝났고 지도만 그리는 중 — % 옆 카피만 바꿈 (경고·Ultra-Lite 없음) */
  waitingForMap?: boolean;
};

export function GlobeLoadingScreen({
  progress,
  fading = false,
  yieldGpu = false,
  waitingForMap = false,
}: GlobeLoadingScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(progress);
  const displayRef = useRef(progress);
  const [displayProgress, setDisplayProgress] = useState(progress);
  /** WebGL 컨텍스트·셰이더 실패 — CSS 정적 배경으로 강등 (P0-1) */
  const [shaderFailed, setShaderFailed] = useState(false);
  progressRef.current = progress;
  /**
   * GPU를 지도에 넘기거나 페이드할 때만 컨텍스트를 반납한다.
   * effect 재실행(Strict Mode 포함)마다 loseContext()를 치면
   * 같은 캔버스가 흰 화면으로 남고, 셰이더가 처음부터 다시 돈다.
   */
  const releaseOnStopRef = useRef(false);
  const pauseShader = yieldGpu || fading;
  releaseOnStopRef.current = pauseShader;
  const [nameLineIndex, setNameLineIndex] = useState(0);
  const [nameLineOn, setNameLineOn] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    const reduced = prefersReducedMotion();
    setReduceMotion(reduced);
    const fadeMs = reduced ? 0 : NAME_LINE_FADE_MS;

    const loop = () => {
      timer = window.setTimeout(() => {
        if (cancelled) return;
        setNameLineOn(false);
        timer = window.setTimeout(() => {
          if (cancelled) return;
          setNameLineIndex((index) => (index + 1) % NAME_LINES.length);
          setNameLineOn(true);
          loop();
        }, fadeMs);
      }, NAME_LINE_HOLD_MS);
    };
    loop();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const target = progressRef.current;
      const current = displayRef.current;
      if (Math.abs(target - current) < 0.2) {
        if (current !== target) {
          displayRef.current = target;
          setDisplayProgress(target);
        }
        return;
      }
      const next = current + (target - current) * 0.12;
      displayRef.current = next;
      setDisplayProgress(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progress]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || pauseShader) return;

    /** P1-3: reduced-motion · 저코어 → 정적 / phone → fbm 2옥타브 */
    const plan = getLoadingShaderPlan();
    if (!plan.useShader) {
      setShaderFailed(true);
      return;
    }

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      powerPreference: "low-power",
    });
    /**
     * P0-1: 예전에는 여기서 그냥 return했다 — 캔버스가 완전히 비어
     * 검은 화면 위에 퍼센트 숫자만 떠 있었다. CSS 정적 배경으로 대체한다.
     * alpha:false 캔버스의 기본 버퍼는 흰색이라, 첫 draw 전에 검게 지운다.
     */
    if (!gl || gl.isContextLost()) {
      setShaderFailed(true);
      return;
    }
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    let program: WebGLProgram;
    try {
      program = createProgram(gl, plan.fbmOctaves);
    } catch {
      canvas.style.visibility = "hidden";
      setShaderFailed(true);
      releaseWebglContext(gl);
      return;
    }

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, -1, 1, 1, -1, 1]),
      gl.STATIC_DRAW,
    );

    const aPos = gl.getAttribLocation(program, "aPos");
    const uResolution = gl.getUniformLocation(program, "uResolution");
    const uTime = gl.getUniformLocation(program, "uTime");

    let raf = 0;
    const start = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = (now: number) => {
      const t = (now - start) * 0.001;
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(draw);
    };

    draw(performance.now());

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      gl.deleteProgram(program);
      gl.deleteBuffer(buf);
      /**
       * 지도를 마운트하기 직전(yieldGpu)이나 페이드 중에만 반납한다.
       * 그 전에 캔버스를 숨겨야 loseContext()의 흰 프레임이 안 보인다.
       */
      if (!releaseOnStopRef.current) return;
      // 캔버스를 먼저 숨긴 뒤 반납해야 브라우저가 흰 프레임을 합성하지 않는다.
      canvas.style.visibility = "hidden";
      releaseWebglContext(gl);
    };
  }, [pauseShader]);

  const clamped = Math.min(100, Math.max(0, Math.round(displayProgress)));
  const nameLine = NAME_LINES[nameLineIndex] ?? NAME_LINES[0];

  return (
    <div
      // duration-200은 GlobeBootLoader의 LOADING_FADE_MS(250)와 맞춘 값이다.
      // CSS가 더 길면 페이드 도중 언마운트돼 화면이 뚝 끊긴다 (P1-2)
      // 배치·배경은 인라인이다. Tailwind 청크가 늦거나 빠지면
      // 퍼센트와 문장이 왼쪽 아래로 흘러내린다.
      className="transition-opacity duration-200 ease-out"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 700,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "#06070a",
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? "none" : "auto",
      }}
      aria-live="polite"
      aria-busy={!fading}
      aria-label={`로딩 중, ${clamped}퍼센트`}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          background: "#06070a",
          visibility: shaderFailed || pauseShader ? "hidden" : "visible",
        }}
      />
      {shaderFailed || pauseShader ? (
        <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: 1, ...STATIC_BACKDROP }} />
      ) : null}

      <div
        style={{
          pointerEvents: "none",
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "min(36rem, calc(100% - 2rem))",
          padding: "0 1rem",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "min(46vw, 34vh, 16rem)",
            height: "min(46vw, 34vh, 16rem)",
            flexShrink: 0,
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: "6%",
              borderRadius: "9999px",
              border: "1px solid rgba(0, 255, 204, 0.16)",
              boxShadow:
                "inset 0 0 48px rgba(0, 255, 204, 0.05), 0 0 56px rgba(0, 0, 0, 0.45)",
            }}
          />
          <div style={{ position: "relative", textAlign: "center", color: "#fff" }}>
            <span
              style={{
                fontFamily: LOADING_FIGURE_FONT,
                fontSize: "clamp(3rem, 8vw, 4.5rem)",
                fontWeight: 500,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.03em",
                lineHeight: 1,
                textShadow: "0 2px 16px rgba(0,0,0,0.75)",
              }}
            >
              {clamped}
              <span style={{ marginLeft: "0.2rem", fontSize: "0.45em", fontWeight: 700 }}>%</span>
            </span>
          </div>
        </div>

        <p
          aria-hidden
          style={{
            margin: "1.75rem 0 0",
            minHeight: "4.8rem",
            width: "100%",
            textAlign: "center",
            fontFamily: LOADING_PROSE_FONT,
            fontSize: "clamp(0.95rem, 2.4vw, 1.125rem)",
            fontWeight: 400,
            lineHeight: 1.65,
            color: "#fff",
            opacity: nameLineOn ? 1 : 0,
            transitionProperty: "opacity",
            transitionTimingFunction: "ease-out",
            transitionDuration: reduceMotion ? "0ms" : `${NAME_LINE_FADE_MS}ms`,
            textShadow: "0 2px 12px rgba(0,0,0,0.8)",
          }}
        >
          {nameLine}
        </p>
        <p
          style={{
            margin: "0.75rem 0 0",
            textAlign: "center",
            fontFamily: LOADING_PROSE_FONT,
            fontSize: "0.95rem",
            fontWeight: 400,
            letterSpacing: "0",
            color: "#cbd5e1",
            textShadow: "0 1px 8px rgba(0,0,0,0.85)",
          }}
        >
          {waitingForMap ? "지도를 그리고 있습니다…" : "잠시만 기다려 주세요"}
        </p>
      </div>
    </div>
  );
}
