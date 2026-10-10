import { describe, expect, it } from "vitest";
import { uniqueSourceKey } from "@/lib/conflictEvents/confidence";
import { classifyLiveuaOrigin } from "@/lib/liveuamap/originSource";

describe("classifyLiveuaOrigin", () => {
  it("inherits media tier from the cited article", () => {
    const o = classifyLiveuaOrigin({
      sourceUrl: "https://www.reuters.com/world/europe/strike-zaporizhzhia",
      viaSource: "Reuters",
    });
    expect(o.kind).toBe("media");
    if (o.kind === "media") expect(o.tier).toBe(1);
  });

  it("classifies state media as tier 3", () => {
    const o = classifyLiveuaOrigin({ sourceUrl: "https://tass.com/politics/1", viaSource: "" });
    expect(o).toMatchObject({ kind: "media", tier: 3 });
  });

  it("shares the RSS source key so the same article is counted once", () => {
    const url = "https://www.reuters.com/world/europe/strike-zaporizhzhia";
    expect(classifyLiveuaOrigin({ sourceUrl: url, viaSource: "Reuters" }).sourceKey).toBe(
      uniqueSourceKey("Reuters", url),
    );
  });

  it("treats telegram and X as social tips, keyed per channel", () => {
    const a = classifyLiveuaOrigin({ sourceUrl: "https://t.me/channelA/123" });
    const b = classifyLiveuaOrigin({ sourceUrl: "https://t.me/channelB/9" });
    const x = classifyLiveuaOrigin({ sourceUrl: "https://x.com/someone/status/1" });
    expect(a.kind).toBe("social");
    expect(x.kind).toBe("social");
    expect(a.sourceKey).not.toBe(b.sourceKey);
  });

  it("falls back to none when only the liveuamap placeholder is present", () => {
    expect(classifyLiveuaOrigin({ sourceUrl: "https://liveuamap.com/" }).kind).toBe("none");
    expect(classifyLiveuaOrigin({ sourceUrl: "https://ukraine.liveuamap.com/en/2026/x" }).kind).toBe(
      "none",
    );
  });

  it("uses the cited outlet name when the link is liveuamap itself", () => {
    const media = classifyLiveuaOrigin({ sourceUrl: "https://liveuamap.com/", viaSource: "BBC" });
    expect(media).toMatchObject({ kind: "media", tier: 1 });
    const social = classifyLiveuaOrigin({
      sourceUrl: "https://liveuamap.com/",
      viaSource: "Telegram channel",
    });
    expect(social.kind).toBe("social");
  });
});
