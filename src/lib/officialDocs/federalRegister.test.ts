import { describe, expect, it } from "vitest";
import { isGeoRelevant, parseFederalRegister } from "./federalRegister";
import { candidatesOfBody } from "./ingestRows";

const JSON_BODY = {
  count: 4,
  results: [
    {
      title: "Addition of Entities to the Entity List and Revision of Entries on the Entity List",
      html_url: "https://www.federalregister.gov/documents/2026/11/10/2026-12345/addition-of-entities-to-the-entity-list",
      publication_date: "2026-11-10",
      abstract: "The Bureau of Industry and Security adds entities in China and Russia to the Entity List.",
      type: "Rule",
      agencies: [{ name: "Industry and Security Bureau", slug: "industry-and-security-bureau" }],
    },
    {
      title: "Imposing Sanctions on Persons Connected to the Houthis",
      html_url: "https://www.federalregister.gov/documents/2026/11/09/2026-12000/imposing-sanctions",
      publication_date: "2026-11-09",
      abstract: null,
      type: "Presidential Document",
      agencies: [{ name: "Executive Office of the President" }],
    },
    {
      title: "Agency Information Collection Activities: Tire Registration Forms",
      html_url: "https://www.federalregister.gov/documents/2026/11/09/2026-11000/tire-registration",
      publication_date: "2026-11-09",
      abstract: "Routine paperwork notice.",
      type: "Notice",
      agencies: [{ name: "Transportation Department" }],
    },
    { title: "No url", html_url: "http://insecure.example/x", publication_date: "2026-11-09", type: "Notice" },
  ],
};

describe("연방관보 읽기", () => {
  it("지정학과 닿는 규칙·고시와 대통령 문서만 남기고 기관을 붙인다", () => {
    const rows = parseFederalRegister(JSON_BODY);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ publishedAt: "2026-11-10", kind: "statement", agency: "Industry and Security Bureau" });
    expect(rows[1].title).toContain("Houthis");
    expect(rows[1].agency).toBe("Executive Office of the President");
  });

  it("관련 없는 행정 공지는 거른다", () => {
    expect(isGeoRelevant("Agency Information Collection Activities: Tire Registration", "Routine paperwork")).toBe(false);
    expect(isGeoRelevant("Sanctions designations", "")).toBe(true);
  });

  it("본문이 JSON이 아니거나 모양이 다르면 빈 목록", () => {
    expect(parseFederalRegister({})).toEqual([]);
    expect(candidatesOfBody("<html>", { issuerId: "us", url: "https://x", label: "x", format: "federal-register" })).toEqual([]);
  });

  it("소스 종류에 맞는 읽기 함수를 고른다", () => {
    const rows = candidatesOfBody(JSON.stringify(JSON_BODY), { issuerId: "us", url: "https://x", label: "x", format: "federal-register" });
    expect(rows).toHaveLength(2);
  });
});
