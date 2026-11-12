import { describe, expect, it } from "vitest";
import { hasListPageReader, japanMofaDetailDate, parseListPage } from "./listPages";

const NATO = `
<a href="/en/about-us/organization/nato-structure/nato-military-committee">NATO Military Committee portal</a>
<div class="card-normal card-transcript">
<a href="https://www.nato.int/en/about-us/official-texts-and-resources/official-texts/2026/07/08/the-ankara-summit-declaration" aria-label="The Ankara Summit Declaration ">
<div class="card-normal-text"><h3 class="h4-style">The Ankara Summit Declaration </h3><p class="date">08 July 2026</p></div></a></div>
<a href="https://www.nato.int/en/about-us/official-texts-and-resources/official-texts/2026/09/29/quantum-technology-roadmap">
<h3 class="h4-style">Quantum Technology Roadmap</h3></a>`;

const TW = `<li><span><a href="News_Content.aspx?n=1328&sms=273&s=123389" title="ROC (Taiwan) and Philippines sign updated MOU on direct hiring" id="" class=""> <i class="mark">2026/11<b>6</b></i>ROC (Taiwan) and Philippines sign updated MOU</a></span></li>
<li><span><a href="News_Content.aspx?n=1329&sms=272&s=123389" title="ROC (Taiwan) and Philippines sign updated MOU on direct hiring"> <i class="mark">2026/11<b>6</b></i>x</a></span></li>
<li><span><a href="News_Content.aspx?n=1328&sms=273&s=123390" title="MOFA response to IPAC statement">MOFA response to IPAC statement</a></span></li>`;

const FR = `<article class="node"><div class="fr-card__body"><h3 class="fr-card__title">
<a href="/en/presse-et-ressources/decouvrir-et-informer/actualites/declaration-conjointe-g7"  class="fr-card__link">
 Joint declaration following the G7 Foreign Ministers Meeting in Paris on 9 and…
</a></h3><p class="fr-card__detail"></p><div class="fr-card__end"><p class="fr-card__detail">
 November 11th 2026
</p></div></div></article>`;

const KR = `<tr><td><div>11421</div></td><td class="left"><div><a href="#" onclick="f_view('323501');" class="link">Outcome of the 11th International Conference on the Law of the Sea</a></div></td>
<td><div>2026-11-04</div></td></tr>`;

const JP = `<li><a href="https://japan.kantei.go.jp/105/statement/202611/1111statement.html" class="panel-article__link"><div class="panel-article__media"></div><div class="panel-article__content"><div class="panel-article__title">Instruction by the Prime Minister regarding the Avian Influenza Case</div></div></a></li>
<li><a href="/105/speech/202611/05kaiken.html" class="panel-article__link"><div class="panel-article__title">Press Conference on the Summit Telephone Meeting with President Macron</div></a></li>
<li><a href="/105/actions/202611/09hyoukei.html" class="panel-article__link"><div class="panel-article__title">Courtesy Call</div></a></li>`;

const KR_KO = `<tr> <td data-before="번호"><div>22884</div></td> <td data-before="제목"> <div> <a href="./view.do?seq=377761&amp;page=1&amp;pitem=10" onclick="javascript:f_view('377761'); return false;"> <span class="krds-badge outline-primary">NEW</span> 제9차 외교부-시민사회 정책대화 개최 </a> </div> </td> <td data-before="작성일"><div> <span class="date"> 2026-11-12</span> </div></td> </tr>`;

const MND = `<tr> <td class="td-num"> 13445 </td> <td class="td-title alignL"> <a href="/bbs/mnd/13000005/DPIM_124632/artclView.do" onclick="jf_viewArtcl('mnd', '13000005', 'DPIM_124632')"> <strong><span>국방 분야 혁신제품 최초 지정, 민간 혁신기술의 군 활용 확대 </span></strong> <span class="new">새글</span> </a> </td> <td class="td-write"> 김채명 </td> <td class="td-date">2026.11.12</td> </tr>`;

const TW_MND = `<a href="/en/News/PLAAct/88203" class="news_list"> <div class="date headline-h5 h5">2026.11.12</div> <h2 class="title headline-h4"><span class="en">PLA activities in the waters and airspace around Taiwan</span></h2> <div class="views body-2">Click-Through Rate：315</div></a>
<a href="/en/News/PressRelease/88156" class="news_list"> <div class="left-block"> <div class="date body-2"><span class="en">2026.11.04</span></div></div> <div class="title-column"> <h2 class="title headline-h4"><span class="en">Ministry of National Defense Issues Press Release Regarding "PLA Joint Combat Readiness Patrol"</span></h2></div></a>`;

const JCS = `<li> <a href="/bbs/jcs2/121947/O_503624/artclView.do" onclick="jf_viewArtcl('jcs2', '121947', 'O_503624')"> <div class="conts"> <p class="sub"> <span class="num">NO. 505</span> </p> <strong class="title"><em><strong><span>영공방위 및 미사일 감시태세 이상무('26. 11. 11. 수)</span></strong> <span class="new">새글</span></em></strong> <p class="contentTxt"> </p> <ul class="detail"> <li> <strong>작성자</strong> 합참공보실 </li> <li><strong>등록일</strong>2026.11.12</li> </ul> </div> </a> </li>`;
const JMOD = `<div class="news__item"><dt class="date">10/29</dt><dd class="news__title"><a href="/j/press/news/2026/10/29d.html" class="">北朝鮮のミサイル等関連情報（続報）について</a>　<a href="/j/press/news/2026/10/29d.pdf">印刷用</a></dd></div>`;

describe("합참·일본 방위성 목록", () => {
  it("합참 보도자료: 제목·등록일", () => {
    const r = parseListPage(JCS, "https://www.jcs.mil.kr/jcs2/4752/subview.do", "kr");
    expect(r[0]).toMatchObject({ title: "영공방위 및 미사일 감시태세 이상무('26. 11. 11. 수)", publishedAt: "2026-11-12", url: "https://www.jcs.mil.kr/bbs/jcs2/121947/O_503624/artclView.do" });
  });
  it("방위성 새 소식: 연도는 주소에서", () => {
    const r = parseListPage(JMOD, "https://www.mod.go.jp/j/press/news/index.html", "jp");
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ publishedAt: "2026-10-29", url: "https://www.mod.go.jp/j/press/news/2026/10/29d.html" });
  });
});

describe("대만 국방부 목록", () => {
  it("중국 군 활동은 날짜를 제목에 붙이고 보도자료는 그대로", () => {
    const rows = parseListPage(TW_MND, "https://www.mnd.gov.tw/en/news/PlaactList", "tw");
    expect(rows.map((r) => r.title)).toEqual([
      "PLA activities in the waters and airspace around Taiwan (2026-11-12)",
      'Ministry of National Defense Issues Press Release Regarding "PLA Joint Combat Readiness Patrol"',
    ]);
    expect(rows[0]).toMatchObject({ publishedAt: "2026-11-12", url: "https://www.mnd.gov.tw/en/News/PLAAct/88203" });
  });
});

describe("한국 국문 목록 페이지", () => {
  it("외교부 국문 보도자료: 제목·날짜·상세 주소", () => {
    const rows = parseListPage(KR_KO, "https://www.mofa.go.kr/www/brd/m_4080/list.do", "kr");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ title: "제9차 외교부-시민사회 정책대화 개최", publishedAt: "2026-11-12", url: "https://www.mofa.go.kr/www/brd/m_4080/view.do?seq=377761" });
  });
  it("국방부 보도자료: 새글 표시를 떼고 날짜를 읽는다", () => {
    const rows = parseListPage(MND, "https://www.mnd.go.kr/mnd/167/subview.do", "kr");
    expect(rows[0]).toMatchObject({ title: "국방 분야 혁신제품 최초 지정, 민간 혁신기술의 군 활용 확대", publishedAt: "2026-11-12", url: "https://www.mnd.go.kr/bbs/mnd/13000005/DPIM_124632/artclView.do" });
  });
});

describe("목록 페이지 읽기", () => {
  it("나토: 주소에서 날짜를 읽고 정상선언을 공동성명으로, 일반 문서는 성명으로 둔다", () => {
    const rows = parseListPage(NATO, "https://www.nato.int/en/about-us/official-texts-and-resources", "nato");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ title: "The Ankara Summit Declaration", publishedAt: "2026-07-08", kind: "joint-statement", weight: "agreed" });
    expect(rows[1]).toMatchObject({ publishedAt: "2026-09-29", kind: "statement" });
  });

  it("대만: 같은 기사(s=번호)는 하나로 합치고, 날짜 표시가 없으면 null", () => {
    const rows = parseListPage(TW, "https://en.mofa.gov.tw/", "tw");
    expect(rows).toHaveLength(2);
    expect(rows[0].publishedAt).toBe("2026-11-06");
    expect(rows[0].url).toBe("https://en.mofa.gov.tw/News_Content.aspx?n=1328&sms=273&s=123389");
    expect(rows[1].publishedAt).toBeNull();
  });

  it("프랑스: 카드의 제목·날짜를 읽는다", () => {
    const rows = parseListPage(FR, "https://www.diplomatie.gouv.fr/en/press/news", "fr");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ publishedAt: "2026-11-11", kind: "joint-statement" });
    expect(rows[0].url).toContain("declaration-conjointe-g7");
  });

  it("한국: f_view 글번호로 상세 주소를 만든다", () => {
    const rows = parseListPage(KR, "https://www.mofa.go.kr/eng/brd/m_5676/list.do", "kr");
    expect(rows[0]).toMatchObject({ publishedAt: "2026-11-04", url: "https://www.mofa.go.kr/eng/brd/m_5676/view.do?seq=323501" });
  });

  it("일본 총리관저: 성명·연설만, 날짜는 주소에서", () => {
    const rows = parseListPage(JP, "https://japan.kantei.go.jp/", "jp");
    expect(rows.map((r) => r.publishedAt)).toEqual(["2026-11-11", "2026-11-05"]);
    expect(rows[1].kind).toBe("remarks");
  });

  it("읽는 함수가 없는 호스트는 빈 목록", () => {
    expect(parseListPage("<a href='x'>x</a>", "https://www.mea.gov.in/press-releases", "in")).toEqual([]);
    expect(hasListPageReader("https://www.nato.int/x")).toBe(true);
    expect(hasListPageReader("https://www.mea.gov.in/")).toBe(false);
  });

  it("프랑스 대통령실: 앞의 날짜·유형을 떼고 주소에서 날짜를 읽는다", () => {
    const html = `<h3><a href="/emmanuel-macron/2026/10/02/g7-leaders-statement-on-global-energy-security">2 octobre 2026 Communiqué de presse G7 Leaders' Statement on Global Energy Security and Market Stability</a></h3>
<h3><a href="https://www.elysee.fr/emmanuel-macron/2026/10/22/exposition">22 octobre 2026 Article La Grande exposition du Fabriqué en France</a></h3>`;
    const rows = parseListPage(html, "https://www.elysee.fr/toutes-les-actualites", "fr");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ publishedAt: "2026-10-02", title: "G7 Leaders' Statement on Global Energy Security and Market Stability" });
    expect(rows[1].title).toBe("La Grande exposition du Fabriqué en France");
  });

  it("중국 외교부 주요 소식: 주소에서 날짜, 링크 글자가 제목", () => {
    const html = `<li><a href="https://www.fmprc.gov.cn/eng/xw/zyxw/202611/t20261106_12055153.html">President Xi Jinping Holds Talks with Gabonese President</a><span>November 06, 2026</span></li>
<li><a href="./202611/t20261110_12056514.html">Xi Jinping Congratulates Iliana Iotova on Her Election</a></li>`;
    const rows = parseListPage(html, "https://www.fmprc.gov.cn/eng/xw/zyxw/", "cn");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ publishedAt: "2026-11-06" });
    expect(rows[1].url).toBe("https://www.fmprc.gov.cn/eng/xw/zyxw/202611/t20261110_12056514.html");
    expect(rows[1].publishedAt).toBe("2026-11-10");
  });

  it("이란 외무부: 항목별 제목 링크와 2026/11/11 날짜를 읽는다", () => {
    const item = (id: number, title: string, date: string) => `<div class="news-arch-item"><div class="news-img-arch"><div class="news-item-img"><a id="x" href="../newsview/${id}"></a></div></div>
<div class="news-content-arch"><div class="news-item-title"><h2><a id="y" class="hTitle" href="../newsview/${id}">${title}</a></h2></div>
<div class="news-item-lead"><a class="hLeadText" href="../newsview/${id}">.</a></div>
<div class="bottom-details"><div class="dateNews"><i class="fa fa-calendar"></i> ${date} </div></div></div></div>`;
    const html = item(797561, "Iran FM: US delusions lead to failure of its policies", "2026/11/11") + item(797510, "Iran declares Argentine Navy Air Force terrorist organizations", "2026/11/10");
    const rows = parseListPage(html, "https://en.mfa.ir/portal/newsarchive/699", "ir");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ url: "https://en.mfa.ir/portal/newsview/797561", publishedAt: "2026-11-11" });
    expect(rows[1].publishedAt).toBe("2026-11-10");
  });

  it("일본 외무성: 날짜 제목 아래 링크를 읽고, 연도 없는 날짜는 오늘 기준으로 정한다", () => {
    const html = `<dl class="title-list"><dt class="list-title">November 12</dt><dd><ul class="link-list"><li><a href="/press/release/pressite_000001_02843.html">Dinner hosted by State Minister</a></li></ul></dd>
<dt class="list-title">November 11</dt><dd><ul class="link-list"><li><a href="/press/release/pressite_000001_02842.html">Courtesy Call on Vice-Minister</a></li><li><a href="/press/release/pressite_000001_02841.html">Reception for Italy anniversary</a></li></ul></dd>
<dt class="list-title">December 30</dt><dd><ul><li><a href="/press/release/pressite_000001_02000.html">Year-end note</a></li></ul></dd></dl>`;
    const rows = parseListPage(html, "https://www.mofa.go.jp/press/release/index.html", "jp", new Date("2026-11-12T03:00:00Z"));
    expect(rows.map((r) => r.publishedAt)).toEqual(["2026-11-12", "2026-11-11", "2026-11-11", "2025-12-30"]);
    expect(rows[0].url).toBe("https://www.mofa.go.jp/press/release/pressite_000001_02843.html");
  });

  it("일본 외무성 상세 페이지의 연도 포함 날짜를 읽는다", () => {
    expect(japanMofaDetailDate("Prefecture e-mail Print November 11, 2026 Japanese On November 11, from 2:35 PM")).toBe("2026-11-11");
    expect(japanMofaDetailDate("no date here")).toBeNull();
  });
});
