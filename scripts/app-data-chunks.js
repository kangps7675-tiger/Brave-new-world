/**
 * app-data.json → manifest + countries/disputes/places chunk files
 */
const fs = require("fs");
const path = require("path");
const { writeJsonArrayFile, writeJsonObjectFile } = require("./compact-json");

const CHUNK_FILES = {
  countries: "countries.json",
  disputes: "disputes.json",
  places: "places.json",
};

function isChunkManifest(data) {
  return Boolean(data && data.chunks && typeof data.chunks === "object");
}

function readDisputesFromDir(outDir) {
  const disputesPath = path.join(outDir, CHUNK_FILES.disputes);
  if (fs.existsSync(disputesPath)) {
    const raw = JSON.parse(fs.readFileSync(disputesPath, "utf8"));
    return Array.isArray(raw) ? raw : [];
  }
  const appPath = path.join(outDir, "app-data.json");
  if (!fs.existsSync(appPath)) return [];
  const app = JSON.parse(fs.readFileSync(appPath, "utf8"));
  return Array.isArray(app.disputes) ? app.disputes : [];
}

function writeAppDataChunks(outDir, payload) {
  const {
    generatedAt,
    profile,
    sources,
    countries = [],
    disputes = [],
    places = [],
  } = payload;

  fs.mkdirSync(outDir, { recursive: true });
  writeJsonArrayFile(path.join(outDir, CHUNK_FILES.countries), countries);
  writeJsonArrayFile(path.join(outDir, CHUNK_FILES.disputes), disputes);
  writeJsonArrayFile(path.join(outDir, CHUNK_FILES.places), places);

  const manifest = {
    generatedAt,
    profile,
    sources,
    chunks: { ...CHUNK_FILES },
    countries: [],
    disputes: [],
    places: [],
    events: [],
    roads: [],
    railroads: [],
  };
  writeJsonObjectFile(path.join(outDir, "app-data.json"), manifest);
  return manifest;
}

function splitMonolithicAppData(outDir) {
  const appPath = path.join(outDir, "app-data.json");
  if (!fs.existsSync(appPath)) {
    console.warn("skip missing", appPath);
    return null;
  }

  const data = JSON.parse(fs.readFileSync(appPath, "utf8"));
  if (isChunkManifest(data) && Array.isArray(data.countries) && data.countries.length === 0) {
    console.log(`  already chunked: ${path.relative(process.cwd(), outDir)}`);
    return data;
  }

  const countries = Array.isArray(data.countries) ? data.countries : [];
  const disputes = Array.isArray(data.disputes) ? data.disputes : [];
  const places = Array.isArray(data.places) ? data.places : [];

  const manifest = writeAppDataChunks(outDir, {
    generatedAt: data.generatedAt || new Date().toISOString(),
    profile: data.profile,
    sources: data.sources || { naturalEarth: "", gdelt: "" },
    countries,
    disputes,
    places,
  });

  const mb = (key) => (fs.statSync(path.join(outDir, CHUNK_FILES[key])).size / 1024 / 1024).toFixed(2);
  console.log(
    `✓ ${path.relative(process.cwd(), outDir)}: manifest + countries ${mb("countries")}MB · disputes ${mb("disputes")}MB · places ${mb("places")}MB`,
  );
  return manifest;
}

module.exports = {
  CHUNK_FILES,
  isChunkManifest,
  readDisputesFromDir,
  writeAppDataChunks,
  splitMonolithicAppData,
};
