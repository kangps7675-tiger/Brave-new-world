import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      /**
       * 의미 단위 타이포 스케일 (P1-1).
       * 실제 px는 globals.css의 --fs-* 네 줄에서만 조정한다.
       * 새 코드에서 `text-[10px]` 같은 임의 px를 쓰지 말 것
       * (scripts/check-typography.mjs가 CI에서 잡는다).
       */
      fontSize: {
        micro: ["var(--fs-micro)", { lineHeight: "var(--lh-micro)" }],
        meta: ["var(--fs-meta)", { lineHeight: "var(--lh-meta)" }],
        caption: ["var(--fs-caption)", { lineHeight: "var(--lh-caption)" }],
        body: ["var(--fs-body)", { lineHeight: "var(--lh-body)" }],
      },
      fontFamily: {
        sans: [
          "var(--font-wanted)",
          "Wanted Sans Variable",
          "Wanted Sans",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "var(--font-jetbrains-mono)",
          "var(--font-geist-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
        en: ["var(--font-inter)", "var(--font-wanted)", "ui-sans-serif", "system-ui", "sans-serif"],
        parchment: [
          "var(--font-merriweather)",
          "var(--font-wanted)",
          "Georgia",
          "serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
