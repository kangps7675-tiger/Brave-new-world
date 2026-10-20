// DATA_PROFILE=lite|full — 빌드 스크립트 공통 설정
const path = require("path");

const DATA_PROFILE = process.env.DATA_PROFILE || process.argv[2] || "full";
const IS_LITE = DATA_PROFILE === "lite";
const PROJECT_ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(PROJECT_ROOT, "public", "data", DATA_PROFILE);

const PROFILE = IS_LITE
  ? {
      gdeltEventCap: 500,
      roadMaxScalerank: 4,
      railMaxScalerank: 4,
      placeMaxScalerank: 6,
      coastlineLineMaxPoints: 80,
      coastlineCoordPrecision: 2,
      countryBorderLineMaxPoints: 80,
      countryBorderCoordPrecision: 2,
      disputeBoundaryLineMaxPoints: 80,
      transportLineMaxPoints: 60,
      use110mFallback: true,
    }
  : {
      gdeltEventCap: null,
      roadMaxScalerank: 99,
      railMaxScalerank: 99,
      placeMaxScalerank: 99,
      coastlineLineMaxPoints: 300,
      coastlineCoordPrecision: 4,
      countryBorderLineMaxPoints: 48,
      countryBorderCoordPrecision: 2,
      disputeBoundaryLineMaxPoints: 80,
      transportLineMaxPoints: 140,
      use110mFallback: true,
    };

module.exports = {
  DATA_PROFILE,
  IS_LITE,
  PROJECT_ROOT,
  OUT_DIR,
  PROFILE,
};
