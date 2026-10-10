/**
 * NEPTUN 위협용 최소 glTF 2.0 (Y-up, 기수=+X).
 * 외부 .glb 없이 data URI로 Cesium ModelGraphics에 붙인다.
 */

export type NeptunGltfKind = "shahed" | "glide" | "iskander" | "cruise" | "jet";

type Vec3 = [number, number, number];

function packF32(values: number[]): Uint8Array {
  const buf = new ArrayBuffer(values.length * 4);
  new Float32Array(buf).set(values);
  return new Uint8Array(buf);
}

function packU16(values: number[]): Uint8Array {
  const buf = new ArrayBuffer(values.length * 2);
  new Uint16Array(buf).set(values);
  return new Uint8Array(buf);
}

function b64(bytes: Uint8Array): string {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(s);
}

/** 축정렬 박스 — 중심·반치수, 삼각형 인덱스로 추가 */
function pushBox(
  positions: number[],
  normals: number[],
  indices: number[],
  center: Vec3,
  half: Vec3,
): void {
  const [cx, cy, cz] = center;
  const [hx, hy, hz] = half;
  const base = positions.length / 3;
  const corners: Vec3[] = [
    [cx - hx, cy - hy, cz - hz],
    [cx + hx, cy - hy, cz - hz],
    [cx + hx, cy + hy, cz - hz],
    [cx - hx, cy + hy, cz - hz],
    [cx - hx, cy - hy, cz + hz],
    [cx + hx, cy - hy, cz + hz],
    [cx + hx, cy + hy, cz + hz],
    [cx - hx, cy + hy, cz + hz],
  ];
  // 6 faces × 4 verts (flat normals)
  const faces: Array<{ vi: number[]; n: Vec3 }> = [
    { vi: [0, 1, 2, 3], n: [0, 0, -1] },
    { vi: [5, 4, 7, 6], n: [0, 0, 1] },
    { vi: [4, 0, 3, 7], n: [-1, 0, 0] },
    { vi: [1, 5, 6, 2], n: [1, 0, 0] },
    { vi: [3, 2, 6, 7], n: [0, 1, 0] },
    { vi: [4, 5, 1, 0], n: [0, -1, 0] },
  ];
  for (const face of faces) {
    const v0 = positions.length / 3;
    for (const i of face.vi) {
      const c = corners[i];
      positions.push(c[0], c[1], c[2]);
      normals.push(face.n[0], face.n[1], face.n[2]);
    }
    indices.push(v0, v0 + 1, v0 + 2, v0, v0 + 2, v0 + 3);
  }
  void base;
}

function pushPyramid(
  positions: number[],
  normals: number[],
  indices: number[],
  tip: Vec3,
  baseCenter: Vec3,
  halfY: number,
  halfZ: number,
): void {
  // 기수 쪽 사각뿔 (tip → +X)
  const [bx, by, bz] = baseCenter;
  const corners: Vec3[] = [
    tip,
    [bx, by - halfY, bz - halfZ],
    [bx, by + halfY, bz - halfZ],
    [bx, by + halfY, bz + halfZ],
    [bx, by - halfY, bz + halfZ],
  ];
  const tris = [
    [0, 1, 2],
    [0, 2, 3],
    [0, 3, 4],
    [0, 4, 1],
    [1, 4, 3],
    [1, 3, 2],
  ];
  for (const tri of tris) {
    const v0 = positions.length / 3;
    const a = corners[tri[0]];
    const b = corners[tri[1]];
    const c = corners[tri[2]];
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const uz = b[2] - a[2];
    const vx = c[0] - a[0];
    const vy = c[1] - a[1];
    const vz = c[2] - a[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    for (const p of [a, b, c]) {
      positions.push(p[0], p[1], p[2]);
      normals.push(nx, ny, nz);
    }
    indices.push(v0, v0 + 1, v0 + 2);
  }
}

function meshToGltfDataUri(
  positions: number[],
  normals: number[],
  indices: number[],
  color: [number, number, number, number],
): string {
  const posBytes = packF32(positions);
  const norBytes = packF32(normals);
  const idxBytes = packU16(indices);
  const pad = (n: number) => (4 - (n % 4)) % 4;
  const posPad = pad(posBytes.length);
  const norPad = pad(norBytes.length);
  const idxPad = pad(idxBytes.length);

  const posOffset = 0;
  const norOffset = posBytes.length + posPad;
  const idxOffset = norOffset + norBytes.length + norPad;
  const total = idxOffset + idxBytes.length + idxPad;

  const bin = new Uint8Array(total);
  bin.set(posBytes, posOffset);
  bin.set(norBytes, norOffset);
  bin.set(idxBytes, idxOffset);

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    minX = Math.min(minX, positions[i]);
    minY = Math.min(minY, positions[i + 1]);
    minZ = Math.min(minZ, positions[i + 2]);
    maxX = Math.max(maxX, positions[i]);
    maxY = Math.max(maxY, positions[i + 1]);
    maxZ = Math.max(maxZ, positions[i + 2]);
  }

  const gltf = {
    asset: { version: "2.0", generator: "bnw-neptun-gltf" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [
      {
        primitives: [
          {
            attributes: { POSITION: 0, NORMAL: 1 },
            indices: 2,
            material: 0,
            mode: 4,
          },
        ],
      },
    ],
    materials: [
      {
        pbrMetallicRoughness: {
          baseColorFactor: color,
          metallicFactor: 0.25,
          roughnessFactor: 0.55,
        },
        doubleSided: true,
      },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: positions.length / 3,
        type: "VEC3",
        max: [maxX, maxY, maxZ],
        min: [minX, minY, minZ],
      },
      {
        bufferView: 1,
        componentType: 5126,
        count: normals.length / 3,
        type: "VEC3",
      },
      {
        bufferView: 2,
        componentType: 5123,
        count: indices.length,
        type: "SCALAR",
      },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: posOffset, byteLength: posBytes.length, target: 34962 },
      { buffer: 0, byteOffset: norOffset, byteLength: norBytes.length, target: 34962 },
      { buffer: 0, byteOffset: idxOffset, byteLength: idxBytes.length, target: 34963 },
    ],
    buffers: [
      {
        byteLength: total,
        uri: `data:application/octet-stream;base64,${b64(bin)}`,
      },
    ],
  };

  const json = JSON.stringify(gltf);
  return `data:model/gltf+json;base64,${btoa(json)}`;
}

function buildShahed(): string {
  const p: number[] = [];
  const n: number[] = [];
  const idx: number[] = [];
  // 동체 (기수 +X)
  pushBox(p, n, idx, [0.15, 0, 0], [0.55, 0.07, 0.07]);
  pushPyramid(p, n, idx, [0.95, 0, 0], [0.7, 0, 0], 0.06, 0.06);
  // 삼각익
  pushBox(p, n, idx, [-0.05, 0, 0], [0.22, 0.02, 0.55]);
  // 수직미익
  pushBox(p, n, idx, [-0.35, 0.12, 0], [0.12, 0.14, 0.02]);
  return meshToGltfDataUri(p, n, idx, [0.94, 0.51, 0.06, 1]);
}

function buildGlideBomb(): string {
  const p: number[] = [];
  const n: number[] = [];
  const idx: number[] = [];
  pushBox(p, n, idx, [0.05, 0, 0], [0.45, 0.1, 0.1]);
  pushPyramid(p, n, idx, [0.7, 0, 0], [0.5, 0, 0], 0.09, 0.09);
  // 활공 날개
  pushBox(p, n, idx, [0.0, 0, 0], [0.12, 0.015, 0.48]);
  // 꼬리 핀
  pushBox(p, n, idx, [-0.35, 0.1, 0], [0.08, 0.12, 0.015]);
  pushBox(p, n, idx, [-0.35, 0, 0.1], [0.08, 0.015, 0.12]);
  return meshToGltfDataUri(p, n, idx, [0.85, 0.33, 0.12, 1]);
}

function buildIskander(): string {
  const p: number[] = [];
  const n: number[] = [];
  const idx: number[] = [];
  // 긴 동체
  pushBox(p, n, idx, [0.05, 0, 0], [0.7, 0.08, 0.08]);
  pushPyramid(p, n, idx, [1.0, 0, 0], [0.75, 0, 0], 0.08, 0.08);
  // 후방 X핀
  pushBox(p, n, idx, [-0.55, 0.14, 0], [0.12, 0.16, 0.02]);
  pushBox(p, n, idx, [-0.55, 0, 0.14], [0.12, 0.02, 0.16]);
  pushBox(p, n, idx, [-0.55, -0.1, 0.1], [0.1, 0.1, 0.02]);
  pushBox(p, n, idx, [-0.55, 0.1, -0.1], [0.1, 0.02, 0.1]);
  return meshToGltfDataUri(p, n, idx, [0.7, 0.12, 0.42, 1]);
}

function buildCruise(): string {
  const p: number[] = [];
  const n: number[] = [];
  const idx: number[] = [];
  pushBox(p, n, idx, [0.1, 0, 0], [0.55, 0.06, 0.06]);
  pushPyramid(p, n, idx, [0.85, 0, 0], [0.65, 0, 0], 0.05, 0.05);
  pushBox(p, n, idx, [0.05, 0, 0], [0.15, 0.015, 0.42]);
  pushBox(p, n, idx, [-0.35, 0.1, 0], [0.1, 0.12, 0.015]);
  return meshToGltfDataUri(p, n, idx, [0.89, 0.22, 0.31, 1]);
}

function buildJet(): string {
  const p: number[] = [];
  const n: number[] = [];
  const idx: number[] = [];
  pushBox(p, n, idx, [0.1, 0, 0], [0.5, 0.06, 0.06]);
  pushPyramid(p, n, idx, [0.8, 0, 0], [0.6, 0, 0], 0.05, 0.05);
  pushBox(p, n, idx, [0.0, 0, 0], [0.18, 0.015, 0.55]);
  pushBox(p, n, idx, [-0.3, 0.12, 0], [0.12, 0.14, 0.015]);
  return meshToGltfDataUri(p, n, idx, [0.49, 0.3, 1, 1]);
}

const cache = new Map<NeptunGltfKind, string>();

export function neptunGltfKindForType(type: string): NeptunGltfKind {
  switch (type) {
    case "uav":
    case "recon":
      return "shahed";
    case "kab":
      return "glide";
    case "ballistic":
      return "iskander";
    case "missile":
      return "cruise";
    case "mig31k":
      return "jet";
    default:
      return "shahed";
  }
}

export function neptunGltfDataUri(kind: NeptunGltfKind): string {
  let uri = cache.get(kind);
  if (uri) return uri;
  switch (kind) {
    case "shahed":
      uri = buildShahed();
      break;
    case "glide":
      uri = buildGlideBomb();
      break;
    case "iskander":
      uri = buildIskander();
      break;
    case "cruise":
      uri = buildCruise();
      break;
    case "jet":
      uri = buildJet();
      break;
    default:
      uri = buildShahed();
  }
  cache.set(kind, uri);
  return uri;
}
