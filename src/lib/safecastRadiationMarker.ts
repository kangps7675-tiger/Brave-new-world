import {
  safecastLevelColor,
  safecastLevelLabel,
  type SafecastSiteReading,
} from "@/lib/safecast";

/**
 * Compact radiation gauge HTML badge near a nuclear site.
 */
export function createSafecastGaugeBadge(
  reading: Pick<SafecastSiteReading, "siteName" | "usvPerH" | "level">,
  lang: "ko" | "en" = "ko",
): HTMLDivElement {
  const root = document.createElement("div");
  root.className = "safecast-gauge-marker pointer-events-auto";
  root.style.cssText =
    "transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center; gap: 2px;";

  const ko = lang !== "en";
  const color = safecastLevelColor(reading.level);
  const usv =
    reading.usvPerH == null ? "—" : reading.usvPerH < 0.01 ? reading.usvPerH.toFixed(3) : reading.usvPerH.toFixed(2);
  const level = safecastLevelLabel(reading.level, ko);

  const chip = document.createElement("div");
  chip.style.cssText = [
    "min-width: 4.5rem",
    "padding: 4px 8px",
    "border-radius: 999px",
    `border: 1px solid ${color}99`,
    "background: rgba(8,12,18,0.88)",
    "box-shadow: 0 6px 18px rgba(0,0,0,0.4)",
    "font: 600 10px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace",
    `color: ${color}`,
    "text-align: center",
    "white-space: nowrap",
  ].join(";");
  chip.innerHTML = `<div style="opacity:.75;font-size:8px;letter-spacing:.06em;text-transform:uppercase">${
    ko ? "방사능" : "RAD"
  }</div><div style="font-size:12px;margin-top:1px">${usv} <span style="opacity:.7;font-size:9px">µSv/h</span></div><div style="opacity:.8;font-size:8px;margin-top:1px">${level}</div>`;

  const pin = document.createElement("div");
  pin.style.cssText = [
    "width: 0",
    "height: 0",
    "border-left: 5px solid transparent",
    "border-right: 5px solid transparent",
    `border-top: 6px solid ${color}`,
    "opacity: 0.85",
  ].join(";");

  root.appendChild(chip);
  root.appendChild(pin);
  root.title = `${reading.siteName} · ${usv} µSv/h · Safecast`;
  return root;
}
