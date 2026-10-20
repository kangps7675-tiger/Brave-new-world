// 지구본 텍스처 다운로드: node scripts/fetch-textures.js
const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "..", "public", "textures");

const REMOTE = [
  {
    name: "earth-night.jpg",
    url: "https://unpkg.com/three-globe/example/img/earth-night.jpg",
  },
  {
    name: "earth-blue-marble.jpg",
    url: "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
  },
  {
    name: "earth-topology.png",
    url: "https://unpkg.com/three-globe/example/img/earth-topology.png",
  },
  {
    name: "earth-etopo-topo.jpg",
    url: "https://unpkg.com/three-globe/example/img/earth-water.png",
  },
];

async function downloadFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buffer);
}

function writeDarkVectorPng(dest) {
  // Opaque 1×1 #0D0F0C (dark vector-style base).
  // NOTE: the previous base64 was a semi-transparent red pixel (#ff00007f),
  // which made the whole globe appear bright red in vector mode.
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGPg5ef5DwABfQEoBD7zGAAAAABJRU5ErkJggg==",
    "base64",
  );
  fs.writeFileSync(dest, png);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const item of REMOTE) {
    const dest = path.join(OUT_DIR, item.name);
    process.stdout.write(`Downloading ${item.name}... `);
    await downloadFile(item.url, dest);
    console.log("OK");
  }

  writeDarkVectorPng(path.join(OUT_DIR, "earth-dark-vector.png"));
  console.log("Created earth-dark-vector.png");

  const meta = {
    generatedAt: new Date().toISOString(),
    note: "Wave4 L3: topo mode uses enhanced bump; full DEM displacement is full-profile future work.",
    l3Displacement: false,
  };
  fs.writeFileSync(path.join(OUT_DIR, "terrain-meta.json"), `${JSON.stringify(meta, null, 2)}\n`);
  console.log("Done.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
