import { describe, expect, it } from "vitest";
import {
  buildCaseDraftFromText,
  draftToCaseFileInput,
  findOccurredHint,
} from "@/lib/caseFile/buildDraft";
import { extractParagraphText, parseArticleMetaFromHtml } from "@/lib/caseFile/extractArticle";

describe("findOccurredHint", () => {
  it("parses ISO and Korean dates", () => {
    expect(findOccurredHint("attack on 2026-10-08 at dawn")).toContain("2026-10-08");
    expect(findOccurredHint("2026년 10월 8일 새벽 오데사")).toMatch(/^2026-10-08T/);
  });
});

describe("parseArticleMetaFromHtml", () => {
  it("reads og tags and paragraphs", () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Odessa port hit" />
        <meta property="og:site_name" content="Demo News" />
        <meta property="article:published_time" content="2026-10-08T06:00:00Z" />
      </head><body>
        <p>Short</p>
        <p>Russian missiles struck a grain warehouse at the Odessa port early on October 8, local officials said.</p>
      </body></html>`;
    const meta = parseArticleMetaFromHtml(html);
    expect(meta.title).toBe("Odessa port hit");
    expect(meta.outlet).toBe("Demo News");
    expect(meta.publishedAt).toBe("2026-10-08T06:00:00Z");
    expect(meta.text).toContain("grain warehouse");
    expect(extractParagraphText(html)).toContain("Odessa port");
  });
});

describe("buildCaseDraftFromText", () => {
  it("builds strike draft with place and claims for Odessa-like copy", () => {
    const draft = buildCaseDraftFromText({
      text: "Russian missiles struck a grain warehouse at the Odessa port early on 2026-10-08. Ukraine said Russia launched the attack.",
      url: "https://example.com/odesa",
      outlet: "Reuters",
    });
    expect(draft.eventType).toBe("strike");
    expect(draft.claims).toHaveLength(6);
    expect(draft.article.tier).toBeGreaterThanOrEqual(1);
    expect(draft.occurredAt).toBeTruthy();
    expect(draft.occurredAtSource).toBe("body");
    // Odessa / Odesa should resolve via gazetteer or impact place
    expect(draft.place?.label.toLowerCase()).toMatch(/odes|одес/);
  });

  it("draftToCaseFileInput keeps structured place and occurredAt", () => {
    const draft = buildCaseDraftFromText({
      text: "Russian missiles struck a grain warehouse at the Odessa port early on 2026-10-08.",
      url: "https://example.com/odesa",
      outlet: "Reuters",
    });
    const input = draftToCaseFileInput(draft);
    expect(input.incident.place?.lat).toBeTypeOf("number");
    expect(input.incident.occurredAt).toBeTruthy();
    expect(input.incident.occurredAtSource).toBe("body");
  });
});
