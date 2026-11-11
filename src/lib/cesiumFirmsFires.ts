/**
 * NASA FIRMS 화염 포인트 타입. (세슘 뷰어 제거 후 타입만 남김)
 */

import type { FirmsFire } from "@/data/geoTypes";
import type { FirmsFireIconCause } from "@/lib/firmsFireIcons";

export type CesiumFirmsFirePoint = Pick<FirmsFire, "id" | "lat" | "lng" | "frp"> & {
  soundKind?: FirmsFireIconCause | string | null;
};
