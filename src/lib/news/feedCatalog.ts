import type { NewsFeedTopic, NewsTheater } from "@/lib/news/types";
import type { EconomyNewsGenre } from "@/lib/news/economyGenres";
import { DEFAULT_PACKAGE_SELECTION, type ViewPackageId } from "@/lib/viewPackages";

export type NewsFeedDef = {
  url: string;
  name: string;
  theater: NewsTheater;
  /** defense (default) | economy — geo-trader 전용 피드 */
  topic?: NewsFeedTopic;
  /** 경제 장르 — topic=economy 일 때 Intel 시트 카테고리 */
  econGenre?: EconomyNewsGenre;
  /** Skip theater keyword filter */
  unfiltered?: boolean;
};

const G = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

const SHARED_DEFENSE: NewsFeedDef[] = [
  { url: "https://breakingdefense.com/feed/", name: "Breaking Defense", theater: "global" },
  { url: "https://www.longwarjournal.org/feed", name: "Long War Journal", theater: "global" },
  { url: "https://www.militarytimes.com/arc/outboundfeeds/rss/?outputType=xml", name: "Military Times", theater: "global" },
  { url: "https://warontherocks.com/feed/", name: "War on the Rocks", theater: "global" },
  {
    url: "https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=945&max=10",
    name: "DoD",
    theater: "global",
    unfiltered: true,
  },
  // 민간 OSINT·안보연구소 — 국적 불문 Tier2 (src/lib/news/mediaTiers.ts)
  { url: "https://www.bellingcat.com/feed/", name: "Bellingcat", theater: "global" },
  { url: "https://www.twz.com/feed", name: "The War Zone", theater: "global" },
  { url: "https://www.chathamhouse.org/path/whatsnew.xml", name: "Chatham House", theater: "global" },
  { url: "https://www.crisisgroup.org/rss.xml", name: "Crisis Group", theater: "global" },
  // Carnegie·Janes·IISS: 공개 RSS 없음(구독제/미공개) → 구글 뉴스 검색으로 대체
  { url: G("site:carnegieendowment.org"), name: "Carnegie Endowment", theater: "global", unfiltered: true },
  { url: G("site:janes.com"), name: "Janes", theater: "global", unfiltered: true },
  { url: G("site:iiss.org"), name: "IISS", theater: "global", unfiltered: true },
];

const MIDDLE_EAST: NewsFeedDef[] = [
  { url: "https://feeds.bbci.co.uk/news/world/middle_east/rss.xml", name: "BBC", theater: "middle-east", unfiltered: true },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/MiddleEast.xml", name: "NYT", theater: "middle-east", unfiltered: true },
  { url: "https://www.aljazeera.com/xml/rss/all.xml", name: "Al Jazeera", theater: "middle-east" },
  { url: "https://feeds.reuters.com/Reuters/worldNews", name: "Reuters", theater: "middle-east" },
  { url: "http://rss.cnn.com/rss/edition_meast.rss", name: "CNN", theater: "middle-east" },
  { url: "https://moxie.foxnews.com/google-publisher/world.xml", name: "Fox News", theater: "middle-east" },
  { url: "https://feeds.content.dowjones.io/public/rss/RSSWorldNews", name: "WSJ", theater: "middle-east" },
  { url: "https://www.timesofisrael.com/feed/", name: "Times of Israel", theater: "middle-east", unfiltered: true },
  { url: "https://www.jpost.com/rss/rssfeedsfrontpage.aspx", name: "JPost", theater: "middle-east", unfiltered: true },
  { url: "https://www.ynetnews.com/Integration/StoryRss2.xml", name: "Ynet", theater: "middle-east", unfiltered: true },
  { url: "https://rcs.mako.co.il/rss/news-military.xml", name: "N12", theater: "middle-east", unfiltered: true },
  { url: "https://rss.walla.co.il/feed/22", name: "Walla", theater: "middle-east", unfiltered: true },
  { url: "https://www.haaretz.com/srv/middle-east-news-rss", name: "Haaretz", theater: "middle-east", unfiltered: true },
  { url: "https://www.thenationalnews.com/arc/outboundfeeds/rss/?outputType=xml", name: "The National", theater: "middle-east" },
  { url: "https://www.dropsitenews.com/feed", name: "Drop Site", theater: "middle-east" },
  { url: "https://www.al-monitor.com/rss.xml", name: "Al-Monitor", theater: "middle-east" },
  { url: "https://thecradle.co/feed", name: "The Cradle", theater: "middle-east", unfiltered: true },
  { url: G("site:understandingwar.org Iran"), name: "ISW", theater: "middle-east", unfiltered: true },
  {
    url: "https://www.centcom.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=808&max=20",
    name: "CENTCOM",
    theater: "middle-east",
    unfiltered: true,
  },
  { url: "https://www.presstv.ir/rss.xml", name: "PressTV", theater: "middle-east", unfiltered: true },
  { url: G("Iran Israel war military strike"), name: "Google News", theater: "middle-east", unfiltered: true },
  { url: G("Iran missile drone strike Israel"), name: "Google News", theater: "middle-east", unfiltered: true },
  { url: G('"Strait of Hormuz" OR "Red Sea" military Iran'), name: "Google News", theater: "middle-east", unfiltered: true },
  {
    url: G(
      '(Hormuz OR Suez OR "Bab el-Mandeb" OR Malacca OR "Taiwan Strait" OR "Panama Canal" OR Bosporus) (navy OR blockade OR mine OR attack OR houthi OR IRGC OR escort OR convoy)',
    ),
    name: "Google News · Chokepoint Security",
    theater: "global",
    unfiltered: true,
  },
];

const RUSSIA_UKRAINE: NewsFeedDef[] = [
  { url: "https://feeds.bbci.co.uk/news/world/europe/rss.xml", name: "BBC", theater: "russia-ukraine" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/Europe.xml", name: "NYT", theater: "russia-ukraine" },
  { url: "https://www.aljazeera.com/xml/rss/all.xml", name: "Al Jazeera", theater: "russia-ukraine" },
  { url: "https://feeds.reuters.com/Reuters/worldNews", name: "Reuters", theater: "russia-ukraine" },
  { url: "https://kyivindependent.com/feed/", name: "Kyiv Independent", theater: "russia-ukraine", unfiltered: true },
  { url: "https://www.pravda.com.ua/eng/rss/", name: "Ukrainska Pravda", theater: "russia-ukraine", unfiltered: true },
  { url: "https://www.kyivpost.com/feed", name: "Kyiv Post", theater: "russia-ukraine", unfiltered: true },
  { url: "https://english.nv.ua/rss/all.xml", name: "NV", theater: "russia-ukraine", unfiltered: true },
  { url: "https://www.ukrinform.net/rss/block-lastnews", name: "Ukrinform", theater: "russia-ukraine", unfiltered: true },
  { url: "https://tass.com/rss/v2.xml", name: "TASS", theater: "russia-ukraine" },
  { url: "https://www.rt.com/rss/news/", name: "RT", theater: "russia-ukraine" },
  { url: "https://www.themoscowtimes.com/rss/news", name: "Moscow Times", theater: "russia-ukraine" },
  { url: "https://meduza.io/rss/en/all", name: "Meduza", theater: "russia-ukraine" },
  { url: "https://www.oryxspioenkop.com/feeds/posts/default", name: "Oryx", theater: "russia-ukraine" },
  // ISW: 공개 RSS 없음 → 구글 뉴스 검색으로 대체
  { url: G("site:understandingwar.org Ukraine"), name: "ISW", theater: "russia-ukraine", unfiltered: true },
  { url: G("Russia Ukraine war military"), name: "Google News", theater: "russia-ukraine", unfiltered: true },
  { url: G("Ukraine missile OR drone strike Russia"), name: "Google News", theater: "russia-ukraine", unfiltered: true },
  { url: G("Ukraine front line offensive Russia"), name: "Google News", theater: "russia-ukraine", unfiltered: true },
];

const CHINA_TAIWAN: NewsFeedDef[] = [
  { url: "https://feeds.bbci.co.uk/news/world/asia/rss.xml", name: "BBC", theater: "china-taiwan" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/AsiaPacific.xml", name: "NYT", theater: "china-taiwan" },
  { url: "https://feeds.reuters.com/Reuters/worldNews", name: "Reuters", theater: "china-taiwan" },
  {
    url: G('(Taiwan OR "South China Sea") AND (military OR "PLA" OR "White House")'),
    name: "Google News",
    theater: "china-taiwan",
    unfiltered: true,
  },
  {
    url: G("China Taiwan military strait tension"),
    name: "Google News",
    theater: "china-taiwan",
    unfiltered: true,
  },
  {
    url: G("PLA Taiwan invasion exercise"),
    name: "Google News",
    theater: "china-taiwan",
    unfiltered: true,
  },
  {
    url: G(
      '("US China" OR "US-China" OR "United States China" OR "great power competition") (military OR navy OR "South China Sea" OR Taiwan OR Indo-Pacific OR rivalry)',
    ),
    name: "Google News · US–China Rivalry",
    theater: "china-taiwan",
    unfiltered: true,
  },
  {
    url: G(
      '("South China Sea" OR Scarborough OR Spratly OR Paracel OR "West Philippine Sea") (China OR Philippines OR Vietnam OR navy OR militia OR confrontation)',
    ),
    name: "Google News · South China Sea",
    theater: "china-taiwan",
    unfiltered: true,
  },
  {
    url: G(
      '(Guam OR "Philippine Sea" OR "first island chain" OR "second island chain" OR "Pacific Fleet") (China OR PLA OR US OR Navy OR missile OR base)',
    ),
    name: "Google News · Pacific Theater",
    theater: "china-taiwan",
    unfiltered: true,
  },
];

const KOREA: NewsFeedDef[] = [
  { url: "https://feeds.bbci.co.uk/news/world/asia/rss.xml", name: "BBC", theater: "korea" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/AsiaPacific.xml", name: "NYT", theater: "korea" },
  { url: "https://feeds.reuters.com/Reuters/worldNews", name: "Reuters", theater: "korea" },
  {
    url: "https://www.yna.co.kr/rss/northkorea.xml",
    name: "연합뉴스 북한",
    theater: "korea",
    unfiltered: true,
  },
  {
    url: G(
      '(North Korea OR Pyongyang) AND (missile OR nuclear OR "Kim Jong Un") AND (site:nknews.org OR site:dailynk.com OR site:yna.co.kr)',
    ),
    name: "Google News",
    theater: "korea",
    unfiltered: true,
  },
  {
    url: G("Korean peninsula DMZ tension military"),
    name: "Google News",
    theater: "korea",
    unfiltered: true,
  },
  {
    url: G(
      '("South Korea" OR Seoul OR USFK OR "Korean peninsula") (missile OR North OR China OR "combined exercise" OR trilateral OR defense)',
    ),
    name: "Google News · Korea Security",
    theater: "korea",
    unfiltered: true,
  },
  {
    url: G(
      '("South Korea" OR Seoul OR ROK) (warn OR warning OR threat OR threaten OR criticiz OR condemn OR sanction OR pressure OR slam OR accuse OR "foreign ministry" OR spokeswoman OR remarks OR statement) (China OR Beijing OR Pyongyang OR "North Korea" OR Moscow OR Tokyo OR Washington OR Japan OR Russia)',
    ),
    name: "Google News · Remarks aimed at Korea",
    theater: "korea",
    unfiltered: true,
  },
];

const JAPAN: NewsFeedDef[] = [
  { url: "https://feeds.bbci.co.uk/news/world/asia/rss.xml", name: "BBC", theater: "japan" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/AsiaPacific.xml", name: "NYT", theater: "japan" },
  {
    url: G(
      '(Japan OR "Tokyo") AND (security OR defense OR "maritime") AND (site:kyodonews.net OR site:nikkei.com OR site:japantimes.co.jp)',
    ),
    name: "Google News",
    theater: "japan",
    unfiltered: true,
  },
  {
    url: G("Japan military Senkaku defense"),
    name: "Google News",
    theater: "japan",
    unfiltered: true,
  },
  {
    url: G(
      '(AUKUS OR Quad OR "Indo-Pacific" OR "trilateral" OR "US Japan Australia") (defense OR security OR submarine OR alliance OR exercise)',
    ),
    name: "Google News · AUKUS · Quad",
    theater: "japan",
    unfiltered: true,
  },
  {
    url: G(
      '(Japan OR Australia OR "Self-Defense Force") (China OR PLA OR missile OR "counterstrike" OR "defense budget" OR Okinawa)',
    ),
    name: "Google News · Japan · Indo-Pacific Defense",
    theater: "japan",
    unfiltered: true,
  },
];

const SOUTH_ASIA: NewsFeedDef[] = [
  { url: "https://feeds.bbci.co.uk/news/world/asia/rss.xml", name: "BBC", theater: "south-asia" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/AsiaPacific.xml", name: "NYT", theater: "south-asia" },
  { url: "https://feeds.reuters.com/Reuters/worldNews", name: "Reuters", theater: "south-asia" },
  {
    url: G(
      '(India OR Modi) AND (geopolitics OR "foreign policy" OR security) AND (site:thehindu.com OR site:indianexpress.com)',
    ),
    name: "Google News · India",
    theater: "south-asia",
    unfiltered: true,
  },
  {
    url: G('("Line of Actual Control" OR India OR Pakistan) AND (border OR tension)'),
    name: "Google News · LAC",
    theater: "south-asia",
    unfiltered: true,
  },
  {
    url: G("India Pakistan military Kashmir conflict"),
    name: "Google News",
    theater: "south-asia",
    unfiltered: true,
  },
  {
    url: G("Afghanistan Taliban military strike"),
    name: "Google News",
    theater: "south-asia",
    unfiltered: true,
  },
  {
    url: G(
      '("Indian Ocean" OR Maldives OR "Bay of Bengal" OR Andaman OR "Sri Lanka" OR Hambantota) (navy OR China OR India OR port OR base OR security)',
    ),
    name: "Google News · Indian Ocean",
    theater: "south-asia",
    unfiltered: true,
  },
  {
    url: G(
      '(India OR Pakistan OR Bangladesh OR Myanmar) (navy OR missile OR border OR "Chinese port" OR BRI OR "string of pearls")',
    ),
    name: "Google News · South Asia Security",
    theater: "south-asia",
    unfiltered: true,
  },
];

/** 북극 — 항로·자원·군사 주권 경쟁 */
const ARCTIC: NewsFeedDef[] = [
  {
    url: G(
      '(Arctic OR "Northern Sea Route" OR "Northwest Passage" OR Svalbard OR Greenland) (military OR navy OR Russia OR NATO OR China OR security OR base OR icebreaker)',
    ),
    name: "Google News · Arctic Security",
    theater: "arctic",
    unfiltered: true,
  },
  {
    url: G(
      '(Arctic OR "High North" OR Barents OR "Arctic Council") (Russia OR Norway OR "United States" OR Canada OR NATO OR submarine OR radar)',
    ),
    name: "Google News · High North",
    theater: "arctic",
    unfiltered: true,
  },
  {
    url: G(
      '("Northern Sea Route" OR "Arctic shipping" OR icebreaker OR "Arctic LNG") (Russia OR China OR sanction OR military)',
    ),
    name: "Google News · Arctic Route",
    theater: "arctic",
    unfiltered: true,
  },
];

/** 대서양 — NATO·GIUK·대서양 동맹 해역 */
const ATLANTIC: NewsFeedDef[] = [
  {
    url: G(
      '("North Atlantic" OR GIUK OR "GIUK gap" OR Iceland OR Greenland OR "Atlantic Fleet") (NATO OR submarine OR Russia OR navy OR patrol OR exercise)',
    ),
    name: "Google News · North Atlantic",
    theater: "atlantic",
    unfiltered: true,
  },
  {
    url: G(
      '(NATO OR "North Atlantic") (submarine OR "anti-submarine" OR "maritime security" OR convoy OR "sea lines") (Russia OR Atlantic OR Arctic)',
    ),
    name: "Google News · NATO Atlantic",
    theater: "atlantic",
    unfiltered: true,
  },
  {
    url: G(
      '("Atlantic Alliance" OR "transatlantic" OR "US Navy" OR "Second Fleet") (Atlantic OR Europe OR Russia OR deployment OR exercise)',
    ),
    name: "Google News · Transatlantic Defense",
    theater: "atlantic",
    unfiltered: true,
  },
];

const SHARED_ECONOMY: NewsFeedDef[] = [
  // —— 시장 와이어 (속보 뼈대) ——
  {
    url: "https://feeds.reuters.com/reuters/businessNews",
    name: "Reuters Business",
    theater: "global",
    topic: "economy",
    econGenre: "markets",
    unfiltered: true,
  },
  {
    url: "https://feeds.content.dowjones.io/public/rss/RSSMarketsMain",
    name: "WSJ Markets",
    theater: "global",
    topic: "economy",
    econGenre: "markets",
    unfiltered: true,
  },
  {
    url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114",
    name: "CNBC",
    theater: "global",
    topic: "economy",
    econGenre: "markets",
    unfiltered: true,
  },
  {
    url: "https://www.ft.com/?format=rss",
    name: "Financial Times",
    theater: "global",
    topic: "economy",
    econGenre: "markets",
    unfiltered: true,
  },
  {
    url: "https://feeds.bbci.co.uk/news/business/rss.xml",
    name: "BBC Business",
    theater: "global",
    topic: "economy",
    econGenre: "markets",
    unfiltered: true,
  },
  {
    url: "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml",
    name: "NYT Business",
    theater: "global",
    topic: "economy",
    econGenre: "markets",
    unfiltered: true,
  },
  {
    url: "https://feeds.bloomberg.com/markets/news.rss",
    name: "Bloomberg Markets",
    theater: "global",
    topic: "economy",
    econGenre: "markets",
    unfiltered: true,
  },

  // —— AI · 빅테크 ——
  {
    url: G(
      '(Apple OR Microsoft OR Google OR Alphabet OR Amazon OR Meta OR "OpenAI" OR Netflix) (stock OR earnings OR revenue OR AI OR cloud OR antitrust)',
    ),
    name: "Google · Big Tech",
    theater: "global",
    topic: "economy",
    econGenre: "tech",
    unfiltered: true,
  },
  {
    url: G(
      '("OpenAI" OR Anthropic OR "Google DeepMind" OR "Microsoft Copilot" OR ChatGPT OR "generative AI") (funding OR valuation OR partnership OR enterprise)',
    ),
    name: "Google · AI Labs",
    theater: "global",
    topic: "economy",
    econGenre: "tech",
    unfiltered: true,
  },
  {
    url: G(
      '(Amazon OR AWS OR "Microsoft Azure" OR "Google Cloud" OR Oracle) (cloud OR "data center" OR capex OR AI)',
    ),
    name: "Google · Cloud Majors",
    theater: "global",
    topic: "economy",
    econGenre: "tech",
    unfiltered: true,
  },

  // —— 반도체 (엔비디아·파운드리·장비) ——
  {
    url: G(
      '(Nvidia OR TSMC OR ASML OR "SK hynix" OR Samsung OR Intel OR AMD OR Broadcom OR Qualcomm) (chip OR semiconductor OR GPU OR foundry OR earnings)',
    ),
    name: "Google · Chip Majors",
    theater: "global",
    topic: "economy",
    econGenre: "chips",
    unfiltered: true,
  },
  {
    url: G(
      '(Nvidia OR "Jensen Huang") (GPU OR AI OR "data center" OR Blackwell OR CUDA)',
    ),
    name: "Google · Nvidia",
    theater: "global",
    topic: "economy",
    econGenre: "chips",
    unfiltered: true,
  },
  {
    url: G(
      '(TSMC OR "Taiwan Semiconductor") (capacity OR fab OR Apple OR Nvidia OR "advanced node")',
    ),
    name: "Google · TSMC",
    theater: "china-taiwan",
    topic: "economy",
    econGenre: "chips",
    unfiltered: true,
  },
  {
    url: G(
      '(ASML OR "extreme ultraviolet" OR EUV) (lithography OR chip OR semiconductor)',
    ),
    name: "Google · ASML",
    theater: "global",
    topic: "economy",
    econGenre: "chips",
    unfiltered: true,
  },
  {
    url: G(
      '("export control" OR "chip ban" OR "CHIPS Act") (China OR Huawei OR semiconductor OR Nvidia)',
    ),
    name: "Google · Chip Controls",
    theater: "china-taiwan",
    topic: "economy",
    econGenre: "chips",
    unfiltered: true,
  },

  // —— 전기차 · 모빌리티 · 배터리 ——
  {
    url: G(
      '(Tesla OR BYD OR Toyota OR Hyundai OR "Volkswagen" OR Rivian) (EV OR "electric vehicle" OR delivery OR earnings OR Autopilot)',
    ),
    name: "Google · EV Makers",
    theater: "global",
    topic: "economy",
    econGenre: "auto",
    unfiltered: true,
  },
  {
    url: G(
      '(CATL OR Panasonic OR "LG Energy" OR "Samsung SDI" OR "solid-state battery") (battery OR EV OR gigafactory)',
    ),
    name: "Google · Batteries",
    theater: "global",
    topic: "economy",
    econGenre: "auto",
    unfiltered: true,
  },
  {
    url: G(
      '(Tesla OR "Elon Musk") (stock OR Robotaxi OR Optimus OR energy OR Gigafactory)',
    ),
    name: "Google · Tesla",
    theater: "global",
    topic: "economy",
    econGenre: "auto",
    unfiltered: true,
  },

  // —— 에너지 메이저 ——
  {
    url: G(
      '("Exxon Mobil" OR ExxonMobil OR Chevron OR Shell OR BP OR TotalEnergies OR Aramco OR Equinor) (oil OR gas OR LNG OR earnings OR dividend)',
    ),
    name: "Google · Oil Majors",
    theater: "global",
    topic: "economy",
    econGenre: "energy",
    unfiltered: true,
  },
  {
    url: G('"oil price" OR OPEC OR Brent OR WTI OR "natural gas" OR LNG'),
    name: "Google · Energy Prices",
    theater: "global",
    topic: "economy",
    econGenre: "energy",
    unfiltered: true,
  },
  {
    url: G(
      '(Aramco OR ADNOC OR "QatarEnergy" OR "Petronas") (LNG OR oil OR investment OR IPO)',
    ),
    name: "Google · NOCs",
    theater: "middle-east",
    topic: "economy",
    econGenre: "energy",
    unfiltered: true,
  },

  // —— 해운 · 물류 기업 ——
  {
    url: G(
      '(Maersk OR "MSC" OR COSCO OR Hapag-Lloyd OR "Evergreen Marine" OR "HMM") (freight OR container OR shipping OR rate)',
    ),
    name: "Google · Shipping Lines",
    theater: "global",
    topic: "economy",
    econGenre: "shipping",
    unfiltered: true,
  },
  {
    url: G(
      '("Red Sea" OR Suez OR Hormuz OR Malacca OR "Taiwan Strait" OR "Panama Canal" OR "Bab el-Mandeb" OR Bosporus) (oil OR crude OR LNG OR freight OR shipping OR tanker OR insurance OR logistics OR reroute)',
    ),
    name: "Google · Chokepoint Freight · Oil",
    theater: "global",
    topic: "economy",
    econGenre: "shipping",
    unfiltered: true,
  },
  {
    url: G('"Red Sea" OR Suez OR Hormuz OR "shipping rates" OR "container freight" OR Baltic'),
    name: "Google · Freight Routes",
    theater: "middle-east",
    topic: "economy",
    econGenre: "shipping",
    unfiltered: true,
  },
  {
    url: G(
      '(FedEx OR UPS OR "DHL" OR "Amazon logistics") (shipping OR freight OR supply OR warehouse)',
    ),
    name: "Google · Logistics",
    theater: "global",
    topic: "economy",
    econGenre: "shipping",
    unfiltered: true,
  },

  // —— 인프라 · 광물 · 케이블 ——
  {
    url: G(
      '("critical minerals" OR "rare earth" OR lithium OR cobalt OR nickel) (mining OR China OR Australia OR investment)',
    ),
    name: "Google · Critical Minerals",
    theater: "global",
    topic: "economy",
    econGenre: "infra",
    unfiltered: true,
  },
  {
    url: G(
      '("subsea cable" OR "undersea cable" OR "data center") (Google OR Microsoft OR Amazon OR Meta OR investment)',
    ),
    name: "Google · Cables · DC",
    theater: "global",
    topic: "economy",
    econGenre: "infra",
    unfiltered: true,
  },
  {
    url: G(
      '("Belt and Road" OR BRI OR AIIB OR "port investment" OR "foreign direct investment") infrastructure',
    ),
    name: "Google · BRI · FDI",
    theater: "global",
    topic: "economy",
    econGenre: "infra",
    unfiltered: true,
  },

  // —— 거시·정책 (짧게) ——
  {
    url: G(
      'Fed OR ECB OR "Bank of Japan" OR "Federal Reserve" (rate OR hike OR cut OR inflation)',
    ),
    name: "Google · Central Banks",
    theater: "global",
    topic: "economy",
    econGenre: "macro",
    unfiltered: true,
  },
  {
    url: G(
      'sanctions OR tariff OR "trade war" OR "export control" OR WTO (China OR US OR EU)',
    ),
    name: "Google · Trade · Sanctions",
    theater: "global",
    topic: "economy",
    econGenre: "macro",
    unfiltered: true,
  },
  {
    url: "https://www.imf.org/en/News/RSS",
    name: "IMF News",
    theater: "global",
    topic: "economy",
    econGenre: "macro",
    unfiltered: true,
  },

  // —— 미·중 경쟁 · 중국·아시아 거시/테크 (미국 일변도 방지) ——
  {
    url: G(
      '(China OR Beijing OR PBOC OR "People\'s Bank of China" OR yuan OR renminbi) (GDP OR inflation OR stimulus OR "property" OR "local government debt" OR "industrial policy")',
    ),
    name: "Google · China Macro",
    theater: "china-taiwan",
    topic: "economy",
    econGenre: "macro",
    unfiltered: true,
  },
  {
    url: G(
      '(Huawei OR Alibaba OR Tencent OR ByteDance OR "SMIC" OR CATL OR BYD OR Xiaomi) (China OR Chinese) (stock OR earnings OR AI OR chip OR EV OR export)',
    ),
    name: "Google · China Tech · Majors",
    theater: "china-taiwan",
    topic: "economy",
    econGenre: "tech",
    unfiltered: true,
  },
  {
    url: G(
      '("US China" OR "U.S.-China" OR "China US" OR "trade war" OR "export control" OR "rare earth" OR de-risking OR decoupling) (tariff OR semiconductor OR EV OR investment)',
    ),
    name: "Google · US–China Rivalry",
    theater: "global",
    topic: "economy",
    econGenre: "macro",
    unfiltered: true,
  },
  {
    url: G(
      '(Japan OR Korea OR India OR ASEAN OR "Bank of Japan" OR "Bank of Korea" OR RBI) (rate OR inflation OR GDP OR semiconductor OR supply chain)',
    ),
    name: "Google · Asia Macro · Peers",
    theater: "global",
    topic: "economy",
    econGenre: "macro",
    unfiltered: true,
  },
  {
    url: G(
      '(Korea OR "South Korea" OR Seoul OR Samsung OR "SK hynix" OR Hyundai OR "Bank of Korea") (stock OR earnings OR chip OR rate OR GDP OR export OR tariff OR "supply chain" OR investment OR FDI OR semiconductor)',
    ),
    name: "Google · Korea Macro · Majors",
    theater: "korea",
    topic: "economy",
    econGenre: "macro",
    unfiltered: true,
  },
  {
    url: G(
      '("South Korea" OR Seoul OR Samsung OR "SK hynix" OR Hyundai) (China OR US OR Japan OR tariff OR sanction OR "export control" OR "supply chain" OR chip OR semiconductor) (earnings OR GDP OR export OR investment OR plant OR factory) -opinion -editorial -column',
    ),
    name: "Google · Korea Geoeconomic Hard News",
    theater: "korea",
    topic: "economy",
    econGenre: "macro",
    unfiltered: true,
  },
  {
    url: G(
      '(Japan OR Tokyo OR Toyota OR SoftBank OR Sony OR "Bank of Japan" OR yen) (stock OR earnings OR rate OR GDP OR semiconductor OR export)',
    ),
    name: "Google · Japan Macro · Majors",
    theater: "japan",
    topic: "economy",
    econGenre: "macro",
    unfiltered: true,
  },

  // —— 유럽 · 러시아 거시/에너지/제재 ——
  {
    url: G(
      '(ECB OR "European Central Bank" OR Lagarde OR Eurozone OR Germany OR France OR "EU Commission") (rate OR inflation OR GDP OR fiscal OR industrial)',
    ),
    name: "Google · Europe Macro",
    theater: "global",
    topic: "economy",
    econGenre: "macro",
    unfiltered: true,
  },
  {
    url: G(
      '(Siemens OR SAP OR "LVMH" OR Volkswagen OR TotalEnergies OR BP OR Nestle OR "Deutsche Bank") (earnings OR stock OR Europe OR EU)',
    ),
    name: "Google · Europe Majors",
    theater: "global",
    topic: "economy",
    econGenre: "markets",
    unfiltered: true,
  },
  {
    url: G(
      '(Russia OR Moscow OR Kremlin OR Gazprom OR Rosneft OR "Central Bank of Russia" OR ruble) (sanction OR oil OR gas OR energy OR economy OR export)',
    ),
    name: "Google · Russia Economy · Energy",
    theater: "russia-ukraine",
    topic: "economy",
    econGenre: "energy",
    unfiltered: true,
  },
  {
    url: G(
      '(Russia OR Ukraine) (sanction OR "oil price cap" OR pipeline OR LNG OR "shadow fleet" OR grain OR wheat)',
    ),
    name: "Google · Russia–EU Energy · Trade",
    theater: "russia-ukraine",
    topic: "economy",
    econGenre: "macro",
    unfiltered: true,
  },
];

/** 중앙아시아 — global 전장 Google 쿼리 (NewsTheater 별도 버킷 없음) */
const CENTRAL_ASIA_GOOGLE: NewsFeedDef[] = [
  {
    url: G('(Central Asia) AND ("Great Game" OR "Geopolitics" OR "Security")'),
    name: "Google News · Central Asia",
    theater: "global",
    unfiltered: true,
  },
];

/**
 * 국가 간 외교·동맹 재편 — 신냉전 질서(정상회담·동맹·정상화·다자외교).
 * 전쟁 피드만으로는 안 보이는 관계 재편을 지정학 탭에 보강.
 */
const DIPLOMACY_GOOGLE: NewsFeedDef[] = [
  {
    url: G(
      '(diplomacy OR "diplomatic relations" OR "foreign minister" OR summit OR "state visit" OR alliance) (geopolitics OR "great power" OR "cold war" OR realignment OR "strategic partnership")',
    ),
    name: "Google News · Interstate Diplomacy",
    theater: "global",
    unfiltered: true,
  },
  {
    url: G(
      '("US China" OR "United States China" OR "US-China") (diplomacy OR summit OR "state visit" OR bilateral OR "strategic dialogue" OR "foreign minister")',
    ),
    name: "Google News · US–China Diplomacy",
    theater: "china-taiwan",
    unfiltered: true,
  },
  {
    url: G(
      '(NATO OR "European Union" OR G7 OR "EU summit") (diplomacy OR summit OR enlargement OR accession OR "security partnership" OR "foreign minister")',
    ),
    name: "Google News · NATO · EU Diplomacy",
    theater: "russia-ukraine",
    unfiltered: true,
  },
  {
    url: G(
      '("Russia China" OR "Russia North Korea" OR "China North Korea" OR BRICS) (summit OR treaty OR alliance OR partnership OR diplomacy OR "state visit")',
    ),
    name: "Google News · Axis Diplomacy",
    theater: "global",
    unfiltered: true,
  },
  // —— 반서방·비서방 축 국가 간 외교 (서로 간의 정상회담·조약·다자기구) ——
  {
    url: G(
      '("Russia China" OR "Putin Xi" OR "Beijing Moscow") (diplomacy OR summit OR treaty OR alliance OR "no-limits" OR partnership OR "state visit" OR "foreign minister")',
    ),
    name: "Google News · Russia–China Diplomacy",
    theater: "china-taiwan",
    unfiltered: true,
  },
  {
    url: G(
      '("Russia Iran" OR "Iran Russia" OR "Moscow Tehran" OR "Putin Raisi" OR "Putin Pezeshkian") (diplomacy OR summit OR treaty OR alliance OR partnership OR "state visit" OR "foreign minister")',
    ),
    name: "Google News · Russia–Iran Diplomacy",
    theater: "middle-east",
    unfiltered: true,
  },
  {
    url: G(
      '("China Iran" OR "Iran China" OR "Beijing Tehran" OR "comprehensive strategic partnership" Iran China) (diplomacy OR summit OR treaty OR partnership OR "state visit" OR "foreign minister")',
    ),
    name: "Google News · China–Iran Diplomacy",
    theater: "middle-east",
    unfiltered: true,
  },
  {
    url: G(
      '("Russia North Korea" OR "North Korea Russia" OR "Putin Kim" OR "Pyongyang Moscow" OR "Kim Jong Un" Russia) (diplomacy OR summit OR treaty OR alliance OR partnership OR "state visit")',
    ),
    name: "Google News · Russia–DPRK Diplomacy",
    theater: "korea",
    unfiltered: true,
  },
  {
    url: G(
      '("China North Korea" OR "North Korea China" OR "Beijing Pyongyang" OR "Xi Kim" OR "Kim Jong Un" China) (diplomacy OR summit OR treaty OR alliance OR partnership OR "state visit")',
    ),
    name: "Google News · China–DPRK Diplomacy",
    theater: "korea",
    unfiltered: true,
  },
  {
    url: G(
      '("Iran North Korea" OR "North Korea Iran" OR "Tehran Pyongyang") (diplomacy OR summit OR missile OR nuclear OR partnership OR "foreign minister")',
    ),
    name: "Google News · Iran–DPRK Diplomacy",
    theater: "korea",
    unfiltered: true,
  },
  {
    url: G(
      '("Russia China Iran" OR "China Russia Iran" OR "axis of upheaval" OR "CRINK") (diplomacy OR summit OR alliance OR partnership OR coordination)',
    ),
    name: "Google News · Russia–China–Iran Axis",
    theater: "global",
    unfiltered: true,
  },
  {
    url: G(
      '(SCO OR "Shanghai Cooperation" OR CSTO OR "Collective Security Treaty") (summit OR diplomacy OR membership OR enlargement OR "foreign minister" OR partnership)',
    ),
    name: "Google News · SCO · CSTO Diplomacy",
    theater: "global",
    unfiltered: true,
  },
  {
    url: G(
      '(BRICS OR "BRICS+" OR "BRICS summit") (diplomacy OR enlargement OR membership OR "Global South" OR partnership OR "de-dollar" OR "new development bank") -Quad -NATO',
    ),
    name: "Google News · BRICS Diplomacy",
    theater: "global",
    unfiltered: true,
  },
  {
    url: G(
      '(Belarus OR Lukashenko) (Russia OR China OR Iran OR "North Korea") (diplomacy OR summit OR treaty OR alliance OR "state visit" OR partnership)',
    ),
    name: "Google News · Belarus Axis Diplomacy",
    theater: "russia-ukraine",
    unfiltered: true,
  },
  {
    url: G(
      '(Venezuela OR Cuba OR Nicaragua OR Maduro OR Díaz-Canel) (Russia OR China OR Iran) (diplomacy OR summit OR alliance OR partnership OR "state visit" OR "foreign minister")',
    ),
    name: "Google News · LatAm Anti-West Diplomacy",
    theater: "global",
    unfiltered: true,
  },
  {
    url: G(
      '(Syria OR Assad OR "Bashar al-Assad") (Russia OR Iran OR China OR "North Korea") (diplomacy OR summit OR alliance OR partnership OR "state visit" OR recognition)',
    ),
    name: "Google News · Syria Axis Diplomacy",
    theater: "middle-east",
    unfiltered: true,
  },
  {
    url: G(
      '(Sahel OR Mali OR Niger OR Burkina OR Wagner OR "Africa Corps") (Russia OR China OR Iran) (diplomacy OR military OR partnership OR "security agreement" OR "foreign minister")',
    ),
    name: "Google News · Sahel–Russia Diplomacy",
    theater: "global",
    unfiltered: true,
  },
  {
    url: G(
      '("Global South" OR "non-aligned" OR NAM OR "anti-Western" OR "multipolar") (diplomacy OR summit OR alliance OR partnership OR "foreign minister" OR realignment)',
    ),
    name: "Google News · Global South · Multipolar Diplomacy",
    theater: "global",
    unfiltered: true,
  },
  {
    url: G(
      '(Israel OR Iran OR Saudi OR UAE OR Qatar OR "Abraham Accords") (diplomacy OR normalization OR mediation OR ceasefire OR "foreign minister" OR summit)',
    ),
    name: "Google News · Middle East Diplomacy",
    theater: "middle-east",
    unfiltered: true,
  },
  {
    url: G(
      '("South Korea" OR Japan OR trilateral OR "Camp David") (diplomacy OR summit OR alliance OR "foreign minister" OR "security cooperation" OR "state visit")',
    ),
    name: "Google News · Korea–Japan Diplomacy",
    theater: "korea",
    unfiltered: true,
  },
  {
    url: G(
      '(Japan OR Tokyo) (diplomacy OR summit OR "foreign minister" OR "security partnership" OR "Quad" OR "state visit")',
    ),
    name: "Google News · Japan Diplomacy",
    theater: "japan",
    unfiltered: true,
  },
  {
    url: G(
      '(India OR Quad OR BRICS OR "Global South" OR Modi) (diplomacy OR summit OR "foreign policy" OR "strategic partnership" OR "foreign minister")',
    ),
    name: "Google News · India · Multilateral Diplomacy",
    theater: "south-asia",
    unfiltered: true,
  },
  {
    url: G(
      '(Ukraine OR Russia) (diplomacy OR negotiation OR "peace talks" OR mediator OR "foreign minister" OR summit OR "security guarantee")',
    ),
    name: "Google News · Ukraine Diplomacy",
    theater: "russia-ukraine",
    unfiltered: true,
  },
];

/** 지역별 주요 Google News RSS 쿼리 (문서·디버그용) */
export const GOOGLE_NEWS_QUERIES: Record<string, string> = {
  "china-taiwan": '(Taiwan OR "South China Sea") AND (military OR "PLA" OR "White House")',
  "us-china-rivalry":
    '("US China" OR "US-China" OR "great power competition") (military OR navy OR Taiwan OR Indo-Pacific)',
  "south-china-sea":
    '("South China Sea" OR Scarborough OR Spratly OR "West Philippine Sea") (China OR Philippines OR navy)',
  "pacific-theater":
    '(Guam OR "Philippine Sea" OR "island chain") (China OR PLA OR US OR Navy)',
  korea:
    '(North Korea OR Pyongyang) AND (missile OR nuclear OR "Kim Jong Un") AND (site:nknews.org OR site:dailynk.com OR site:yna.co.kr)',
  japan:
    '(Japan OR "Tokyo") AND (security OR defense OR "maritime") AND (site:kyodonews.net OR site:nikkei.com OR site:japantimes.co.jp)',
  "aukus-quad":
    '(AUKUS OR Quad OR "Indo-Pacific") (defense OR security OR alliance OR submarine)',
  "south-asia-india":
    '(India OR Modi) AND (geopolitics OR "foreign policy" OR security) AND (site:thehindu.com OR site:indianexpress.com)',
  "south-asia-lac": '("Line of Actual Control" OR India OR Pakistan) AND (border OR tension)',
  "indian-ocean":
    '("Indian Ocean" OR Maldives OR "Bay of Bengal" OR Andaman) (navy OR China OR India OR port OR security)',
  arctic:
    '(Arctic OR "Northern Sea Route" OR "High North" OR Greenland) (military OR navy OR NATO OR Russia OR China)',
  atlantic:
    '("North Atlantic" OR GIUK OR "Atlantic Fleet") (NATO OR submarine OR Russia OR navy)',
  "central-asia": '(Central Asia) AND ("Great Game" OR "Geopolitics" OR "Security")',
  diplomacy:
    '(diplomacy OR "diplomatic relations" OR "foreign minister" OR summit OR alliance) (geopolitics OR "great power" OR realignment)',
  "diplomacy-us-china":
    '("US China" OR "US-China") (diplomacy OR summit OR bilateral OR "strategic dialogue")',
  "diplomacy-nato-eu":
    '(NATO OR "European Union" OR G7) (diplomacy OR summit OR enlargement OR "security partnership")',
  "diplomacy-middle-east":
    '(Israel OR Iran OR Saudi OR UAE OR "Abraham Accords") (diplomacy OR normalization OR mediation)',
  "diplomacy-anti-west":
    '("Russia China" OR "Russia Iran" OR "China Iran" OR "Russia North Korea" OR SCO OR CSTO OR BRICS) (diplomacy OR summit OR treaty OR alliance)',
  "diplomacy-axis-latam":
    '(Venezuela OR Cuba OR Nicaragua) (Russia OR China OR Iran) (diplomacy OR summit OR partnership)',
  "diplomacy-sahel-russia":
    '(Mali OR Niger OR Burkina OR Sahel) (Russia OR China) (diplomacy OR partnership OR "security agreement")',
  "economy-energy":
    '("Exxon Mobil" OR Chevron OR Shell OR Aramco OR OPEC OR Brent OR LNG)',
  "economy-macro":
    'Fed OR ECB OR sanctions OR tariff OR "trade war" OR inflation',
  "economy-shipping":
    '(Maersk OR COSCO OR "Red Sea" OR Suez OR Hormuz OR Malacca OR "Panama Canal" OR "shipping rates" OR freight OR tanker)',
  "economy-chips":
    '(Nvidia OR TSMC OR ASML OR Samsung OR "SK hynix" OR Intel OR AMD) (chip OR semiconductor OR GPU)',
  "economy-tech":
    '(Apple OR Microsoft OR Google OR Amazon OR Meta OR OpenAI) (stock OR AI OR cloud OR earnings)',
  "economy-auto":
    '(Tesla OR BYD OR Toyota OR Hyundai OR CATL) (EV OR battery OR earnings)',
  "economy-infra-critical":
    '("critical minerals" OR "rare earth" OR "subsea cable" OR "data center") investment',
  "economy-infra-bri":
    '"Belt and Road" OR BRI OR AIIB OR "port investment" OR FDI',
};

export const ECON_RELEVANCE =
  /oil|gas|lng|opec|brent|wti|crude|sanction|tariff|trade|fed|ecb|rate|inflation|gdp|recession|supply\s?chain|shipping|freight|container|hormuz|suez|red\s?sea|malacca|panama|bab[\s-]?el|bosporus|taiwan\s?strait|tanker|semiconductor|chip|gpu|nvidia|tsmc|asml|samsung|hynix|intel|amd|broadcom|qualcomm|apple|microsoft|google|alphabet|amazon|meta|openai|anthropic|tesla|byd|toyota|hyundai|catl|exxon|chevron|shell|aramco|bp|totalenergies|maersk|cosco|hapag|fedex|ups|datacenter|data\s?center|cloud|aws|azure|market|stocks|earnings|bond|dollar|yuan|yen|euro|commodit|energy|pipeline|bank|currency|imf|wto|export|import|port\b|vix|infrastructure|bri\b|belt\s?and\s?road|aiib|world\s?bank|adb\b|fdi|foreign\s?direct|critical\s?mineral|rare\s?earth|lithium|cobalt|subsea|undersea\s?cable|rail\s?corridor|power\s?grid|chips?\s?act|foundry|euv|gigafactory|ev\b|electric\s?vehicle|battery|sovereign\s?debt|fiscal|oecd|antitrust|capex/i;

export const THEATER_RELEVANCE: Record<NewsTheater, RegExp> = {
  "middle-east":
    /iran|israel|idf|irgc|hezbollah|hamas|houthi|lebanon|gaza|tehran|tel\s?aviv|jerusalem|yemen|iraq|syria|gulf|hormuz|red\s?sea|missile|strike|nuclear|centcom|middle\s?east|west\s?bank|golan|khamenei|netanyahu|drone|saudi|emirates|uae|gcc|abraham\s?accords|normalization|diplomacy|summit|mediation/i,
  "russia-ukraine":
    /ukrain|russia|russian|putin|zelensky|kyiv|kharkiv|odesa|dnipro|donbas|crimea|sevastopol|kremlin|moscow|belgorod|wagner|himars|atacms|shahed|nato|diplomacy|summit|negotiation|peace\s?talks|foreign\s?minister/i,
  "china-taiwan":
    /china|taiwan|taipei|beijing|pla|strait|senkaku|diaoyu|south\s?china\s?sea|west\s?philippine\s?sea|scarborough|spratly|paracel|xi\s?jinping|cross[\s-]?strait|kinmen|us[\s-]?china|indo[\s-]?pacific|guam|philippine\s?sea|first\s?island\s?chain|second\s?island\s?chain|great\s?power\s?competition|diplomacy|summit|bilateral|strategic\s?dialogue|state\s?visit/i,
  korea:
    /north\s?korea|south\s?korea|pyongyang|seoul|dmz|dprk|kim\s?jong|korean\s?peninsula|icbm|ballistic|rok\b|usfk|diplomacy|summit|trilateral|alliance|foreign\s?minister/i,
  japan:
    /japan|tokyo|okinawa|senkaku|self[\s-]?defense\s?force|sdf|yasukuni|north\s?korea\s?japan|aukus|quad\b|indo[\s-]?pacific|australia|diplomacy|summit|alliance|foreign\s?minister|state\s?visit|counterstrike|defense\s?budget/i,
  "south-asia":
    /india|pakistan|kashmir|afghanistan|taliban|myanmar|bangladesh|sri\s?lanka|nepal|maldives|modi|rawalpindi|line\s?of\s?actual\s?control|lac\b|indian\s?ocean|bay\s?of\s?bengal|andaman|hambantota|string\s?of\s?pearls|central\s?asia|kazakh|uzbek|turkmen|kyrgyz|tajik|diplomacy|summit|brics|quad|foreign\s?policy|strategic\s?partnership/i,
  arctic:
    /arctic|high\s?north|northern\s?sea\s?route|northwest\s?passage|svalbard|greenland|barents|arctic\s?council|icebreaker|arctic\s?lng|polar\s?silk|북극|북해항로|그린란드|스발바르/i,
  atlantic:
    /north\s?atlantic|giuk|atlantic\s?fleet|second\s?fleet|transatlantic|atlantic\s?alliance|anti[\s-]?submarine|sea\s?lines|iceland|azores|대서양|대서양동맹|지유케이/i,
  global:
    /military|defense|war|conflict|strike|missile|pentagon|nato|sanction|geopolitic|great\s?game|central\s?asia|diplomacy|diplomatic|summit|alliance|embassy|foreign\s?minister|bilateral|multilateral|realignment|state\s?visit|strategic\s?partnership|brics|g7|sco\b|csto|multipolar|global\s?south|non[\s-]?aligned|venezuela|cuba|nicaragua|sahel|wagner|africa\s?corps|crink|axis\s?of\s?upheaval/i,
};

const NOISE =
  /world.?cup|\bfifa\b|\bioc\b|olympic|premier.?league|champions.?league|super.?bowl|\bnba\b|\bnfl\b|\bnhl\b|\bmlb\b|grammy|oscar|\bemmy|box.?office|celebrity|eurovision/i;

export const ALL_NEWS_FEEDS: NewsFeedDef[] = dedupeFeedsByUrl([
  ...MIDDLE_EAST,
  ...RUSSIA_UKRAINE,
  ...CHINA_TAIWAN,
  ...KOREA,
  ...JAPAN,
  ...SOUTH_ASIA,
  ...ARCTIC,
  ...ATLANTIC,
  ...CENTRAL_ASIA_GOOGLE,
  ...DIPLOMACY_GOOGLE,
  ...SHARED_DEFENSE,
]);

export const ALL_ECON_FEEDS: NewsFeedDef[] = dedupeFeedsByUrl(SHARED_ECONOMY);

function dedupeFeedsByUrl(feeds: NewsFeedDef[]): NewsFeedDef[] {
  const seen = new Set<string>();
  return feeds.filter((feed) => {
    if (seen.has(feed.url)) return false;
    seen.add(feed.url);
    return true;
  });
}

/** view 패키지에 따라 defense / economy RSS 목록 선택 */
export function feedsForPackages(packages: ViewPackageId[]): NewsFeedDef[] {
  const ids = packages.length > 0 ? packages : DEFAULT_PACKAGE_SELECTION;
  const wantEcon = ids.includes("geo-trader");
  const wantDefense = ids.some((id) => id !== "geo-trader") || ids.length > 1;

  const merged: NewsFeedDef[] = [];
  if (wantDefense) merged.push(...ALL_NEWS_FEEDS);
  if (wantEcon) merged.push(...ALL_ECON_FEEDS);
  return dedupeFeedsByUrl(merged);
}

export function isEconomyNewsMode(packages: ViewPackageId[]): boolean {
  const ids = packages.filter((id) => id !== "custom");
  return ids.length > 0 && ids.every((id) => id === "geo-trader");
}

export function isFeedItemRelevant(
  title: string,
  category: string | undefined,
  feed: NewsFeedDef,
): boolean {
  if (NOISE.test(title)) return false;
  if (feed.unfiltered) return true;
  const blob = `${title} ${category || ""}`;
  if (feed.topic === "economy") return ECON_RELEVANCE.test(blob);
  return THEATER_RELEVANCE[feed.theater].test(blob);
}
