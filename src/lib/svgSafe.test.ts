import { describe, expect, it } from "vitest";
import { escapeXml, safeColor, safeJsonLd, safeNumber } from "./svgSafe";

describe("safeColor", () => {
  it("정상 색상값은 그대로 통과", () => {
    expect(safeColor("#ef4444")).toBe("#ef4444");
    expect(safeColor("#fff")).toBe("#fff");
    expect(safeColor("rgba(8, 18, 36, 0.55)")).toBe("rgba(8, 18, 36, 0.55)");
    expect(safeColor("hsl(210 40% 50%)")).toBe("hsl(210 40% 50%)");
    expect(safeColor("currentColor")).toBe("currentColor");
  });

  it("속성 탈출 시도는 fallback 으로 대체 (HIGH-04)", () => {
    expect(safeColor('#fff" onload="alert(1)')).toBe("currentColor");
    expect(safeColor('red"><script>alert(1)</script>')).toBe("currentColor");
    expect(safeColor("url(javascript:alert(1))")).toBe("currentColor");
  });

  it("빈 값·비문자열·과도한 길이는 fallback", () => {
    expect(safeColor("")).toBe("currentColor");
    expect(safeColor(undefined)).toBe("currentColor");
    expect(safeColor(null)).toBe("currentColor");
    expect(safeColor("#" + "a".repeat(100))).toBe("currentColor");
  });

  it("지정한 fallback 을 쓴다", () => {
    expect(safeColor('bad"value', "#000")).toBe("#000");
  });
});

describe("safeNumber", () => {
  it("유한수만 통과", () => {
    expect(safeNumber(24, 10)).toBe(24);
    expect(safeNumber("24", 10)).toBe(24);
    expect(safeNumber(NaN, 10)).toBe(10);
    expect(safeNumber(Infinity, 10)).toBe(10);
    expect(safeNumber("abc", 10)).toBe(10);
  });
});

describe("escapeXml", () => {
  it("XML 특수문자를 이스케이프", () => {
    expect(escapeXml('<a href="x">&\'</a>')).toBe(
      "&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;",
    );
  });
});

describe("safeJsonLd", () => {
  it("</script> 시퀀스를 무력화한다", () => {
    const out = safeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(out).toContain("\\u003c");
  });

  it("U+2028 / U+2029 를 이스케이프한다", () => {
    const LS = "\u2028";
    const PS = "\u2029";
    const out = safeJsonLd({ text: `a${LS}b${PS}c` });
    expect(out).toContain("\\u2028");
    expect(out).toContain("\\u2029");
    expect(out).not.toContain(LS);
    expect(out).not.toContain(PS);
  });

  it("이스케이프 후에도 유효한 JSON 이다", () => {
    const value = { a: 1, b: "x<y>z&", c: ["</script>"] };
    expect(JSON.parse(safeJsonLd(value))).toEqual(value);
  });
});
