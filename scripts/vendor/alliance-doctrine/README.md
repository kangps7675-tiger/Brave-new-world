# Alliance doctrine vendor corpus

Immutable primary sources for **perimeter / spillover** product logic and methodology footnotes.

## Layout

| Path | Role |
|------|------|
| `nato-north-atlantic-treaty-1949.json` | Full English articles 1–14 + UI caveats |
| `alliance-doctrine.normalized.json` | Scenario ladder, CSIS trade facts, perimeter ISO sets, spillover lexicon |
| `reports/*.pdf` | CSIS (and related) PDFs — do not edit |

## How the app uses this (anti-speculation)

1. **Never** auto-declare NATO Article 5 activation or Chinese invasion timelines.
2. **Do** cite Article 4/5/6 text as footnotes when showing Atlantic flank *reported* alerts.
3. **Do** use perimeter ISO + alert lexicon to flag **spillover candidates** (Poland air-raid, Romania drone, etc.).
4. **Do** attach ChinaPower trade facts to Taiwan Strait “why it matters” with explicit CSIS attribution: https://features.csis.org/chinapower/china-taiwan-strait-trade/
5. Indo-Pacific flank is **symmetric** to NATO east flank (JPN/KOR/AUS/PHL/TWN…) — not NATO-only.

Runtime API: `src/data/allianceDoctrine.ts`
