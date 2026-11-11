import { describe, expect, it } from "vitest";
import { decodeHtmlEntities } from "@/lib/htmlEntities";

describe("decodeHtmlEntities", () => {
  it("숫자 참조(10진·16진)를 푼다", () => {
    expect(decodeHtmlEntities("agreed &#8211; Arakhamia")).toBe("agreed – Arakhamia");
    expect(decodeHtmlEntities("agreed &#x2013; Arakhamia")).toBe("agreed – Arakhamia");
  });
  it("자주 나오는 이름 참조를 푼다", () => {
    expect(decodeHtmlEntities("Ukraine&rsquo;s talks &mdash; day 2")).toBe(
      "Ukraine’s talks — day 2",
    );
    expect(decodeHtmlEntities("a&nbsp;b &amp; c &lt;d&gt; &quot;e&quot; &apos;f&#39;")).toBe(
      "a b & c <d> \"e\" 'f'",
    );
  });
  it("이중 인코딩도 푼다", () => {
    expect(decodeHtmlEntities("agreed &amp;#8211; x")).toBe("agreed – x");
  });
  it("모르는 참조·잘못된 코드는 그대로 둔다", () => {
    expect(decodeHtmlEntities("a &foo; b &#0; c &#xD800; d")).toBe("a &foo; b &#0; c &#xD800; d");
  });
});
