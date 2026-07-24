"use client";

import { useEffect } from "react";
import { applyUiFontPrefs, readUiFontPrefs } from "@/lib/fontPrefs";

/** 하이드레이션 후 prefs 재적용 (부트 스크립트와 동기) */
export function UiFontBoot() {
  useEffect(() => {
    applyUiFontPrefs(readUiFontPrefs());
  }, []);
  return null;
}
