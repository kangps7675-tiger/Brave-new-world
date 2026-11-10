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
| Geist Sans / Geist Mono | `GeistVF.woff` · `GeistMonoVF.woff` | Copyright (c) 2024 The Geist Project Authors (Vercel) | https://github.com/vercel/geist-font |

상황실 본문·헤드라인은 Wanted Sans(아래 CDN)다. Pretendard 가변 TTF, 리디바탕, Gmarket Sans, SB 어그로는 첫 화면에서 수 MB를 받아서 2026-11-11에 뺐다. 한글 명조가 필요한 양피지는 기기에 설치된 명조를 쓴다.

---

## 라틴 전용 woff2 (저장소에 있음, 한글 없음)

| 서체 | 파일 | 라이선스 |
|------|------|----------|
| Inter | `Inter-latin-wght.woff2` | SIL OFL 1.1 |
| Merriweather | `Merriweather-latin-wght.woff2` · italic | SIL OFL 1.1 |
| JetBrains Mono | `JetBrainsMono-latin-wght.woff2` | SIL OFL 1.1 |

## jsDelivr CDN 로드 — 파일 미배포

| 서체 | 라이선스 | 출처 |
|------|----------|------|
| Wanted Sans | SIL OFL 1.1 | https://github.com/wanteddev/wanted-sans |

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-08-01 | 최초 작성. OFL 전문 동봉, 저작권자 명시. 출처 불명이던 미사용 폰트 `Griun_PolSensibility-Rg.ttf` 제거 (`docs/copyright-audit-2026-08-01.md` R-1) |
| 2026-11-11 | Pretendard Variable, RIDIBatang, Gmarket Sans, SB 어그로 파일 제거. UI는 Wanted Sans. |
