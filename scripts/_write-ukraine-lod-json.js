const fs = require("fs");

function close(ring) {
  const a = ring[0];
  const b = ring[ring.length - 1];
  if (a[0] !== b[0] || a[1] !== b[1]) ring.push([...a]);
  return ring;
}

function ok(lng, lat) {
  return lng >= 22 && lng <= 42 && lat >= 44 && lat <= 53;
}

function validate(fc, label) {
  let n = 0;
  for (const f of fc.features) {
    const g = f.geometry;
    const walk = (c) => {
      if (typeof c[0] === "number") {
        const [lng, lat] = c;
        if (!ok(lng, lat)) throw new Error(`${label} OOB ${lng},${lat} ${f.id}`);
        n += 1;
        return;
      }
      c.forEach(walk);
    };
    walk(g.coordinates);
    if (g.type === "Polygon") {
      const ring = g.coordinates[0];
      const a = ring[0];
      const b = ring[ring.length - 1];
      if (a[0] !== b[0] || a[1] !== b[1]) throw new Error(`${label} not closed ${f.id}`);
    }
  }
  console.log(label, "features", fc.features.length, "coords", n, "OK");
}

const macro = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: "seed-donbas",
      properties: {
        role: "ru-occupied",
        tier: "macro",
        fill: "#b91c1c",
        stroke: "#fecaca",
        fillOpacity: 0.36,
      },
      geometry: {
        type: "Polygon",
        coordinates: [close([
          [36.2, 47.2],
          [38.6, 47.2],
          [38.6, 49.1],
          [36.2, 49.1],
        ])],
      },
    },
    {
      type: "Feature",
      id: "seed-zaporizhzhia",
      properties: {
        role: "ru-occupied",
        tier: "macro",
        fill: "#b91c1c",
        stroke: "#fecaca",
        fillOpacity: 0.36,
      },
      geometry: {
        type: "Polygon",
        coordinates: [close([
          [34.6, 46.4],
          [36.8, 46.4],
          [36.8, 47.6],
          [34.6, 47.6],
        ])],
      },
    },
    {
      type: "Feature",
      id: "seed-kherson",
      properties: {
        role: "ru-claimed",
        tier: "macro",
        fill: "#ea580c",
        stroke: "#fed7aa",
        fillOpacity: 0.28,
      },
      geometry: {
        type: "Polygon",
        coordinates: [close([
          [32.8, 46.2],
          [34.9, 46.2],
          [34.9, 47.1],
          [32.8, 47.1],
        ])],
      },
    },
  ],
};

for (const f of [...macro.features]) {
  if (f.geometry.type !== "Polygon") continue;
  const ring = f.geometry.coordinates[0];
  const lngs = ring.map((c) => c[0]);
  const lats = ring.map((c) => c[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  let hi = 0;
  for (let t = minLng - (maxLat - minLat); t <= maxLng; t += 0.2) {
    const a = [Math.max(minLng, t), minLat];
    const b = [Math.min(maxLng, t + (maxLat - minLat)), maxLat];
    macro.features.push({
      type: "Feature",
      id: `${f.id}-hatch-${hi++}`,
      properties: { role: "hatch", tier: "macro", stroke: "rgba(248,113,113,0.5)" },
      geometry: { type: "LineString", coordinates: [a, b] },
    });
  }
}

const micro = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: "micro-axis-ru-defense",
      properties: { role: "defense-line", tier: "micro", name: "RU defense", stroke: "#f87171" },
      geometry: {
        type: "LineString",
        coordinates: [
          [35.3, 47.45],
          [35.7, 47.38],
          [36.1, 47.35],
          [36.5, 47.42],
        ],
      },
    },
    {
      type: "Feature",
      id: "micro-advance-ua",
      properties: { role: "advance", tier: "micro", name: "UA Verbove", stroke: "#38bdf8" },
      geometry: {
        type: "LineString",
        coordinates: [
          [35.55, 47.72],
          [35.68, 47.58],
          [35.78, 47.48],
          [35.9, 47.4],
        ],
      },
    },
    {
      type: "Feature",
      id: "micro-advance-poly",
      properties: {
        role: "ru-claimed",
        tier: "micro",
        fill: "#f97316",
        stroke: "#fed7aa",
        fillOpacity: 0.45,
      },
      geometry: {
        type: "Polygon",
        coordinates: [close([
          [37.05, 48.22],
          [37.28, 48.22],
          [37.28, 48.38],
          [37.05, 48.38],
        ])],
      },
    },
    {
      type: "Feature",
      id: "micro-combat-pt-pokrovsk",
      properties: { role: "combat-ring", tier: "micro", name: "Pokrovsk", fill: "#22c55e" },
      geometry: { type: "Point", coordinates: [37.18, 48.28] },
    },
    {
      type: "Feature",
      id: "micro-combat-pt-chasiw",
      properties: { role: "combat-ring", tier: "micro", name: "Chasiv Yar", fill: "#22c55e" },
      geometry: { type: "Point", coordinates: [37.84, 48.59] },
    },
    {
      type: "Feature",
      id: "micro-combat-pt-kupiansk",
      properties: { role: "combat-ring", tier: "micro", name: "Kupiansk", fill: "#22c55e" },
      geometry: { type: "Point", coordinates: [37.62, 49.72] },
    },
  ],
};

validate(macro, "macro");
validate(micro, "micro");
fs.mkdirSync("public/data", { recursive: true });
fs.writeFileSync("public/data/ukraine-macro.json", JSON.stringify(macro));
fs.writeFileSync("public/data/ukraine-micro.json", JSON.stringify(micro));
fs.mkdirSync("public/data/lite", { recursive: true });
fs.writeFileSync("public/data/lite/ukraine-macro.json", JSON.stringify(macro));
fs.writeFileSync("public/data/lite/ukraine-micro.json", JSON.stringify(micro));
fs.mkdirSync("public/data/full", { recursive: true });
fs.writeFileSync("public/data/full/ukraine-macro.json", JSON.stringify(macro));
fs.writeFileSync("public/data/full/ukraine-micro.json", JSON.stringify(micro));
console.log("wrote ukraine-macro/micro json");
