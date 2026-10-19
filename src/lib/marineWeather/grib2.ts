/**
 * 최소 GRIB2 디코더 — Cloudflare Worker 안에서 NOAA GFS-Wave 한 필드를 풀기 위한 것.
 *
 * 지원 범위(필요한 것만):
 *  - 격자 템플릿 3.0 (정규 위경도)
 *  - 자료 표현 템플릿 5.0 (단순 패킹) · 5.2 (복합 패킹) · 5.3 (복합 + 공간 차분 1·2차)
 *  - 비트맵(섹션 6) 있음/없음/이전 정의 재사용, 복합 패킹의 결측값 관리 1·2
 * 그 밖(JPEG2000 5.40, PNG 5.41, 회전·가우스 격자 등)은 명확한 에러로 끝낸다 — 조용히 틀린 값을 내지 않는다.
 *
 * 검증: `grib2.test.ts` 가 ecCodes 로 만든 픽스처를 ecCodes 디코딩 결과와 대조한다.
 */

export type LatLonGrid = {
  ni: number;
  nj: number;
  /** 첫 격자점 위도·경도 (도) */
  la1: number;
  lo1: number;
  la2: number;
  lo2: number;
  /** 증분 (도, 항상 양수) */
  di: number;
  dj: number;
  scanMode: number;
};

export type Grib2Field = {
  grid: LatLonGrid;
  drsTemplate: number;
  /** 길이 ni*nj, 격자 저장 순서 그대로. 결측(육지 등)은 NaN */
  values: Float32Array;
  /** 참조 시각 (섹션 1, UTC ISO) */
  refTime: string;
};

class BitReader {
  private readonly buf: Uint8Array;
  private bytePos: number;
  private bitPos = 0;
  constructor(buf: Uint8Array, start: number) {
    this.buf = buf;
    this.bytePos = start;
  }
  read(nbits: number): number {
    let v = 0;
    for (let n = nbits; n > 0; ) {
      const byte = this.buf[this.bytePos];
      if (byte === undefined) throw new Error("GRIB2: data section truncated");
      const avail = 8 - this.bitPos;
      const take = Math.min(avail, n);
      const shift = avail - take;
      const bits = (byte >> shift) & ((1 << take) - 1);
      v = v * (1 << take) + bits;
      n -= take;
      this.bitPos += take;
      if (this.bitPos === 8) {
        this.bitPos = 0;
        this.bytePos++;
      }
    }
    return v;
  }
  alignByte(): void {
    if (this.bitPos !== 0) {
      this.bitPos = 0;
      this.bytePos++;
    }
  }
}

const u8 = (b: Uint8Array, o: number) => b[o];
const u16 = (b: Uint8Array, o: number) => (b[o] << 8) | b[o + 1];
const u32 = (b: Uint8Array, o: number) => b[o] * 0x1000000 + ((b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]);
/** GRIB 부호-크기(sign-magnitude) 정수 */
const s16 = (b: Uint8Array, o: number) => {
  const v = u16(b, o);
  return v & 0x8000 ? -(v & 0x7fff) : v;
};
const s32 = (b: Uint8Array, o: number) => {
  const v = u32(b, o);
  return v >= 0x80000000 ? -(v - 0x80000000) : v;
};
const f32 = (b: Uint8Array, o: number) => new DataView(b.buffer, b.byteOffset + o, 4).getFloat32(0, false);
/** n 바이트 부호-크기 정수 (복합 패킹 섹션 7 앞머리 ival1·ival2·minsd) */
function sN(b: Uint8Array, o: number, n: number): number {
  let v = b[o] & 0x7f;
  for (let i = 1; i < n; i++) v = v * 256 + b[o + i];
  return b[o] & 0x80 ? -v : v;
}

type Drs = {
  template: number;
  nPacked: number;
  ref: number;
  e: number;
  d: number;
  nbits: number;
  // 5.2/5.3
  missingMgmt?: number;
  ng?: number;
  widthRef?: number;
  widthBits?: number;
  lenRef?: number;
  lenInc?: number;
  lastLen?: number;
  lenBits?: number;
  sdOrder?: number;
  sdOctets?: number;
};

function parseGrid(b: Uint8Array, s: number): { grid: LatLonGrid; nPoints: number } {
  const nPoints = u32(b, s + 6);
  const tmpl = u16(b, s + 12);
  if (tmpl !== 0) throw new Error(`GRIB2: grid template 3.${tmpl} not supported (lat/lon 3.0 only)`);
  const t = s + 14; // 템플릿 3.0 시작 (옥텟 15)
  const ni = u32(b, t + 16);
  const nj = u32(b, t + 20);
  const basic = u32(b, t + 24);
  const sub = u32(b, t + 28);
  const unit = basic === 0 || basic === 0xffffffff || sub === 0xffffffff || sub === 0 ? 1e-6 : basic / sub;
  const grid: LatLonGrid = {
    ni,
    nj,
    la1: s32(b, t + 32) * unit,
    lo1: s32(b, t + 36) * unit,
    la2: s32(b, t + 41) * unit,
    lo2: s32(b, t + 45) * unit,
    di: u32(b, t + 49) * unit,
    dj: u32(b, t + 53) * unit,
    scanMode: u8(b, t + 57),
  };
  if (ni * nj !== nPoints) throw new Error(`GRIB2: ni*nj (${ni}x${nj}) != numberOfDataPoints ${nPoints}`);
  if (grid.scanMode & 0x30) throw new Error(`GRIB2: scanning mode ${grid.scanMode} not supported`);
  return { grid, nPoints };
}

function parseDrs(b: Uint8Array, s: number): Drs {
  const nPacked = u32(b, s + 5);
  const template = u16(b, s + 9);
  if (template !== 0 && template !== 2 && template !== 3) {
    throw new Error(`GRIB2: data representation template 5.${template} not supported (5.0/5.2/5.3 only)`);
  }
  const drs: Drs = {
    template,
    nPacked,
    ref: f32(b, s + 11),
    e: s16(b, s + 15),
    d: s16(b, s + 17),
    nbits: u8(b, s + 19),
  };
  if (template === 0) return drs;
  drs.missingMgmt = u8(b, s + 22);
  drs.ng = u32(b, s + 31);
  drs.widthRef = u8(b, s + 35);
  drs.widthBits = u8(b, s + 36);
  drs.lenRef = u32(b, s + 37);
  drs.lenInc = u8(b, s + 41);
  drs.lastLen = u32(b, s + 42);
  drs.lenBits = u8(b, s + 46);
  if (template === 3) {
    drs.sdOrder = u8(b, s + 47);
    drs.sdOctets = u8(b, s + 48);
    if (drs.sdOrder !== 1 && drs.sdOrder !== 2) throw new Error(`GRIB2: spatial differencing order ${drs.sdOrder}`);
  }
  return drs;
}

/** 패킹된 정수 → 실제 값. 결측은 NaN. 반환 길이 = nPacked */
function unpack(b: Uint8Array, dataStart: number, dataEnd: number, drs: Drs): Float64Array {
  const n = drs.nPacked;
  const out = new Float64Array(n);
  const bscale = Math.pow(2, drs.e);
  const dscale = Math.pow(10, -drs.d);

  if (drs.template === 0) {
    if (drs.nbits === 0) return out.fill(drs.ref * dscale);
    const br = new BitReader(b, dataStart);
    for (let i = 0; i < n; i++) out[i] = (drs.ref + br.read(drs.nbits) * bscale) * dscale;
    return out;
  }

  const ng = drs.ng!;
  const mm = drs.missingMgmt ?? 0;
  let pos = dataStart;
  let ival1 = 0;
  let ival2 = 0;
  let minsd = 0;
  if (drs.template === 3) {
    const k = drs.sdOctets!;
    if (k > 0) {
      ival1 = sN(b, pos, k);
      pos += k;
      if (drs.sdOrder === 2) {
        ival2 = sN(b, pos, k);
        pos += k;
      }
      minsd = sN(b, pos, k);
      pos += k;
    }
  }

  const br = new BitReader(b, pos);
  const gref = new Array<number>(ng);
  for (let i = 0; i < ng; i++) gref[i] = drs.nbits ? br.read(drs.nbits) : 0;
  br.alignByte();
  const gwidth = new Array<number>(ng);
  for (let i = 0; i < ng; i++) gwidth[i] = drs.widthRef! + (drs.widthBits ? br.read(drs.widthBits) : 0);
  br.alignByte();
  const glen = new Array<number>(ng);
  for (let i = 0; i < ng; i++) glen[i] = drs.lenRef! + (drs.lenBits ? br.read(drs.lenBits) : 0) * drs.lenInc!;
  br.alignByte();
  if (ng > 0) glen[ng - 1] = drs.lastLen!;

  let total = 0;
  for (const l of glen) total += l;
  if (total !== n) throw new Error(`GRIB2: group lengths sum ${total} != packed points ${n}`);

  // 정수 단계 (결측은 별도 표시)
  const ival = new Float64Array(n);
  const miss = new Uint8Array(n);
  const refAllOnes = drs.nbits ? Math.pow(2, drs.nbits) - 1 : -1;
  let k = 0;
  for (let g = 0; g < ng; g++) {
    const w = gwidth[g];
    const r = gref[g];
    const len = glen[g];
    if (w === 0) {
      const m1 = mm >= 1 && r === refAllOnes;
      const m2 = mm === 2 && r === refAllOnes - 1;
      for (let i = 0; i < len; i++, k++) {
        if (m1 || m2) miss[k] = 1;
        else ival[k] = r;
      }
    } else {
      const ones = Math.pow(2, w) - 1;
      for (let i = 0; i < len; i++, k++) {
        const v = br.read(w);
        if ((mm >= 1 && v === ones) || (mm === 2 && v === ones - 1)) miss[k] = 1;
        else ival[k] = v + r;
      }
    }
  }
  if (pos > dataEnd) throw new Error("GRIB2: data section overrun");

  // 공간 차분 복원 — 결측이 아닌 값들의 순서열에만 적용
  if (drs.template === 3) {
    const order = drs.sdOrder!;
    let cnt = 0;
    let p1 = 0; // 직전
    let p2 = 0; // 전전
    for (let i = 0; i < n; i++) {
      if (miss[i]) continue;
      let v: number;
      if (cnt === 0) v = ival1;
      else if (cnt === 1 && order === 2) v = ival2;
      else if (order === 1) v = ival[i] + minsd + p1;
      else v = ival[i] + minsd + 2 * p1 - p2;
      ival[i] = v;
      p2 = p1;
      p1 = v;
      cnt++;
    }
  }

  for (let i = 0; i < n; i++) out[i] = miss[i] ? NaN : (drs.ref + ival[i] * bscale) * dscale;
  return out;
}

/** GRIB2 메시지 하나(바이트 범위로 잘라온 것)를 푼다. 버퍼에 여러 개면 첫 번째만. */
export function decodeGrib2Message(buf: Uint8Array): Grib2Field {
  if (buf.length < 16 || String.fromCharCode(buf[0], buf[1], buf[2], buf[3]) !== "GRIB") {
    throw new Error("GRIB2: missing GRIB header");
  }
  if (buf[7] !== 2) throw new Error(`GRIB2: edition ${buf[7]} (only 2)`);
  const totalLen = u32(buf, 8) * 0x100000000 + u32(buf, 12);
  if (totalLen > buf.length) throw new Error(`GRIB2: message truncated (${buf.length}/${totalLen} bytes)`);

  let pos = 16;
  let grid: LatLonGrid | null = null;
  let nPoints = 0;
  let drs: Drs | null = null;
  let bitmap: Uint8Array | null = null;
  let refTime = "";
  let values: Float32Array | null = null;

  while (pos < totalLen - 4) {
    const len = u32(buf, pos);
    const num = buf[pos + 4];
    if (len < 5) throw new Error("GRIB2: bad section length");
    if (num === 1) {
      const y = u16(buf, pos + 12);
      const p2 = (x: number) => String(x).padStart(2, "0");
      refTime = `${y}-${p2(buf[pos + 14])}-${p2(buf[pos + 15])}T${p2(buf[pos + 16])}:${p2(buf[pos + 17])}:${p2(buf[pos + 18])}Z`;
    } else if (num === 3) {
      ({ grid, nPoints } = parseGrid(buf, pos));
    } else if (num === 5) {
      drs = parseDrs(buf, pos);
    } else if (num === 6) {
      const ind = buf[pos + 5];
      if (ind === 0) {
        bitmap = new Uint8Array(nPoints);
        const br = new BitReader(buf, pos + 6);
        for (let i = 0; i < nPoints; i++) bitmap[i] = br.read(1);
      } else if (ind === 255) {
        bitmap = null;
      } else if (ind !== 254) {
        throw new Error(`GRIB2: predefined bitmap ${ind} not supported`);
      }
    } else if (num === 7) {
      if (!grid || !drs) throw new Error("GRIB2: data section before grid/DRS");
      const packed = unpack(buf, pos + 5, pos + len, drs);
      const v = new Float32Array(nPoints);
      if (bitmap) {
        let k = 0;
        for (let i = 0; i < nPoints; i++) v[i] = bitmap[i] ? packed[k++] : NaN;
        if (k !== drs.nPacked) throw new Error(`GRIB2: bitmap count ${k} != packed ${drs.nPacked}`);
      } else {
        if (drs.nPacked !== nPoints) throw new Error("GRIB2: packed count != grid points without bitmap");
        v.set(packed);
      }
      values = v;
      break; // 첫 필드만
    }
    pos += len;
  }
  if (!grid || !drs || !values) throw new Error("GRIB2: incomplete message");
  return { grid, drsTemplate: drs.template, values, refTime };
}

const norm360 = (x: number) => ((x % 360) + 360) % 360;

/** 위경도 → 가장 가까운 격자 (i, j). 격자 밖이면 null */
export function nearestIndex(grid: LatLonGrid, lat: number, lng: number): { i: number; j: number } | null {
  const iNeg = (grid.scanMode & 0x80) !== 0;
  const jPos = (grid.scanMode & 0x40) !== 0;
  const dLon = norm360(iNeg ? grid.lo1 - lng : lng - grid.lo1);
  let i = Math.round(dLon / grid.di);
  const globalLon = Math.round((360 / grid.di) * 1000) === grid.ni * 1000;
  if (globalLon) i %= grid.ni;
  const j = Math.round((jPos ? lat - grid.la1 : grid.la1 - lat) / grid.dj);
  if (i < 0 || i >= grid.ni || j < 0 || j >= grid.nj) return null;
  return { i, j };
}

export function gridLatLng(grid: LatLonGrid, i: number, j: number): { lat: number; lng: number } {
  const iNeg = (grid.scanMode & 0x80) !== 0;
  const jPos = (grid.scanMode & 0x40) !== 0;
  const lng = norm360(grid.lo1 + (iNeg ? -i : i) * grid.di);
  const lat = grid.la1 + (jPos ? j : -j) * grid.dj;
  return { lat: Math.round(lat * 1e4) / 1e4, lng: Math.round((lng > 180 ? lng - 360 : lng) * 1e4) / 1e4 };
}

/**
 * 가장 가까운 격자값. 그 점이 결측(육지·해빙)이면 반경 `searchCells` 칸 안에서 가장 가까운 바다 격자를 찾는다.
 * 해협처럼 폭이 격자보다 좁은 곳에서 필요하다. 끝내 못 찾으면 null.
 */
export function sampleNearest(
  field: Pick<Grib2Field, "grid" | "values">,
  lat: number,
  lng: number,
  searchCells = 2,
): { value: number; lat: number; lng: number; offsetCells: number } | null {
  const { grid, values } = field;
  const c = nearestIndex(grid, lat, lng);
  if (!c) return null;
  const globalLon = Math.round((360 / grid.di) * 1000) === grid.ni * 1000;
  let best: { value: number; i: number; j: number; d: number } | null = null;
  for (let dj = -searchCells; dj <= searchCells; dj++) {
    for (let di = -searchCells; di <= searchCells; di++) {
      let i = c.i + di;
      const j = c.j + dj;
      if (j < 0 || j >= grid.nj) continue;
      if (globalLon) i = (i + grid.ni) % grid.ni;
      else if (i < 0 || i >= grid.ni) continue;
      const v = values[j * grid.ni + i];
      if (!Number.isFinite(v)) continue;
      const d = di * di + dj * dj;
      if (!best || d < best.d) best = { value: v, i, j, d };
    }
  }
  if (!best) return null;
  const ll = gridLatLng(grid, best.i, best.j);
  return { value: best.value, lat: ll.lat, lng: ll.lng, offsetCells: Math.round(Math.sqrt(best.d) * 10) / 10 };
}
