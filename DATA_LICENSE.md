# Data license policy

Brave New World (**멋진 신세계**) separates its data into three classes.
The catalog field is `dataLicense` in `src/data/sourceCatalog.ts`.

| Class | `dataLicense` | What it covers |
|---|---|---|
| **Own work** | `proprietary` | Judgments and records we produce: escalation signals, case-file evidence and verdicts, daily history, curated layers. Not licensed for copying, redistribution, or bulk collection without permission. |
| **Inherited ODbL** | `ODbL-1.0` | Layers derived from ODbL sources (OpenStreetMap-based infrastructure, VIINA). They keep ODbL terms — attribution and share-alike — and are shown as rendered maps only. |
| **Upstream** | `upstream` or the real ID | Third-party feeds (ACLED, MarineTraffic, NASA FIRMS, outlet RSS, adsb.fi …). They keep **their own** licenses and are never relabelled by us. |

## Rules

- **ODbL is not the default.** It permits copying and commercial reuse. We use it only where it is inherited from the source.
- Never mark third-party content as `proprietary` or `ODbL-1.0`. We cannot grant rights we do not hold.
- Do not guess a license. If unknown, leave it blank or `unknown`.
- `commercialUse` (paid-tier gate, `docs/commercial-licensing.md`) and `dataLicense` are separate axes.

| | |
|--|--|
| Default for new own-work layers | `proprietary` |
| Policy code | `src/lib/licensing/odblDataPolicy.ts` |
| Render-only gate (ODbL derivatives) | `src/lib/licensing/viinaRenderGate.ts` |
| Public notices | `OWN_WORK_NOTICE_*` / `INHERITED_ODBL_NOTICE_*` in `odblDataPolicy.ts` |

> The legal effect of the proprietary declaration and of the render-only reading of ODbL is **pending legal review**.
