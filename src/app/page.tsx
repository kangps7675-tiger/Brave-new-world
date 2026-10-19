import type { Metadata } from "next";
import { SeaBoot } from "@/components/sea/SeaBoot";
import { getRuntimeConfig } from "@/lib/serverEnv";

export const metadata: Metadata = {
  title: "Brave New World — 이 바다는 지금 다닐 만한가",
  description:
    "홍해·호르무즈·흑해 해역별로 피격 선박(확인/유력), 항행경보, 전쟁위험 보험료, 해상 기상, 통항량, 지정학 뉴스를 한 화면에서.",
};

export default function Home() {
  return <SeaBoot runtimeConfig={getRuntimeConfig()} />;
}
