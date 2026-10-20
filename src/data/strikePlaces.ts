/**
 * 공습 불꽃 전용 지명 사전 — 기사 속 타격 지점을 좌표로 풀 때만 쓴다.
 *
 * 기본 지명 사전(telegramPlaceMatch)은 우크라이나 경보 구역 + 이스라엘 + 중동 수도 몇 곳뿐이라,
 * 러시아 본토 깊숙한 정유소·비행장, 흑해·카스피해, 이란 내륙 핵시설, 걸프 석유 시설,
 * 비옥한 초승달(이라크·시리아) 도시를 맞았다는 기사는 불꽃이 되지 못했다.
 * 공용 사전에 넣으면 텔레그램 경보·뉴스 핀까지 바뀌므로 불꽃용으로 따로 둔다.
 *
 * 좌표는 도시 중심 또는 시설 위치. 짧거나 다른 뜻과 겹치는 이름(Engels, Caspian 단독 등)은
 * 오탐을 막으려고 구체적인 형태로만 넣는다. 한글 표기가 일반 단어와 겹치면(우파·도하·사다·하마 등) 넣지 않는다.
 */

export type StrikePlaceArea = "russia" | "black-sea" | "caspian" | "iran" | "gulf" | "levant-iraq" | "yemen";

export type StrikePlace = {
  label: string;
  lat: number;
  lng: number;
  area: StrikePlaceArea;
  aliases: string[];
};

export const STRIKE_PLACES: StrikePlace[] = [
  // ── 러시아 본토 (정유소·비행장·군수공장이 자주 맞는 곳) ──
  { label: "Moscow", lat: 55.7558, lng: 37.6173, area: "russia", aliases: ["Moscow", "Москва", "모스크바"] },
  { label: "St Petersburg", lat: 59.9311, lng: 30.3609, area: "russia", aliases: ["St Petersburg", "St. Petersburg", "Saint Petersburg", "Санкт-Петербург", "상트페테르부르크"] },
  { label: "Ust-Luga", lat: 59.68, lng: 28.39, area: "russia", aliases: ["Ust-Luga", "Ust Luga", "Усть-Луга", "우스트루가"] },
  { label: "Belgorod", lat: 50.5954, lng: 36.5873, area: "russia", aliases: ["Belgorod", "Белгород", "벨고로드"] },
  { label: "Kursk", lat: 51.7304, lng: 36.1926, area: "russia", aliases: ["Kursk", "Курск", "쿠르스크"] },
  { label: "Bryansk", lat: 53.2434, lng: 34.3634, area: "russia", aliases: ["Bryansk", "Брянск", "브랸스크"] },
  { label: "Oryol", lat: 52.9685, lng: 36.0692, area: "russia", aliases: ["Oryol", "Orel", "Орёл", "Орел", "오룔"] },
  { label: "Voronezh", lat: 51.672, lng: 39.1843, area: "russia", aliases: ["Voronezh", "Воронеж", "보로네시", "보로네즈"] },
  { label: "Lipetsk", lat: 52.6031, lng: 39.5708, area: "russia", aliases: ["Lipetsk", "Липецк", "리페츠크"] },
  { label: "Tambov", lat: 52.7212, lng: 41.4523, area: "russia", aliases: ["Tambov", "Тамбов", "탐보프"] },
  { label: "Ryazan", lat: 54.6269, lng: 39.6916, area: "russia", aliases: ["Ryazan", "Рязань", "랴잔"] },
  { label: "Tula", lat: 54.1931, lng: 37.6177, area: "russia", aliases: ["Tula", "Тула", "툴라"] },
  { label: "Kaluga", lat: 54.5293, lng: 36.2754, area: "russia", aliases: ["Kaluga", "Калуга", "칼루가"] },
  { label: "Smolensk", lat: 54.7826, lng: 32.0453, area: "russia", aliases: ["Smolensk", "Смоленск", "스몰렌스크"] },
  { label: "Tver", lat: 56.8587, lng: 35.9176, area: "russia", aliases: ["Tver", "Тверь", "트베리"] },
  { label: "Yaroslavl", lat: 57.6261, lng: 39.8845, area: "russia", aliases: ["Yaroslavl", "Ярославль", "야로슬라블"] },
  { label: "Nizhny Novgorod", lat: 56.2965, lng: 43.9361, area: "russia", aliases: ["Nizhny Novgorod", "Нижний Новгород", "니즈니노브고로드"] },
  { label: "Kstovo", lat: 56.1475, lng: 44.1975, area: "russia", aliases: ["Kstovo", "Кстово", "크스토보"] },
  { label: "Cheboksary", lat: 56.1439, lng: 47.2489, area: "russia", aliases: ["Cheboksary", "Чебоксары", "체복사리"] },
  { label: "Kazan", lat: 55.7963, lng: 49.1088, area: "russia", aliases: ["Kazan", "Казань", "카잔"] },
  { label: "Yelabuga", lat: 55.7616, lng: 52.0546, area: "russia", aliases: ["Yelabuga", "Alabuga", "Елабуга", "Алабуга", "옐라부가", "알라부가"] },
  { label: "Ufa", lat: 54.7388, lng: 55.9721, area: "russia", aliases: ["Ufa", "Уфа"] },
  { label: "Samara", lat: 53.1959, lng: 50.1002, area: "russia", aliases: ["Samara", "Самара", "사마라"] },
  { label: "Syzran", lat: 53.1559, lng: 48.4747, area: "russia", aliases: ["Syzran", "Сызрань", "시즈란"] },
  { label: "Novokuibyshevsk", lat: 53.0994, lng: 49.9474, area: "russia", aliases: ["Novokuibyshevsk", "Novokuybyshevsk", "Новокуйбышевск"] },
  { label: "Saratov", lat: 51.5336, lng: 46.0342, area: "russia", aliases: ["Saratov", "Саратов", "사라토프"] },
  { label: "Engels air base", lat: 51.4813, lng: 46.2117, area: "russia", aliases: ["Engels air base", "Engels airbase", "Engels airfield", "Engels-2", "엥겔스 비행장", "엥겔스 공군기지"] },
  { label: "Volgograd", lat: 48.708, lng: 44.5133, area: "russia", aliases: ["Volgograd", "Волгоград", "볼고그라드"] },
  { label: "Orenburg", lat: 51.7682, lng: 55.0969, area: "russia", aliases: ["Orenburg", "Оренбург", "오렌부르크"] },
  { label: "Orsk", lat: 51.2293, lng: 58.4752, area: "russia", aliases: ["Orsk", "Орск", "오르스크"] },
  { label: "Perm", lat: 58.0105, lng: 56.2502, area: "russia", aliases: ["Perm", "Пермь", "페름"] },
  { label: "Yekaterinburg", lat: 56.8389, lng: 60.6057, area: "russia", aliases: ["Yekaterinburg", "Ekaterinburg", "Екатеринбург", "예카테린부르크"] },
  { label: "Tyumen", lat: 57.153, lng: 65.5343, area: "russia", aliases: ["Tyumen", "Тюмень", "튜멘"] },
  { label: "Rostov-on-Don", lat: 47.2357, lng: 39.7015, area: "russia", aliases: ["Rostov-on-Don", "Rostov", "Ростов-на-Дону", "Ростов", "로스토프"] },
  { label: "Taganrog", lat: 47.2362, lng: 38.8969, area: "russia", aliases: ["Taganrog", "Таганрог", "타간로그"] },
  { label: "Millerovo", lat: 48.9226, lng: 40.3943, area: "russia", aliases: ["Millerovo", "Миллерово", "밀레로보"] },
  { label: "Morozovsk", lat: 48.3511, lng: 41.8309, area: "russia", aliases: ["Morozovsk", "Морозовск", "모로조프스크"] },
  { label: "Krasnodar", lat: 45.0355, lng: 38.9753, area: "russia", aliases: ["Krasnodar", "Краснодар", "크라스노다르"] },
  { label: "Yeysk", lat: 46.7106, lng: 38.2773, area: "russia", aliases: ["Yeysk", "Yeisk", "Ейск", "예이스크"] },
  { label: "Grozny", lat: 43.318, lng: 45.6982, area: "russia", aliases: ["Grozny", "Грозный", "그로즈니"] },
  { label: "Mozdok", lat: 43.7473, lng: 44.6553, area: "russia", aliases: ["Mozdok", "Моздок", "모즈도크"] },

  // ── 흑해·아조프해·크림 ──
  { label: "Black Sea", lat: 43.4, lng: 34.0, area: "black-sea", aliases: ["Black Sea", "Чёрное море", "Черное море", "Чорне море", "흑해"] },
  { label: "Sea of Azov", lat: 46.0, lng: 36.6, area: "black-sea", aliases: ["Sea of Azov", "Azov Sea", "Азовское море", "아조프해"] },
  { label: "Novorossiysk", lat: 44.7239, lng: 37.7708, area: "black-sea", aliases: ["Novorossiysk", "Novorossiisk", "Новороссийск", "노보로시스크"] },
  { label: "CPC terminal", lat: 44.67, lng: 37.62, area: "black-sea", aliases: ["CPC terminal", "Caspian Pipeline Consortium", "КТК"] },
  { label: "Tuapse", lat: 44.0982, lng: 39.0745, area: "black-sea", aliases: ["Tuapse", "Туапсе", "투압세"] },
  { label: "Sochi", lat: 43.5855, lng: 39.7231, area: "black-sea", aliases: ["Sochi", "Сочи", "소치"] },
  { label: "Anapa", lat: 44.8946, lng: 37.3165, area: "black-sea", aliases: ["Anapa", "Анапа", "아나파"] },
  { label: "Taman", lat: 45.2108, lng: 36.7163, area: "black-sea", aliases: ["Taman port", "Port of Taman", "Тамань", "타만"] },
  { label: "Kerch Strait", lat: 45.3, lng: 36.51, area: "black-sea", aliases: ["Kerch Strait", "Crimean Bridge", "Kerch Bridge", "Керченский пролив", "Крымский мост", "케르치 해협", "크림대교"] },
  { label: "Kerch", lat: 45.3566, lng: 36.4737, area: "black-sea", aliases: ["Kerch", "Керчь", "Керч", "케르치"] },
  { label: "Feodosia", lat: 45.0319, lng: 35.3824, area: "black-sea", aliases: ["Feodosia", "Feodosiya", "Феодосия", "페오도시야"] },
  { label: "Saky", lat: 45.1333, lng: 33.6, area: "black-sea", aliases: ["Saky", "Saki", "Саки", "사키"] },
  { label: "Dzhankoi", lat: 45.7086, lng: 34.3933, area: "black-sea", aliases: ["Dzhankoi", "Dzhankoy", "Джанкой", "잔코이"] },
  { label: "Snake Island", lat: 45.255, lng: 30.204, area: "black-sea", aliases: ["Snake Island", "Zmiinyi Island", "Острів Зміїний", "뱀섬"] },

  // ── 카스피해 ──
  { label: "Caspian Sea", lat: 41.5, lng: 50.5, area: "caspian", aliases: ["Caspian Sea", "Каспийское море", "카스피해"] },
  { label: "Astrakhan", lat: 46.3497, lng: 48.0408, area: "caspian", aliases: ["Astrakhan", "Астрахань", "아스트라한"] },
  { label: "Makhachkala", lat: 42.9849, lng: 47.5047, area: "caspian", aliases: ["Makhachkala", "Махачкала", "마하치칼라"] },
  { label: "Kaspiysk", lat: 42.8816, lng: 47.6389, area: "caspian", aliases: ["Kaspiysk", "Каспийск", "카스피스크"] },
  { label: "Izberbash", lat: 42.5653, lng: 47.8714, area: "caspian", aliases: ["Izberbash", "Избербаш"] },
  { label: "Bandar Anzali", lat: 37.4727, lng: 49.4623, area: "caspian", aliases: ["Bandar Anzali", "Anzali", "بندر انزلی", "반다르안잘리"] },

  // ── 이란 내륙 ──
  { label: "Isfahan", lat: 32.6546, lng: 51.668, area: "iran", aliases: ["Isfahan", "Esfahan", "اصفهان", "이스파한"] },
  { label: "Natanz", lat: 33.7244, lng: 51.7272, area: "iran", aliases: ["Natanz", "نطنز", "나탄즈"] },
  { label: "Fordow", lat: 34.8846, lng: 50.9958, area: "iran", aliases: ["Fordow", "Fordo", "فردو", "포르도"] },
  { label: "Arak", lat: 34.0917, lng: 49.6892, area: "iran", aliases: ["Arak", "اراک", "아라크"] },
  { label: "Qom", lat: 34.6401, lng: 50.8764, area: "iran", aliases: ["Qom", "قم"] },
  { label: "Karaj", lat: 35.8400, lng: 50.9391, area: "iran", aliases: ["Karaj", "کرج", "카라지"] },
  { label: "Hamadan", lat: 34.7983, lng: 48.5146, area: "iran", aliases: ["Hamadan", "همدان", "하마단"] },
  { label: "Kermanshah", lat: 34.3142, lng: 47.065, area: "iran", aliases: ["Kermanshah", "کرمانشاه", "케르만샤"] },
  { label: "Tabriz", lat: 38.08, lng: 46.2919, area: "iran", aliases: ["Tabriz", "تبریز", "타브리즈"] },
  { label: "Shiraz", lat: 29.5918, lng: 52.5837, area: "iran", aliases: ["Shiraz", "شیراز", "시라즈"] },
  { label: "Bushehr", lat: 28.9234, lng: 50.8203, area: "iran", aliases: ["Bushehr", "بوشهر", "부셰르"] },
  { label: "Kharg Island", lat: 29.2514, lng: 50.3206, area: "iran", aliases: ["Kharg Island", "Kharg", "خارک", "하르그섬"] },
  { label: "Bandar Abbas", lat: 27.1832, lng: 56.2666, area: "iran", aliases: ["Bandar Abbas", "بندر عباس", "반다르아바스"] },
  { label: "Ahvaz", lat: 31.3183, lng: 48.6706, area: "iran", aliases: ["Ahvaz", "Ahwaz", "اهواز", "아바즈"] },
  { label: "Abadan", lat: 30.3392, lng: 48.3043, area: "iran", aliases: ["Abadan", "آبادان", "아바단"] },
  { label: "Mashhad", lat: 36.2605, lng: 59.6168, area: "iran", aliases: ["Mashhad", "مشهد", "마슈하드"] },
  { label: "Chabahar", lat: 25.2919, lng: 60.643, area: "iran", aliases: ["Chabahar", "چابهار", "차바하르"] },

  // ── 걸프 ──
  { label: "Riyadh", lat: 24.7136, lng: 46.6753, area: "gulf", aliases: ["Riyadh", "الرياض", "리야드"] },
  { label: "Abqaiq", lat: 25.9375, lng: 49.6773, area: "gulf", aliases: ["Abqaiq", "بقيق", "아브카이크"] },
  { label: "Ras Tanura", lat: 26.6436, lng: 50.1594, area: "gulf", aliases: ["Ras Tanura", "رأس تنورة", "라스타누라"] },
  { label: "Dhahran", lat: 26.2886, lng: 50.114, area: "gulf", aliases: ["Dhahran", "الظهران"] },
  { label: "Jeddah", lat: 21.4858, lng: 39.1925, area: "gulf", aliases: ["Jeddah", "Jiddah", "جدة", "제다"] },
  { label: "Yanbu", lat: 24.0895, lng: 38.0618, area: "gulf", aliases: ["Yanbu", "ينبع", "얀부"] },
  { label: "Jizan", lat: 16.8892, lng: 42.5511, area: "gulf", aliases: ["Jizan", "Jazan", "جازان", "지잔"] },
  { label: "Kuwait City", lat: 29.3759, lng: 47.9774, area: "gulf", aliases: ["Kuwait City", "Kuwait", "الكويت", "쿠웨이트"] },
  { label: "Bahrain", lat: 26.2285, lng: 50.586, area: "gulf", aliases: ["Bahrain", "Manama", "البحرين", "المنامة", "바레인", "마나마"] },
  { label: "Doha", lat: 25.2854, lng: 51.531, area: "gulf", aliases: ["Doha", "الدوحة"] },
  { label: "Al Udeid", lat: 25.1173, lng: 51.315, area: "gulf", aliases: ["Al Udeid", "Al-Udeid", "العديد", "알우데이드"] },
  { label: "Ras Laffan", lat: 25.9139, lng: 51.5461, area: "gulf", aliases: ["Ras Laffan", "رأس لفان", "라스라판"] },
  { label: "Dubai", lat: 25.2048, lng: 55.2708, area: "gulf", aliases: ["Dubai", "دبي", "두바이"] },
  { label: "Abu Dhabi", lat: 24.4539, lng: 54.3773, area: "gulf", aliases: ["Abu Dhabi", "أبوظبي", "아부다비"] },
  { label: "Fujairah", lat: 25.1288, lng: 56.3265, area: "gulf", aliases: ["Fujairah", "الفجيرة", "푸자이라"] },
  { label: "Muscat", lat: 23.588, lng: 58.3829, area: "gulf", aliases: ["Muscat", "مسقط", "무스카트"] },
  { label: "Duqm", lat: 19.6612, lng: 57.7046, area: "gulf", aliases: ["Duqm", "الدقم", "두큼"] },

  // ── 비옥한 초승달 (이라크·시리아·요르단·레바논) ──
  { label: "Kirkuk", lat: 35.4681, lng: 44.3922, area: "levant-iraq", aliases: ["Kirkuk", "كركوك", "키르쿠크"] },
  { label: "Sulaymaniyah", lat: 35.5613, lng: 45.4308, area: "levant-iraq", aliases: ["Sulaymaniyah", "Sulaimaniyah", "السليمانية", "술라이마니야"] },
  { label: "Ain al-Asad", lat: 33.8, lng: 42.44, area: "levant-iraq", aliases: ["Ain al-Asad", "Ain al Asad", "عين الأسد", "아인알아사드"] },
  { label: "Tikrit", lat: 34.6, lng: 43.68, area: "levant-iraq", aliases: ["Tikrit", "تكريت", "티크리트"] },
  { label: "Fallujah", lat: 33.35, lng: 43.78, area: "levant-iraq", aliases: ["Fallujah", "الفلوجة", "팔루자"] },
  { label: "Karbala", lat: 32.616, lng: 44.0249, area: "levant-iraq", aliases: ["Karbala", "كربلاء", "카르발라"] },
  { label: "Najaf", lat: 32.0259, lng: 44.3462, area: "levant-iraq", aliases: ["Najaf", "النجف", "나자프"] },
  { label: "Aleppo", lat: 36.2021, lng: 37.1343, area: "levant-iraq", aliases: ["Aleppo", "حلب", "알레포"] },
  { label: "Homs", lat: 34.7324, lng: 36.7137, area: "levant-iraq", aliases: ["Homs", "حمص", "홈스"] },
  { label: "Hama", lat: 35.1318, lng: 36.7578, area: "levant-iraq", aliases: ["Hama", "حماة"] },
  { label: "Latakia", lat: 35.5317, lng: 35.7915, area: "levant-iraq", aliases: ["Latakia", "اللاذقية", "라타키아"] },
  { label: "Tartus", lat: 34.889, lng: 35.8866, area: "levant-iraq", aliases: ["Tartus", "طرطوس", "타르투스"] },
  { label: "Palmyra", lat: 34.5503, lng: 38.2691, area: "levant-iraq", aliases: ["Palmyra", "Tadmur", "تدمر", "팔미라"] },
  { label: "Deir ez-Zor", lat: 35.3359, lng: 40.1408, area: "levant-iraq", aliases: ["Deir ez-Zor", "Deir ez Zor", "Deir al-Zour", "دير الزور", "데이르에즈조르"] },
  { label: "Raqqa", lat: 35.9594, lng: 39.0078, area: "levant-iraq", aliases: ["Raqqa", "الرقة", "락까"] },
  { label: "Qamishli", lat: 37.0522, lng: 41.2264, area: "levant-iraq", aliases: ["Qamishli", "القامشلي", "카미실리"] },
  { label: "Al-Tanf", lat: 33.5, lng: 38.66, area: "levant-iraq", aliases: ["Al-Tanf", "Al Tanf", "التنف", "알탄프"] },
  { label: "Amman", lat: 31.9539, lng: 35.9106, area: "levant-iraq", aliases: ["Amman", "عمان", "암만"] },
  { label: "Tyre", lat: 33.2705, lng: 35.2038, area: "levant-iraq", aliases: ["Tyre", "صور", "티레"] },
  { label: "Sidon", lat: 33.5571, lng: 35.3729, area: "levant-iraq", aliases: ["Sidon", "صيدا", "시돈"] },
  { label: "Nabatieh", lat: 33.3772, lng: 35.4836, area: "levant-iraq", aliases: ["Nabatieh", "Nabatiyeh", "النبطية", "나바티예"] },
  { label: "Baalbek", lat: 34.0047, lng: 36.2110, area: "levant-iraq", aliases: ["Baalbek", "بعلبك", "바알베크"] },

  // ── 예멘 내륙 ──
  { label: "Marib", lat: 15.4621, lng: 45.3253, area: "yemen", aliases: ["Marib", "مأرب", "마리브"] },
  { label: "Saada", lat: 16.9402, lng: 43.7639, area: "yemen", aliases: ["Saada", "Sa'dah", "صعدة"] },
  { label: "Ras Isa", lat: 15.13, lng: 42.62, area: "yemen", aliases: ["Ras Isa", "رأس عيسى", "라스이사"] },
];
