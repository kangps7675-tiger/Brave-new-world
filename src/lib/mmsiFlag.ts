/**
 * MMSI 앞 3자리(MID, 해상식별부호)로 추정한 선박 등록국(기국).
 * 실제 국적이 아니라 "무선국 등록 기준 기국"이다 — 편의치적(파나마·라이베리아 등)이 흔하고,
 * 선주·운항사 국적과는 다를 수 있다. 화면에 "기국(추정)"으로 표기한다.
 * 목록은 해운에서 자주 나오는 MID 위주(전체 ITU 표 아님). 없으면 null.
 */
const MID: Record<string, [string, string]> = {
  "201": ["알바니아", "Albania"], "205": ["벨기에", "Belgium"], "209": ["키프로스", "Cyprus"], "210": ["키프로스", "Cyprus"], "212": ["키프로스", "Cyprus"],
  "211": ["독일", "Germany"], "218": ["독일", "Germany"], "219": ["덴마크", "Denmark"], "220": ["덴마크", "Denmark"],
  "224": ["스페인", "Spain"], "225": ["스페인", "Spain"], "226": ["프랑스", "France"], "227": ["프랑스", "France"], "228": ["프랑스", "France"],
  "229": ["몰타", "Malta"], "215": ["몰타", "Malta"], "248": ["몰타", "Malta"], "249": ["몰타", "Malta"], "256": ["몰타", "Malta"],
  "230": ["핀란드", "Finland"], "231": ["페로 제도", "Faroe Is."], "232": ["영국", "United Kingdom"], "233": ["영국", "United Kingdom"], "234": ["영국", "United Kingdom"], "235": ["영국", "United Kingdom"],
  "236": ["지브롤터", "Gibraltar"], "237": ["그리스", "Greece"], "239": ["그리스", "Greece"], "240": ["그리스", "Greece"], "241": ["그리스", "Greece"],
  "238": ["크로아티아", "Croatia"], "242": ["모로코", "Morocco"], "244": ["네덜란드", "Netherlands"], "245": ["네덜란드", "Netherlands"], "246": ["네덜란드", "Netherlands"],
  "247": ["이탈리아", "Italy"], "250": ["아일랜드", "Ireland"], "251": ["아이슬란드", "Iceland"], "252": ["리히텐슈타인", "Liechtenstein"],
  "253": ["룩셈부르크", "Luxembourg"], "257": ["노르웨이", "Norway"], "258": ["노르웨이", "Norway"], "259": ["노르웨이", "Norway"],
  "255": ["포르투갈(마데이라)", "Portugal (Madeira)"], "263": ["포르투갈", "Portugal"], "261": ["폴란드", "Poland"], "265": ["스웨덴", "Sweden"], "266": ["스웨덴", "Sweden"],
  "271": ["튀르키예", "Türkiye"], "272": ["우크라이나", "Ukraine"], "273": ["러시아", "Russia"], "275": ["라트비아", "Latvia"], "276": ["에스토니아", "Estonia"], "277": ["리투아니아", "Lithuania"],
  "278": ["슬로베니아", "Slovenia"], "279": ["세르비아", "Serbia"], "270": ["체코", "Czechia"], "274": ["북마케도니아", "North Macedonia"],
  "303": ["미국(알래스카)", "USA (Alaska)"], "338": ["미국", "USA"], "366": ["미국", "USA"], "367": ["미국", "USA"], "368": ["미국", "USA"], "369": ["미국", "USA"],
  "316": ["캐나다", "Canada"], "319": ["케이맨 제도", "Cayman Is."], "308": ["바하마", "Bahamas"], "309": ["바하마", "Bahamas"], "311": ["바하마", "Bahamas"],
  "310": ["버뮤다", "Bermuda"], "314": ["바베이도스", "Barbados"], "325": ["자메이카", "Jamaica"], "345": ["멕시코", "Mexico"],
  "351": ["파나마", "Panama"], "352": ["파나마", "Panama"], "353": ["파나마", "Panama"], "354": ["파나마", "Panama"], "355": ["파나마", "Panama"], "356": ["파나마", "Panama"], "357": ["파나마", "Panama"], "370": ["파나마", "Panama"], "371": ["파나마", "Panama"], "372": ["파나마", "Panama"], "373": ["파나마", "Panama"], "374": ["파나마", "Panama"],
  "375": ["세인트빈센트", "St Vincent"], "376": ["세인트빈센트", "St Vincent"], "377": ["세인트빈센트", "St Vincent"], "378": ["영국령 버진아일랜드", "British Virgin Is."],
  "412": ["중국", "China"], "413": ["중국", "China"], "414": ["중국", "China"], "416": ["대만", "Taiwan"], "419": ["인도", "India"],
  "422": ["이란", "Iran"], "423": ["아제르바이잔", "Azerbaijan"], "431": ["일본", "Japan"], "432": ["일본", "Japan"], "440": ["대한민국", "South Korea"], "441": ["대한민국", "South Korea"],
  "445": ["북한", "North Korea"], "447": ["쿠웨이트", "Kuwait"], "450": ["레바논", "Lebanon"], "455": ["몰디브", "Maldives"], "457": ["몽골", "Mongolia"],
  "461": ["오만", "Oman"], "463": ["파키스탄", "Pakistan"], "466": ["카타르", "Qatar"], "468": ["시리아", "Syria"], "470": ["아랍에미리트", "UAE"], "471": ["아랍에미리트", "UAE"],
  "472": ["타지키스탄", "Tajikistan"], "473": ["예멘", "Yemen"], "475": ["예멘", "Yemen"], "477": ["홍콩", "Hong Kong"], "478": ["보스니아", "Bosnia"],
  "403": ["사우디아라비아", "Saudi Arabia"], "408": ["바레인", "Bahrain"], "428": ["이스라엘", "Israel"], "425": ["이라크", "Iraq"], "417": ["스리랑카", "Sri Lanka"], "405": ["방글라데시", "Bangladesh"],
  "525": ["인도네시아", "Indonesia"], "533": ["말레이시아", "Malaysia"], "538": ["마셜 제도", "Marshall Is."], "548": ["필리핀", "Philippines"],
  "563": ["싱가포르", "Singapore"], "564": ["싱가포르", "Singapore"], "565": ["싱가포르", "Singapore"], "566": ["싱가포르", "Singapore"], "567": ["태국", "Thailand"], "574": ["베트남", "Vietnam"],
  "501": ["프랑스령 남극", "Adélie Land"], "503": ["호주", "Australia"], "512": ["뉴질랜드", "New Zealand"], "511": ["팔라우", "Palau"], "510": ["미크로네시아", "Micronesia"],
  "601": ["남아프리카공화국", "South Africa"], "613": ["카메룬", "Cameroon"], "619": ["코트디부아르", "Côte d'Ivoire"], "620": ["코모로", "Comoros"], "621": ["지부티", "Djibouti"],
  "622": ["이집트", "Egypt"], "624": ["에티오피아", "Ethiopia"], "627": ["가나", "Ghana"], "629": ["감비아", "Gambia"], "636": ["라이베리아", "Liberia"], "637": ["라이베리아", "Liberia"],
  "642": ["리비아", "Libya"], "644": ["레소토", "Lesotho"], "645": ["모리셔스", "Mauritius"], "647": ["마다가스카르", "Madagascar"], "649": ["말리", "Mali"], "654": ["모리타니", "Mauritania"],
  "656": ["니제르", "Niger"], "657": ["나이지리아", "Nigeria"], "659": ["나미비아", "Namibia"], "660": ["레위니옹", "Réunion"], "663": ["세네갈", "Senegal"], "664": ["세이셸", "Seychelles"],
  "667": ["시에라리온", "Sierra Leone"], "668": ["상투메프린시페", "São Tomé"], "669": ["에스와티니", "Eswatini"], "670": ["차드", "Chad"], "671": ["토고", "Togo"], "672": ["튀니지", "Tunisia"],
  "674": ["탄자니아", "Tanzania"], "675": ["우간다", "Uganda"], "677": ["탄자니아", "Tanzania"], "678": ["잠비아", "Zambia"], "679": ["짐바브웨", "Zimbabwe"], "605": ["알제리", "Algeria"],
  "701": ["아르헨티나", "Argentina"], "710": ["브라질", "Brazil"], "725": ["칠레", "Chile"], "730": ["콜롬비아", "Colombia"], "735": ["에콰도르", "Ecuador"], "760": ["페루", "Peru"], "770": ["우루과이", "Uruguay"], "775": ["베네수엘라", "Venezuela"],
  "341": ["세인트키츠네비스", "St Kitts & Nevis"], "343": ["세인트루시아", "St Lucia"], "347": ["마르티니크", "Martinique"],
  "304": ["앤티가 바부다", "Antigua & Barbuda"], "305": ["앤티가 바부다", "Antigua & Barbuda"], "312": ["벨리즈", "Belize"], "321": ["코스타리카", "Costa Rica"], "323": ["쿠바", "Cuba"], "327": ["도미니카공화국", "Dominican Rep."],
  "329": ["과들루프", "Guadeloupe"], "330": ["그레나다", "Grenada"], "334": ["온두라스", "Honduras"], "336": ["아이티", "Haiti"], "362": ["트리니다드토바고", "Trinidad & Tobago"], "364": ["터크스케이커스", "Turks & Caicos"],
  "401": ["아프가니스탄", "Afghanistan"], "410": ["부탄", "Bhutan"], "404": ["카자흐스탄", "Kazakhstan"], "436": ["카자흐스탄", "Kazakhstan"], "434": ["투르크메니스탄", "Turkmenistan"], "437": ["우즈베키스탄", "Uzbekistan"],
  "438": ["요르단", "Jordan"], "451": ["키르기스스탄", "Kyrgyzstan"], "453": ["마카오", "Macao"], "459": ["네팔", "Nepal"], "506": ["미얀마", "Myanmar"], "514": ["캄보디아", "Cambodia"], "515": ["캄보디아", "Cambodia"],
  "520": ["피지", "Fiji"], "523": ["코코스 제도", "Cocos Is."], "529": ["키리바시", "Kiribati"], "531": ["라오스", "Laos"], "536": ["북마리아나", "N. Mariana Is."], "542": ["니우에", "Niue"], "546": ["프랑스령 폴리네시아", "Fr. Polynesia"],
  "553": ["파푸아뉴기니", "Papua New Guinea"], "555": ["핏케언", "Pitcairn"], "557": ["솔로몬 제도", "Solomon Is."], "559": ["미국령 사모아", "American Samoa"], "561": ["사모아", "Samoa"], "570": ["통가", "Tonga"], "572": ["투발루", "Tuvalu"], "576": ["바누아투", "Vanuatu"],
  "208": ["바티칸", "Vatican"], "214": ["몰도바", "Moldova"], "216": ["아르메니아", "Armenia"], "243": ["헝가리", "Hungary"], "254": ["모나코", "Monaco"], "262": ["몬테네그로", "Montenegro"], "267": ["슬로바키아", "Slovakia"], "268": ["산마리노", "San Marino"], "269": ["스위스", "Switzerland"],
  "202": ["안도라", "Andorra"], "203": ["오스트리아", "Austria"], "204": ["아조레스", "Azores"], "206": ["벨라루스", "Belarus"], "207": ["불가리아", "Bulgaria"], "213": ["조지아", "Georgia"], "264": ["루마니아", "Romania"],
};

export function flagFromMmsi(mmsi: string | null | undefined, lang: "ko" | "en" = "ko"): string | null {
  const m = (mmsi ?? "").trim();
  if (!/^\d{9}$/.test(m)) return null;
  // 선박국 MMSI 는 MID 로 시작한다. 0·1 로 시작하는 건 연안국·그룹·SAR 등 선박이 아님.
  if (m[0] === "0" || m[0] === "1" || m[0] === "9") return null;
  const hit = MID[m.slice(0, 3)];
  return hit ? hit[lang === "en" ? 1 : 0] : null;
}
