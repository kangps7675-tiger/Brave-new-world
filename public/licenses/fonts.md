# 폰트 라이선스 고지

이 서비스가 웹폰트로 제공하는 서체의 저작권자·라이선스 목록이다.
파일 실체는 `src/app/fonts/` 에 있고 `next/font/local` 로 서빙된다.

> **웹폰트 서빙과 저장소 커밋은 "사용"이 아니라 "배포"에 해당한다.**
> SIL OFL 제2조는 폰트 파일 재배포 시 저작권 고지와 라이선스 전문을 반드시
> 동봉하도록 요구한다. 이 디렉터리가 그 의무를 이행하는 자리다.
> 폰트를 추가할 때는 **파일을 넣기 전에** 이 표와 라이선스 텍스트를 먼저 갱신할 것.

---

## SIL Open Font License 1.1

전문: [`OFL-1.1.txt`](./OFL-1.1.txt) · 공식 원문: https://openfontlicense.org/

| 서체 | 파일 | 저작권자 | 출처 |
|------|------|----------|------|
| Pretendard Variable | `PretendardVariable.ttf` | Copyright (c) 2021 Kil Hyung-jin | https://github.com/orioncactus/pretendard |
| Geist Sans / Geist Mono | `GeistVF.woff` · `GeistMonoVF.woff` | Copyright (c) 2024 The Geist Project Authors (Vercel) | https://github.com/vercel/geist-font |
| RIDIBatang (리디바탕) | `RIDIBatang.otf` | RIDI Corporation (리디주식회사) | https://ridicorp.com/ridibatang/ |

Reserved Font Name: `Pretendard`, `RIDIBatang` — 수정본에 원래 이름을 쓸 수 없다.

---

## 한국 무료 배포 서체

| 서체 | 파일 | 권리자 | 라이선스 | 출처 |
|------|------|--------|----------|------|
| Gmarket Sans | `GmarketSansLight/Medium/Bold.otf` | 지마켓(Gmarket) | [`GmarketSans.txt`](./GmarketSans.txt) | https://company.gmarket.co.kr/company/about/company/company--font.asp |
| SB 어그로 Bold | `SBAgro-Bold.ttf` · `.otf` | 샌드박스네트워크(Sandbox Network) | [`SBAggro.txt`](./SBAggro.txt) | https://sandbox.co.kr/font |

두 서체 모두 **개인·기업 상업적 이용 무료**이나 **폰트 파일 자체의 유료 판매를 금지**한다.
이 서비스는 폰트를 판매하지 않고 웹폰트로 서빙하므로 해당 조건을 충족한다.

---

## Google Fonts (CDN 로드 — 파일 미배포)

`next/font/google` 로 빌드 시점에 받아오는 서체. 저장소에 파일을 커밋하지 않는다.

| 서체 | 라이선스 |
|------|----------|
| Inter | SIL OFL 1.1 |
| Merriweather | SIL OFL 1.1 |
| JetBrains Mono | SIL OFL 1.1 |

## jsDelivr CDN 로드 — 파일 미배포

| 서체 | 라이선스 | 출처 |
|------|----------|------|
| Wanted Sans | SIL OFL 1.1 | https://github.com/wanteddev/wanted-sans |

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-08-01 | 최초 작성. OFL 전문 동봉, 저작권자 명시. 출처 불명이던 미사용 폰트 `Griun_PolSensibility-Rg.ttf` 제거 (`docs/copyright-audit-2026-08-01.md` R-1) |
