import { describe, expect, it } from "vitest";
import { isPathAllowed, parseRobotsTxt } from "@/lib/news/robotsTxt";

const UA = "conflictviewbot";

function allowed(body: string, path: string, ua = UA): boolean {
  return isPathAllowed(parseRobotsTxt(body, ua), path);
}

describe("parseRobotsTxt", () => {
  it("규칙이 없으면 허용한다", () => {
    expect(allowed("", "/world/article")).toBe(true);
  });

  it("* 그룹의 Disallow 를 따른다", () => {
    const body = `User-agent: *\nDisallow: /private/`;
    expect(allowed(body, "/private/x")).toBe(false);
    expect(allowed(body, "/world/x")).toBe(true);
  });

  it("빈 Disallow 는 제한 없음을 뜻한다", () => {
    expect(allowed("User-agent: *\nDisallow:", "/anything")).toBe(true);
  });

  it("전체 차단을 인식한다", () => {
    expect(allowed("User-agent: *\nDisallow: /", "/world/x")).toBe(false);
  });

  it("우리 토큰 그룹이 * 그룹보다 우선한다", () => {
    const body = [
      "User-agent: *",
      "Disallow: /",
      "",
      "User-agent: ConflictViewBot",
      "Disallow: /paywall/",
    ].join("\n");
    // 우리 전용 그룹이 있으므로 * 의 전체 차단은 적용되지 않는다
    expect(allowed(body, "/world/x")).toBe(true);
    expect(allowed(body, "/paywall/x")).toBe(false);
  });

  it("가장 긴 패턴이 이긴다 (Allow 가 Disallow 를 덮을 수 있다)", () => {
    const body = ["User-agent: *", "Disallow: /news/", "Allow: /news/public/"].join("\n");
    expect(allowed(body, "/news/secret")).toBe(false);
    expect(allowed(body, "/news/public/a")).toBe(true);
  });

  it("길이가 같으면 Allow 가 이긴다", () => {
    const body = ["User-agent: *", "Disallow: /a/", "Allow: /a/"].join("\n");
    expect(allowed(body, "/a/x")).toBe(true);
  });

  it("* 와일드카드를 처리한다", () => {
    const body = "User-agent: *\nDisallow: /*/draft";
    expect(allowed(body, "/world/draft")).toBe(false);
    expect(allowed(body, "/world/published")).toBe(true);
  });

  it("$ 끝 고정을 처리한다", () => {
    const body = "User-agent: *\nDisallow: /*.pdf$";
    expect(allowed(body, "/docs/a.pdf")).toBe(false);
    expect(allowed(body, "/docs/a.pdf.html")).toBe(true);
  });

  it("주석과 대소문자 혼용을 처리한다", () => {
    const body = ["# comment", "USER-AGENT: *", "DISALLOW: /x/  # trailing"].join("\n");
    expect(allowed(body, "/x/y")).toBe(false);
  });

  it("연속된 User-agent 줄은 하나의 그룹을 공유한다", () => {
    const body = ["User-agent: SomeBot", "User-agent: *", "Disallow: /shared/"].join("\n");
    expect(allowed(body, "/shared/x")).toBe(false);
  });

  it("Crawl-delay 를 읽는다", () => {
    const policy = parseRobotsTxt("User-agent: *\nCrawl-delay: 2.5", UA);
    expect(policy.crawlDelaySec).toBe(2.5);
  });

  it("우리와 무관한 그룹만 있으면 허용한다", () => {
    const body = "User-agent: GPTBot\nDisallow: /";
    expect(allowed(body, "/world/x")).toBe(true);
  });
});
