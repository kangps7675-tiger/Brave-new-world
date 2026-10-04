/**
 * Cesium 관측 — GIBS 운량 텍스처를 레이마칭하는 풀 볼륨 구름.
 * 외곽 타원체 표면에서 시선 방향으로 운층(inner~outer)을 샘플링한다.
 */

type CesiumNS = typeof import("cesium");

/** 운층 바닥·꼭대기 (궤도에서 두께가 읽히도록 약간 과장) */
export const CLOUD_VOLUME_BOTTOM_M = 28_000;
export const CLOUD_VOLUME_TOP_M = 110_000;

/** 레이마칭 스텝 — 품질/성능 타협 */
export const CLOUD_VOLUME_STEPS = 36;

/** 밀도·밝기 — dt(m)와 곱해 Beer-Lambert에 들어감 */
export const CLOUD_VOLUME_DENSITY = 0.000055;
export const CLOUD_VOLUME_BRIGHTNESS = 1.18;

export type VolumetricCloudHandle = {
  primitive: import("cesium").Primitive;
  setOpacity: (opacity: number) => void;
  setSpinAngle: (radians: number) => void;
  destroy: () => void;
};

/**
 * Material fabric 소스 — 표면 셰이딩이 아니라 시선 레이마칭.
 * materialInput.positionToEyeEC 로 월드 위치를 복원한다.
 */
export function volumetricCloudMaterialSource(): string {
  return `
uniform sampler2D cloudMap;
uniform float innerRadius;
uniform float outerRadius;
uniform float densityMul;
uniform float opacity;
uniform float spinAngle;
uniform float fluffScale;

const int CLOUD_STEPS = ${CLOUD_VOLUME_STEPS};

float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash13(i);
  float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);
  float nxy0 = mix(nx00, nx10, f.y);
  float nxy1 = mix(nx01, nx11, f.y);
  return mix(nxy0, nxy1, f.z);
}

float fbm(vec3 p) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < 4; i++) {
    s += a * noise3(p);
    p = p * 2.02 + 17.1;
    a *= 0.5;
  }
  return s;
}

bool intersectSphere(vec3 ro, vec3 rd, float radius, out float tNear, out float tFar) {
  float b = dot(ro, rd);
  float c = dot(ro, ro) - radius * radius;
  float h = b * b - c;
  if (h < 0.0) return false;
  h = sqrt(h);
  tNear = -b - h;
  tFar = -b + h;
  return tFar > 0.0;
}

vec2 sphereUv(vec3 p) {
  vec3 n = normalize(p);
  float c = cos(spinAngle);
  float s = sin(spinAngle);
  vec3 r = vec3(c * n.x + s * n.z, n.y, -s * n.x + c * n.z);
  float u = atan(r.x, r.z) * 0.15915494309 + 0.5;
  float v = asin(clamp(r.y, -1.0, 1.0)) * 0.31830988618 + 0.5;
  return vec2(fract(u), clamp(v, 0.0, 1.0));
}

float cloudDensity(vec3 p) {
  float h = length(p);
  float alt = (h - innerRadius) / max(1.0, outerRadius - innerRadius);
  if (alt < 0.0 || alt > 1.0) return 0.0;
  // 중간 고도가 두껍고 상·하층은 얇게
  float profile = smoothstep(0.0, 0.18, alt) * smoothstep(1.0, 0.42, alt);
  profile *= mix(0.65, 1.2, smoothstep(0.15, 0.55, alt));

  vec2 uv = sphereUv(p);
  float coverage = texture2D(cloudMap, uv).a;
  if (coverage < 0.02) return 0.0;

  // 수직 방향 노이즈로 뭉게구름 두께
  float n = fbm(p * (fluffScale / max(1.0, outerRadius)) * 18.0 + vec3(0.0, alt * 6.0, 0.0));
  float fluff = mix(0.35, 1.35, n);
  float edge = smoothstep(0.08, 0.55, coverage);
  return coverage * profile * fluff * edge * densityMul;
}

czm_material czm_getMaterial(czm_materialInput materialInput) {
  czm_material material = czm_getDefaultMaterial(materialInput);

  vec3 eyeWC = czm_viewerPositionWC;
  vec3 fragEC = -materialInput.positionToEyeEC;
  vec3 fragWC = (czm_inverseView * vec4(fragEC, 1.0)).xyz;
  vec3 rd = normalize(fragWC - eyeWC);
  vec3 ro = eyeWC;

  float tOut0, tOut1, tIn0, tIn1;
  if (!intersectSphere(ro, rd, outerRadius, tOut0, tOut1)) {
    material.alpha = 0.0;
    return material;
  }

  float tStart = max(tOut0, 0.0);
  float tEnd = tOut1;

  if (intersectSphere(ro, rd, innerRadius, tIn0, tIn1)) {
    // 시선이 지구/내권을 뚫으면 운층 구간만 자른다
    if (tIn0 > tStart) {
      tEnd = min(tEnd, tIn0);
    } else if (tIn1 > tStart) {
      tStart = max(tStart, tIn1);
    }
  }

  if (tEnd <= tStart) {
    material.alpha = 0.0;
    return material;
  }

  float dt = (tEnd - tStart) / float(CLOUD_STEPS);
  float t = tStart + dt * 0.5;
  float transmittance = 1.0;
  vec3 scatter = vec3(0.0);
  vec3 sunDir = normalize(vec3(0.35, 0.78, 0.42));

  for (int i = 0; i < CLOUD_STEPS; i++) {
    vec3 p = ro + rd * t;
    float d = cloudDensity(p);
    if (d > 1e-6) {
      // Beer-Lambert + 약한 전방 산란(흰색)
      float absorb = 1.0 - exp(-d * dt);
      float light = 0.72 + 0.28 * max(0.0, dot(normalize(p), sunDir));
      vec3 col = vec3(0.96, 0.98, 1.0) * light * ${CLOUD_VOLUME_BRIGHTNESS.toFixed(2)};
      scatter += transmittance * absorb * col;
      transmittance *= (1.0 - absorb * 0.92);
      if (transmittance < 0.03) break;
    }
    t += dt;
  }

  float alpha = clamp((1.0 - transmittance) * opacity, 0.0, 1.0);
  material.diffuse = scatter / max(alpha, 0.08);
  material.emission = scatter * 0.08;
  material.alpha = alpha;
  return material;
}
`;
}

export function createVolumetricCloudMaterial(
  Cesium: CesiumNS,
  cloudMap: string,
  opts?: { opacity?: number; densityMul?: number },
): import("cesium").Material {
  const baseR = Cesium.Ellipsoid.WGS84.maximumRadius;
  const typeName = `ObserveVolumetricClouds_${Math.random().toString(36).slice(2, 9)}`;
  return new Cesium.Material({
    fabric: {
      type: typeName,
      uniforms: {
        cloudMap,
        innerRadius: baseR + CLOUD_VOLUME_BOTTOM_M,
        outerRadius: baseR + CLOUD_VOLUME_TOP_M,
        densityMul: opts?.densityMul ?? CLOUD_VOLUME_DENSITY,
        opacity: opts?.opacity ?? 0.85,
        spinAngle: 0,
        fluffScale: 1.0,
      },
      source: volumetricCloudMaterialSource(),
    },
    translucent: true,
  });
}

export function attachVolumetricCloudPrimitive(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
  cloudMap: string,
  opts?: { opacity?: number },
): VolumetricCloudHandle {
  const baseR = Cesium.Ellipsoid.WGS84.maximumRadius;
  const outerR = baseR + CLOUD_VOLUME_TOP_M;
  const material = createVolumetricCloudMaterial(Cesium, cloudMap, {
    opacity: opts?.opacity ?? 0.85,
  });

  const appearance = new Cesium.MaterialAppearance({
    material,
    translucent: true,
    closed: true,
    faceForward: false,
    flat: true,
    renderState: {
      depthMask: false,
      depthTest: { enabled: true },
      cull: {
        enabled: true,
        face: Cesium.CullFace.BACK,
      },
      blending: {
        enabled: true,
        equationRgb: Cesium.BlendEquation.ADD,
        equationAlpha: Cesium.BlendEquation.ADD,
        functionSourceRgb: Cesium.BlendFunction.SOURCE_ALPHA,
        functionDestinationRgb: Cesium.BlendFunction.ONE_MINUS_SOURCE_ALPHA,
        functionSourceAlpha: Cesium.BlendFunction.ONE,
        functionDestinationAlpha: Cesium.BlendFunction.ONE_MINUS_SOURCE_ALPHA,
      },
    },
  });

  const primitive = viewer.scene.primitives.add(
    new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: new Cesium.EllipsoidGeometry({
          radii: new Cesium.Cartesian3(outerR, outerR, outerR),
          vertexFormat:
            Cesium.MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat,
          stackPartitions: 64,
          slicePartitions: 128,
        }),
      }),
      appearance,
      asynchronous: false,
      allowPicking: false,
      modelMatrix: Cesium.Matrix4.IDENTITY.clone(),
    }),
  );

  return {
    primitive,
    setOpacity: (opacity: number) => {
      const u = material.uniforms as { opacity?: number };
      if (typeof u.opacity === "number") u.opacity = opacity;
      primitive.show = opacity > 0.02;
    },
    setSpinAngle: (radians: number) => {
      const u = material.uniforms as { spinAngle?: number };
      if (typeof u.spinAngle === "number") u.spinAngle = radians;
    },
    destroy: () => {
      try {
        if (!viewer.isDestroyed()) viewer.scene.primitives.remove(primitive);
      } catch {
        /* ignore */
      }
      try {
        material.destroy();
      } catch {
        /* ignore */
      }
    },
  };
}
