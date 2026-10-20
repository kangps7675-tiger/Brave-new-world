// JSON: 탭 들여쓰기 + 항목별 줄바꿈, 콜론 뒤 공백 없음 (JSON.stringify 기본)
const fs = require("fs");

function writeJsonArrayFile(filePath, items) {
  if (items.length === 0) {
    fs.writeFileSync(filePath, "[]\n");
    return;
  }
  const lines = items.map((item) => `\t${JSON.stringify(item)}`);
  fs.writeFileSync(filePath, `[\n${lines.join(",\n")}\n]\n`);
}

function writeJsonObjectFile(filePath, object) {
  fs.writeFileSync(filePath, `${JSON.stringify(object)}\n`);
}

/** 객체 필드는 한 줄, 지정 배열은 항목당 한 줄(탭 들여쓰기) */
function writeJsonObjectWithLineArrays(filePath, object, arrayKeys) {
  const keys = Object.keys(object);
  const lines = ["{"];

  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    const value = object[key];
    const comma = index < keys.length - 1 ? "," : "";

    if (arrayKeys.includes(key) && Array.isArray(value)) {
      lines.push(`\t${JSON.stringify(key)}:[`);
      if (value.length > 0) {
        lines.push(value.map((item) => `\t\t${JSON.stringify(item)}`).join(",\n"));
      }
      lines.push(`\t]${comma}`);
      continue;
    }

    lines.push(`\t${JSON.stringify(key)}:${JSON.stringify(value)}${comma}`);
  }

  lines.push("}\n");
  fs.writeFileSync(filePath, lines.join("\n"));
}

function roundCoord(value, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

/** 도로·철도·해안선 — {i,k?,s?,n?,b,p} */
function compactTransportPath(path, options = {}) {
  const precision = options.precision ?? 2;
  const round = (value) => roundCoord(value, precision);
  const entry = { i: path.id };

  if (path.kind && path.kind !== "coastline") entry.k = path.kind;
  if (path.scalerank != null && path.scalerank > 0 && path.scalerank < 99) {
    entry.s = path.scalerank;
  }
  if (path.name) entry.n = path.name;

  entry.b = [
    round(path.bbox.minLat),
    round(path.bbox.minLng),
    round(path.bbox.maxLat),
    round(path.bbox.maxLng),
  ];
  entry.p = path.points.map((point) => [round(point.lng), round(point.lat)]);

  if (path.meta && typeof path.meta === "object") {
    const meta = omitEmpty(path.meta);
    if (Object.keys(meta).length > 0) entry.m = meta;
  }

  return entry;
}

/** 검색·라벨용 지명 — {id,n,k?,c,la,ln,t,p?,s?,z?,a?} */
function compactPlace(place) {
  const typeCode = {
    city: "c",
    town: "t",
    village: "v",
    country: "C",
    dispute: "d",
  };
  const entry = {
    id: place.id,
    n: place.name,
    c: place.country,
    la: roundCoord(place.lat, 5),
    ln: roundCoord(place.lng, 5),
    t: typeCode[place.type] || place.type,
  };

  if (place.nameKo) entry.k = place.nameKo;
  if (place.population != null && place.population > 0) entry.p = place.population;
  if (place.scalerank != null && place.scalerank !== 10) entry.s = place.scalerank;
  if (place.minZoom != null) entry.z = place.minZoom;
  if (place.adm1) entry.a = place.adm1;

  return entry;
}

/** 정적 POI — {i,k,n,la,ln,s?,m?} */
function compactStaticPoint(point) {
  const entry = {
    i: point.id,
    k: point.kind,
    n: point.name,
    la: roundCoord(point.lat, 4),
    ln: roundCoord(point.lng, 4),
  };
  if (point.tier != null && point.tier > 0) entry.s = point.tier;
  if (point.meta && Object.keys(point.meta).length > 0) entry.m = point.meta;
  return entry;
}

/** null·undefined·빈 문자열 필드 제거 (얕은 객체) */
function omitEmpty(obj) {
  const next = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined || value === "") continue;
    next[key] = value;
  }
  return next;
}

module.exports = {
  writeJsonArrayFile,
  writeJsonObjectFile,
  writeJsonObjectWithLineArrays,
  roundCoord,
  compactTransportPath,
  compactPlace,
  compactStaticPoint,
  omitEmpty,
};
