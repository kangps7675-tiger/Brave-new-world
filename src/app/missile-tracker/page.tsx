import type { Metadata } from "next";
import { MissileTracker } from "@/components/missile/MissileTracker";

export const metadata: Metadata = {
  title: "북한 미사일 발표 추적",
  description: "한국 합참·일본 방위성·미 펜타곤 발표 비교와 공개 지명 기반 경로 재생",
};
export default function MissileTrackerPage() { return <MissileTracker />; }
