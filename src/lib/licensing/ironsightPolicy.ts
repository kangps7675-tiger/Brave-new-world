/**
 * IRONSIGHT (MIT, Nobler Works) — Telegram OSINT channel catalog & Iran/Israel theater reference.
 * @see https://github.com/NoblerWorks-HQ/IRONSIGHT
 * @see public/licenses/ironsight-MIT.txt
 */

export const IRONSIGHT_POLICY = {
  name: "IRONSIGHT",
  author: "Nobler Works",
  copyright: "Copyright (c) 2026 Nobler Works",
  license: "MIT",
  repoUrl: "https://github.com/NoblerWorks-HQ/IRONSIGHT",
  licenseUrl: "https://opensource.org/licenses/MIT",
  /** Bundled MIT license text (required notice for substantial portions) */
  licenseFilePath: "/licenses/ironsight-MIT.txt",
} as const;

/** Full MIT License text — include in copies or substantial portions of IRONSIGHT-derived code/data */
export const IRONSIGHT_MIT_LICENSE_TEXT = `MIT License

Copyright (c) 2026 Nobler Works

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

export const IRONSIGHT_ATTRIBUTION_KO =
  "공개 Telegram 채널 목록(중동·우크라이나 OSINT)과 이란–이스라엘 전선 사각 구역(regionBoxes)은 IRONSIGHT 프로젝트를 참고·검증했습니다. 채널 게시물·뉴스·위성 등 외부 데이터 저작권은 각 제공자 소유이며, 본 앱은 뷰어 역할만 합니다.";

export const IRONSIGHT_ATTRIBUTION_EN =
  "Public Telegram channel lists (Middle East / Ukraine OSINT) and Iran–Israel theater zone boxes were derived from and cross-checked against the IRONSIGHT project (MIT). Third-party feed content belongs to its providers; this app is a viewer only.";

export const IRONSIGHT_USAGE = [
  "Telegram 채널 카탈로그: src/data/telegramChannels.ts",
  "중동·이란 전쟁 구역 bbox: scripts/data/ironsight-middle-east-zones-seed.json",
  "저작권 고지 + MIT License 전문: public/licenses/ironsight-MIT.txt",
] as const;
