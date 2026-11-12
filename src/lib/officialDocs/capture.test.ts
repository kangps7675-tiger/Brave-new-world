import { describe, expect, it } from "vitest";
import { archiveUrlOf, fileDisplayAllowed, fileKeyOf, fileStoreAllowedHost, isPdfBytes, isPdfUrl, pdfLinksOf, sameSite, sha256Hex } from "./capture";

describe("pdfLinksOf", () => {
  const page = "https://www.state.gov/releases/office-of-the-spokesman/2023/05/fact-sheet/";
  it("같은 사이트의 PDF 링크만, 나온 순서대로, 상대 주소는 절대 주소로", () => {
    const html = `
      <a href="/wp-content/uploads/2023/05/05-11-2023-FINAL.pdf">Fact sheet</a>
      <a href='https://travel.state.gov/content/x.PDF?download=1'>travel</a>
      <a href="https://evil.example.com/other.pdf">외부</a>
      <a href="/page.html">페이지</a>
      <a href="/wp-content/uploads/2023/05/05-11-2023-FINAL.pdf#page=2">중복</a>`;
    expect(pdfLinksOf(html, page)).toEqual([
      "https://www.state.gov/wp-content/uploads/2023/05/05-11-2023-FINAL.pdf",
      "https://travel.state.gov/content/x.PDF?download=1",
      "https://www.state.gov/wp-content/uploads/2023/05/05-11-2023-FINAL.pdf#page=2",
    ]);
  });
  it("영국 정부 첨부(assets.publishing.service.gov.uk)는 같은 사이트로 본다", () => {
    const html = '<a href="https://assets.publishing.service.gov.uk/media/abc/statement.pdf">PDF</a>';
    expect(pdfLinksOf(html, "https://www.gov.uk/government/news/x")).toHaveLength(1);
  });
});

describe("sameSite / isPdfUrl", () => {
  it("2단계 도메인(go.jp 등)을 감안해 서로 다른 기관은 같은 사이트로 보지 않는다", () => {
    expect(sameSite("https://www.mofa.go.jp/a", "https://www.mod.go.jp/b")).toBe(false);
    expect(sameSite("https://www.mofa.go.jp/a", "https://warp.mofa.go.jp/b")).toBe(true);
    expect(sameSite("https://a.example.com", "not a url")).toBe(false);
  });
  it("쿼리가 붙어도 경로가 .pdf이면 PDF 주소", () => {
    expect(isPdfUrl("https://x.gov/a/b.pdf?v=2")).toBe(true);
    expect(isPdfUrl("https://x.gov/a/b.html")).toBe(false);
  });
});

describe("파일 확인과 키", () => {
  const bytes = (s: string) => new TextEncoder().encode(s).buffer as ArrayBuffer;
  it("%PDF- 로 시작해야 PDF로 본다", () => {
    expect(isPdfBytes(bytes("%PDF-1.7 ..."))).toBe(true);
    expect(isPdfBytes(bytes("<!DOCTYPE html>"))).toBe(false);
    expect(isPdfBytes(bytes("%PD"))).toBe(false);
  });
  it("해시가 달라지면 키도 달라진다(바뀐 파일의 옛 사본이 남는다)", async () => {
    const a = await sha256Hex(bytes("a"));
    const b = await sha256Hex(bytes("b"));
    expect(a).toHaveLength(64);
    expect(fileKeyOf("doc1", a)).not.toBe(fileKeyOf("doc1", b));
    expect(fileKeyOf("doc1", a)).toMatch(/^official-docs\/doc1\/[a-f0-9]{16}\.pdf$/);
  });
});

describe("archiveUrlOf", () => {
  const h = (v: string | null) => ({ get: (n: string) => (n === "content-location" ? v : null) });
  it("Content-Location 또는 최종 주소에서 보관본 주소를 읽는다", () => {
    expect(archiveUrlOf(h("/web/20261112123456/https://www.state.gov/x"), "")).toBe("https://web.archive.org/web/20261112123456/https://www.state.gov/x");
    expect(archiveUrlOf(h(null), "https://web.archive.org/web/20261112123456/https://x.gov/")).toBe("https://web.archive.org/web/20261112123456/https://x.gov/");
    expect(archiveUrlOf(h(null), "https://web.archive.org/save/https://x.gov/")).toBeNull();
  });
});

describe("표시 허용 발행처", () => {
  it("이용 조건을 확인한 미국·영국만 켜져 있다", () => {
    expect(fileDisplayAllowed("us")).toBe(true);
    expect(fileDisplayAllowed("gb")).toBe(true);
    expect(fileDisplayAllowed("cn")).toBe(false);
  });
});

describe("사본을 만들어도 되는 사이트", () => {
  it("이용 조건을 읽은 사이트(국무부·백악관·영국 정부)와 그 하위 도메인만", () => {
    expect(fileStoreAllowedHost("https://www.state.gov/releases/x/")).toBe(true);
    expect(fileStoreAllowedHost("https://www.whitehouse.gov/releases/x/")).toBe(true);
    expect(fileStoreAllowedHost("https://assets.publishing.service.gov.uk/media/a.pdf")).toBe(true);
  });
  it("같은 미국·영국 발행처라도 이용 조건을 아직 못 읽은 사이트와 다른 나라는 받지 않는다", () => {
    expect(fileStoreAllowedHost("https://www.defense.gov/News/x/")).toBe(false);
    expect(fileStoreAllowedHost("https://www.federalregister.gov/d/x")).toBe(false);
    expect(fileStoreAllowedHost("https://www.mofa.go.jp/a.pdf")).toBe(false);
    expect(fileStoreAllowedHost("https://evilstate.gov.example.com/a.pdf")).toBe(false);
    expect(fileStoreAllowedHost("https://notstate.gov/a.pdf")).toBe(false);
    expect(fileStoreAllowedHost("not a url")).toBe(false);
  });
});
