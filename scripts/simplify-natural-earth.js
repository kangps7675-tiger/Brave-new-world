const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.join(__dirname, "..");
const DEFAULT_CULTURAL_DIR = "C:/Users/kangp/Downloads/10m_cultural/10m_cultural";
const CULTURAL_DIR = process.env.NATURAL_EARTH_CULTURAL_DIR || DEFAULT_CULTURAL_DIR;
const PROCESSED_DIR = path.join(PROJECT_ROOT, "scripts", "processed");

const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

function runMapshaper(input, output) {
  execFileSync(
    npxCommand,
    [
      "mapshaper",
      input,
      "-simplify",
      "5%",
      "-o",
      "format=geojson",
      output,
    ],
    {
      stdio: "inherit",
    },
  );
}

fs.mkdirSync(PROCESSED_DIR, { recursive: true });

runMapshaper(
  path.join(CULTURAL_DIR, "ne_10m_roads.shp"),
  path.join(PROCESSED_DIR, "roads-simplified.geojson"),
);

runMapshaper(
  path.join(CULTURAL_DIR, "ne_10m_railroads.shp"),
  path.join(PROCESSED_DIR, "railroads-simplified.geojson"),
);
