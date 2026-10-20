# Third-party: cross-strait-signal

| | |
|---|---|
| Upstream | https://github.com/Parkemoon/cross-strait-signal |
| Author | Ed Moon (Parkemoon) |
| Local path | `vendor/cross-strait-signal/` |
| Licence | **GNU GPL-3.0** (see `vendor/cross-strait-signal/LICENSE`) |

## Why it is vendored separately

This project is **not** amalgamated into `src/`. GPL-3.0 is a strong copyleft licence:

- You may run, study, and modify the vendored tree under GPL-3.0.
- If you **distribute** a modified copy of this software, you must provide corresponding source under GPL-3.0 and keep copyright / licence notices.
- If you **combine** its code into this Next.js app as one program and distribute that combination, the combined work is generally required to be offered under GPL-3.0 as well.
- Safer patterns under GPL: keep it as a **separate process/service**, or consume only its **public HTTP API** / published data without copying GPL source into our bundle.

Do **not** copy files from `vendor/cross-strait-signal` into `src/` without an explicit decision to accept GPL-3.0 copyleft for the product you ship.

## Local update

```bash
git -C vendor/cross-strait-signal pull --ff-only
```

(Shallow clone: `git -C vendor/cross-strait-signal fetch --depth 1 origin main && git -C vendor/cross-strait-signal reset --hard origin/main`)

## Attribution

Copyright and licence text remain in `vendor/cross-strait-signal/LICENSE` and the upstream README. This file is an integration note only; it does not relicense the upstream project.

## Runtime integration

The app calls the upstream public HTTP API through
`src/app/api/cross-strait-signal/route.ts`. No upstream Python or frontend
source is copied into the application bundle. The proxy:

- requests only public, analyst-approved API records;
- normalizes facts into this app's own TypeScript data model;
- keeps links to the original reports and identifies Cross-Strait Signal in
  marker/briefing metadata;
- does not persist the upstream database or present reported vessel areas as
  live AIS positions.

GPL-3.0 governs the upstream software. It does not by itself grant additional
rights to third-party article text returned by the API, so the map keeps
summaries short and links users to the original report.
