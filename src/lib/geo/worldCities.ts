/**
 * 세계 도시·국가 대표 도시 사전 — scripts/build-world-cities.js 로 생성. 손으로 고치지 말 것.
 * 원천: public/data/lite/places.json (인구 250,000 이상 + 국가 대표 도시).
 */

/** [도시, 국가, lat, lng, 인구] */
export const WORLD_CITIES: ReadonlyArray<readonly [string, string, number, number, number]> = [
  ["Tokyo", "Japan", 35.687, 139.749, 35676000],
  ["New York", "United States of America", 40.752, -73.982, 19040000],
  ["Mexico City", "Mexico", 19.444, -99.133, 19028000],
  ["Mumbai", "India", 19.019, 72.855, 18978000],
  ["Sao Paulo", "Brazil", -23.557, -46.627, 18845000],
  ["Delhi", "India", 28.672, 77.228, 15926000],
  ["Shanghai", "China", 31.218, 121.435, 14987000],
  ["Kolkata", "India", 22.497, 88.323, 14787000],
  ["Dhaka", "Bangladesh", 23.725, 90.407, 12797394],
  ["Buenos Aires", "Argentina", -34.601, -58.399, 12795000],
  ["Los Angeles", "United States of America", 33.992, -118.182, 12500000],
  ["Karachi", "Pakistan", 24.872, 66.988, 12130000],
  ["Cairo", "Egypt", 30.052, 31.248, 11893000],
  ["Rio de Janeiro", "Brazil", -22.923, -43.227, 11748000],
  ["Osaka", "Japan", 34.752, 135.458, 11294000],
  ["Beijing", "China", 39.931, 116.386, 11106000],
  ["Manila", "Philippines", 14.606, 120.98, 11100000],
  ["Moscow", "Russia", 55.754, 37.614, 10452000],
  ["Istanbul", "Turkey", 41.107, 29.008, 10061000],
  ["Paris", "France", 48.869, 2.331, 9904000],
  ["Seoul", "South Korea", 37.568, 126.998, 9796000],
  ["Lagos", "Nigeria", 6.445, 3.39, 9466000],
  ["Jakarta", "Indonesia", -6.172, 106.827, 9125000],
  ["Chicago", "United States of America", 41.832, -87.752, 8990000],
  ["Guangzhou", "China", 23.147, 113.323, 8829000],
  ["London", "United Kingdom", 51.502, -0.119, 8567000],
  ["Lima", "Peru", -12.046, -77.052, 8012000],
  ["Tehran", "Iran", 35.674, 51.422, 7873000],
  ["Kinshasa", "Congo (Kinshasa)", -4.328, 15.313, 7843000],
  ["Bogota", "Colombia", 4.598, -74.085, 7772000],
  ["Shenzhen", "China", 22.554, 114.12, 7581000],
  ["Wuhan", "China", 30.582, 114.268, 7243000],
  ["Hong Kong", "Hong Kong S.A.R.", 22.307, 114.183, 7206000],
  ["Tianjin", "China", 39.132, 117.198, 7180000],
  ["Chennai", "India", 13.092, 80.278, 7163000],
  ["Taipei", "Taiwan", 25.036, 121.568, 6900273],
  ["Bengaluru", "India", 12.972, 77.558, 6787000],
  ["Bangkok", "Thailand", 13.752, 100.515, 6704000],
  ["Lahore", "Pakistan", 31.562, 74.348, 6577000],
  ["Chongqing", "China", 29.567, 106.593, 6461000],
  ["Hyderabad", "India", 17.402, 78.478, 6376000],
  ["Amaravati", "India", 16.534, 80.524, 5800000],
  ["Santiago", "Chile", -33.448, -70.669, 5720000],
  ["Miami", "United States of America", 25.79, -80.226, 5585000],
  ["Belo Horizonte", "Brazil", -19.913, -43.917, 5575000],
  ["Madrid", "Spain", 40.402, -3.685, 5567000],
  ["Philadelphia", "United States of America", 40.002, -75.172, 5492000],
  ["Ahmedabad", "India", 23.032, 72.578, 5375000],
  ["Ho Chi Minh City", "Vietnam", 10.782, 106.693, 5314000],
  ["Toronto", "Canada", 43.702, -79.422, 5213000],
  ["Singapore", "Singapore", 1.295, 103.854, 5183700],
  ["Luanda", "Angola", -8.836, 13.232, 5172900],
  ["Baghdad", "Iraq", 33.341, 44.392, 5054000],
  ["Barcelona", "Spain", 41.385, 2.181, 4920000],
  ["Dallas", "United States of America", 32.822, -96.842, 4798000],
  ["Shenyeng", "China", 41.807, 123.448, 4787000],
  ["Khartoum", "Sudan", 15.59, 32.532, 4754000],
  ["Pune", "India", 18.532, 73.848, 4672000],
  ["Sydney", "Australia", -33.918, 151.183, 4630000],
  ["St. Petersburg", "Russia", 59.941, 30.314, 4553000],
  ["Chattogram", "Bangladesh", 22.332, 91.798, 4529000],
  ["Dongguan", "China", 23.051, 113.743, 4528000],
  ["Atlanta", "United States of America", 33.832, -84.402, 4506000],
  ["Boston", "United States of America", 42.332, -71.072, 4467000],
  ["Riyadh", "Saudi Arabia", 24.643, 46.771, 4465000],
  ["Houston", "United States of America", 29.822, -95.342, 4459000],
  ["Hanoi", "Vietnam", 21.035, 105.848, 4378000],
  ["Washington", "United States of America", 38.901, -77.011, 4338000],
  ["Guadalajara", "Mexico", 20.672, -103.332, 4198000],
  ["Melbourne", "Australia", -37.818, 144.973, 4170000],
  ["Alexandria", "Egypt", 31.202, 29.948, 4165000],
  ["Chengdu", "China", 30.672, 104.068, 4123000],
  ["Detroit", "United States of America", 42.332, -83.082, 4101000],
  ["Rangoon", "Myanmar", 16.785, 96.165, 4088000],
  ["Xian", "China", 34.277, 108.893, 4009000],
  ["Porto Alegre", "Brazil", -30.048, -51.202, 3917000],
  ["New Taipei", "Taiwan", 25.013, 121.465, 3893740],
  ["Surat", "India", 21.202, 72.838, 3842000],
  ["Abidjan", "Ivory Coast", 5.322, -4.042, 3802000],
  ["Brasilia", "Brazil", -15.781, -47.918, 3716996],
  ["Ankara", "Turkey", 39.929, 32.862, 3716000],
  ["Monterrey", "Mexico", 25.672, -100.332, 3712000],
  ["Yokohama", "Japan", 35.431, 139.602, 3697894],
  ["Nanjing", "China", 32.052, 118.778, 3679000],
  ["Montreal", "Canada", 45.502, -73.585, 3678000],
  ["Guiyang", "China", 26.582, 106.718, 3662000],
  ["Recife", "Brazil", -8.074, -34.918, 3651000],
  ["Harbin", "China", 45.752, 126.648, 3621000],
  ["Fortaleza", "Brazil", -3.748, -38.582, 3602319],
  ["Urumqi", "China", 43.807, 87.573, 3575000],
  ["Phoenix", "United States of America", 33.542, -112.072, 3551000],
  ["Salvador", "Brazil", -12.968, -38.482, 3484000],
  ["Busan", "South Korea", 35.097, 129.008, 3480000],
  ["San Francisco", "United States of America", 37.769, -122.417, 3450000],
  ["Johannesburg", "South Africa", -26.168, 28.028, 3435000],
  ["Berlin", "Germany", 52.524, 13.4, 3406000],
  ["Algiers", "Algeria", 36.765, 3.049, 3354000],
  ["Rome", "Italy", 41.898, 12.481, 3339000],
  ["Pyongyang", "North Korea", 39.021, 125.753, 3300000],
  ["Medellin", "Colombia", 6.277, -75.577, 3297000],
  ["Kabul", "Afghanistan", 34.519, 69.181, 3277000],
  ["Athens", "Greece", 37.985, 23.731, 3242000],
  ["Nagoya", "Japan", 35.157, 136.913, 3230000],
  ["Cape Town", "South Africa", -33.918, 18.433, 3215000],
  ["Changchun", "China", 43.867, 125.338, 3183000],
  ["Casablanca", "Morocco", 33.602, -7.618, 3181000],
  ["Dalian", "China", 38.925, 121.628, 3167000],
  ["Kanpur", "India", 26.462, 80.318, 3162000],
  ["Kano", "Nigeria", 12.002, 8.518, 3140000],
  ["Tel Aviv-Yafo", "Israel", 32.082, 34.768, 3112000],
  ["Addis Ababa", "Ethiopia", 9.035, 38.698, 3100000],
  ["Curitiba", "Brazil", -25.418, -49.322, 3084000],
  ["Seattle", "United States of America", 47.572, -122.342, 3074000],
  ["Zibo", "China", 36.802, 118.048, 3061000],
  ["Jeddah", "Saudi Arabia", 21.519, 39.217, 3012000],
  ["Nairobi", "Kenya", -1.281, 36.815, 3010000],
  ["Hangzhou", "China", 30.252, 120.168, 3007000],
  ["Benoni", "South Africa", -26.148, 28.328, 2986000],
  ["Caracas", "Venezuela", 10.503, -66.919, 2985000],
  ["Milan", "Italy", 45.472, 9.203, 2945000],
  ["Stuttgart", "Germany", 48.78, 9.2, 2944700],
  ["Kunming", "China", 25.072, 102.678, 2931000],
  ["Dar es Salaam", "Tanzania", -6.798, 39.266, 2930000],
  ["Jaipur", "India", 26.923, 75.808, 2917000],
  ["San Diego", "United States of America", 32.822, -117.182, 2916000],
  ["Taiyuan", "China", 37.877, 112.543, 2913000],
  ["Frankfurt", "Germany", 50.1, 8.675, 2895000],
  ["Qingdao", "China", 36.092, 120.328, 2866000],
  ["Surabaya", "Indonesia", -7.247, 112.749, 2845000],
  ["Lisbon", "Portugal", 38.725, -9.147, 2812000],
  ["Jinan", "China", 36.677, 116.993, 2798000],
  ["Fukuoka", "Japan", 33.597, 130.408, 2792000],
  ["Campinas", "Brazil", -22.898, -47.102, 2791000],
  ["Kaohsiung", "Taiwan", 22.633, 120.267, 2769072],
  ["Aleppo", "Syria", 36.232, 37.168, 2738000],
  ["Durban", "South Africa", -29.863, 30.978, 2729000],
  ["Kiev", "Ukraine", 50.435, 30.515, 2709000],
  ["Lucknow", "India", 26.857, 80.913, 2695000],
  ["El Giza", "Egypt", 30.01, 31.19, 2681863],
  ["Zhengzhou", "China", 34.757, 113.663, 2636000],
  ["Taichung", "Taiwan", 24.152, 120.682, 2629323],
  ["Ibadan", "Nigeria", 7.382, 3.928, 2628000],
  ["Faisalabad", "Pakistan", 31.412, 73.108, 2617000],
  ["Minneapolis", "United States of America", 44.982, -93.254, 2616000],
  ["Fuzhou", "China", 26.082, 119.298, 2606000],
  ["Dakar", "Senegal", 14.718, -17.475, 2604000],
  ["Changsha", "China", 28.202, 112.968, 2604000],
  ["Izmir", "Turkey", 38.438, 27.15, 2587000],
  ["Lanzhou", "China", 36.058, 103.79, 2561000],
  ["Incheon", "South Korea", 37.478, 126.64, 2550000],
  ["Sapporo", "Japan", 43.077, 141.338, 2544000],
  ["Xiamen", "China", 24.452, 118.078, 2519000],
  ["Guayaquil", "Ecuador", -2.218, -79.922, 2514000],
  ["George Town", "Malaysia", 5.414, 100.329, 2500000],
  ["San Juan", "Puerto Rico", 18.44, -66.13, 2478905],
  ["Mashhad", "Iran", 36.272, 59.568, 2469000],
  ["Damascus", "Syria", 33.502, 36.298, 2466000],
  ["Daegu", "South Korea", 35.869, 128.605, 2460000],
  ["Nagpur", "India", 21.172, 79.088, 2454000],
  ["Jinxi", "China", 40.752, 120.828, 2426000],
  ["Shijiazhuang", "China", 38.052, 114.478, 2417000],
  ["Tunis", "Tunisia", 36.803, 10.18, 2412500],
  ["Vienna", "Austria", 48.202, 16.365, 2400000],
  ["Jilin", "China", 43.852, 126.548, 2396000],
  ["Omdurman", "Sudan", 15.617, 32.48, 2395159],
  ["Bandung", "Indonesia", -6.948, 107.568, 2394000],
  ["Nanchang", "China", 28.682, 115.878, 2350000],
  ["Wenzhou", "China", 28.022, 120.648, 2350000],
  ["Tampa", "United States of America", 27.949, -82.461, 2314000],
  ["Vancouver", "Canada", 49.275, -123.124, 2313328],
  ["Denver", "United States of America", 39.741, -104.986, 2313000],
  ["Birmingham", "United Kingdom", 52.477, -1.922, 2285000],
  ["Baltimore", "United States of America", 39.302, -76.622, 2255000],
  ["Cali", "Colombia", 3.402, -76.502, 2254000],
  ["Naples", "Italy", 40.842, 14.243, 2250000],
  ["Sendai", "Japan", 38.289, 141.02, 2250000],
  ["Manchester", "United Kingdom", 53.502, -2.25, 2230000],
  ["St. Louis", "United States of America", 38.637, -90.242, 2199000],
  ["Puebla", "Mexico", 19.052, -98.202, 2195000],
  ["Tripoli", "Libya", 32.893, 13.18, 2189000],
  ["Tashkent", "Uzbekistan", 41.314, 69.293, 2184000],
  ["Havana", "Cuba", 23.134, -82.366, 2174000],
  ["Nanchong", "China", 30.782, 106.128, 2174000],
  ["Belem", "Brazil", -1.448, -48.482, 2167000],
  ["Nanning", "China", 22.822, 108.318, 2167000],
  ["Patna", "India", 25.627, 85.128, 2158000],
  ["Santo Domingo", "Dominican Republic", 18.472, -69.902, 2154000],
  ["Zaozhuang", "China", 34.882, 117.568, 2145000],
  ["Baku", "Azerbaijan", 40.397, 49.86, 2122300],
  ["Accra", "Ghana", 5.552, -0.219, 2121000],
  ["Yantai", "China", 37.532, 121.398, 2116000],
  ["Medan", "Indonesia", 3.582, 98.648, 2115000],
  ["Santa Cruz", "Bolivia", -17.752, -63.228, 2102998],
  ["Xuzhou", "China", 34.282, 117.178, 2091000],
  ["Linyi", "China", 35.082, 118.328, 2082000],
  ["Maracaibo", "Venezuela", 10.732, -71.662, 2072000],
  ["Kuwait City", "Kuwait", 29.372, 47.976, 2063000],
  ["Haikou", "China", 20.05, 110.32, 2046189],
  ["Hiroshima", "Japan", 34.39, 132.441, 2045000],
  ["Long Beach", "United States of America", 33.787, -118.158, 2036134],
  ["Baotou", "China", 40.654, 109.82, 2036000],
  ["Hefei", "China", 31.852, 117.278, 2035000],
  ["Indore", "India", 22.717, 75.863, 2026000],
  ["Goiania", "Brazil", -16.718, -49.302, 2022000],
  ["Sanaa", "Yemen", 15.357, 44.205, 2008000],
  ["Port-au-Prince", "Haiti", 18.543, -72.338, 1998000],
  ["Haiphong", "Vietnam", 20.832, 106.678, 1969000],
  ["Suzhou", "China", 33.638, 116.977, 1964000],
  ["Nanyang", "China", 33.002, 112.528, 1944000],
  ["Bucharest", "Romania", 44.435, 26.098, 1942000],
  ["Ningbo", "China", 29.882, 121.548, 1923000],
  ["Douala", "Cameroon", 4.062, 9.708, 1906000],
  ["Cleveland", "United States of America", 41.472, -81.697, 1890000],
  ["Tangshan", "China", 39.626, 118.192, 1879000],
  ["Tainan", "Taiwan", 23, 120.2, 1876312],
  ["Portland", "United States of America", 45.522, -122.682, 1875000],
  ["Datong", "China", 40.082, 113.298, 1873000],
  ["Asuncion", "Paraguay", -25.294, -57.643, 1870000],
  ["Saidu", "Pakistan", 34.75, 72.35, 1860310],
  ["Brisbane", "Australia", -27.453, 153.033, 1860000],
  ["Rawalpindi", "Pakistan", 33.602, 73.038, 1858000],
  ["Beirut", "Lebanon", 33.874, 35.508, 1846000],
  ["Pittsburgh", "United States of America", 40.432, -80.002, 1838000],
  ["Las Vegas", "United States of America", 36.212, -115.222, 1823000],
  ["Minsk", "Belarus", 53.902, 27.565, 1805000],
  ["Kyoto", "Japan", 35.032, 135.748, 1805000],
  ["Barranquilla", "Colombia", 10.962, -74.802, 1798000],
  ["Valencia", "Venezuela", 10.232, -67.982, 1770000],
  ["Hamburg", "Germany", 53.552, 9.998, 1757000],
  ["Vadodara", "India", 22.312, 73.178, 1756000],
  ["Manaus", "Brazil", -3.098, -60.002, 1753000],
  ["Shangqiu", "China", 34.452, 115.648, 1753000],
  ["Palembang", "Indonesia", -2.978, 104.748, 1749000],
  ["Wuxi", "China", 31.582, 120.298, 1749000],
  ["San Bernardino", "United States of America", 34.122, -117.302, 1745000],
  ["Brussels", "Belgium", 50.835, 4.331, 1743000],
  ["Bhopal", "India", 23.252, 77.408, 1727000],
  ["Hohhot", "China", 40.822, 111.658, 1726000],
  ["Luoyang", "China", 34.682, 112.468, 1715000],
  ["Santos", "Brazil", -23.952, -46.335, 1709000],
  ["Jianmen", "China", 30.652, 113.158, 1708000],
  ["Warsaw", "Poland", 52.252, 20.998, 1707000],
  ["Rabat", "Morocco", 34.025, -6.836, 1705000],
  ["Vitoria", "Brazil", -20.322, -40.368, 1704000],
  ["Quito", "Ecuador", -0.213, -78.502, 1701000],
  ["Antananarivo", "Madagascar", -18.915, 47.515, 1697000],
  ["Coimbatore", "India", 11.002, 76.948, 1696000],
  ["Daqing", "China", 46.582, 124.998, 1693000],
  ["Luan", "China", 31.752, 116.478, 1690000],
  ["Wanzhou", "China", 30.82, 108.4, 1680000],
  ["Budapest", "Hungary", 47.502, 19.081, 1679000],
  ["San Jose", "United States of America", 37.302, -121.852, 1668000],
  ["Turin", "Italy", 45.072, 7.668, 1652000],
  ["Suzhou", "China", 31.302, 120.618, 1650000],
  ["Ludhiana", "India", 30.93, 75.87, 1649000],
  ["Kumasi", "Ghana", 6.692, -1.632, 1646000],
  ["Qiqihar", "China", 47.347, 123.988, 1641000],
  ["Anshan", "China", 41.117, 122.938, 1639000],
  ["Cincinnati", "United States of America", 39.164, -84.459, 1636000],
  ["Handan", "China", 36.582, 114.478, 1631000],
  ["Taian", "China", 36.202, 117.118, 1629000],
  ["Isfahan", "Iran", 32.702, 51.698, 1628000],
  ["Yaounde", "Cameroon", 3.869, 11.515, 1611000],
  ["Sacramento", "United States of America", 38.577, -121.472, 1604000],
  ["Shantou", "China", 23.372, 116.668, 1601000],
  ["Agra", "India", 27.172, 78.013, 1592000],
  ["La Paz", "Bolivia", -16.496, -68.152, 1590000],
  ["Zhanjiang", "China", 21.202, 110.378, 1590000],
  ["Abuja", "Nigeria", 9.085, 7.531, 1576000],
  ["Harare", "Zimbabwe", -17.816, 31.043, 1572000],
  ["Xiantao", "China", 30.372, 113.438, 1556000],
  ["Tijuana", "Mexico", 32.502, -117.082, 1553000],
  ["Khulna", "Bangladesh", 22.842, 89.558, 1553000],
  ["Weifang", "China", 36.722, 119.098, 1553000],
  ["Santiago", "Dominican Republic", 19.5, -70.67, 1550753],
  ["Xinyang", "China", 32.132, 114.068, 1541000],
  ["Luzhou", "China", 28.882, 105.378, 1537000],
  ["Perth", "Australia", -31.953, 115.838, 1532000],
  ["Vishakhapatnam", "India", 17.732, 83.303, 1529000],
  ["Leeds", "United Kingdom", 53.832, -1.582, 1529000],
  ["Kobe", "Japan", 34.68, 135.17, 1528478],
  ["Multan", "Pakistan", 30.202, 71.453, 1522000],
  ["Kochi", "India", 10.017, 76.222, 1519000],
  ["Montevideo", "Uruguay", -34.856, -56.173, 1513000],
  ["Gujranwala", "Pakistan", 32.162, 74.183, 1513000],
  ["Oakland", "United States of America", 37.769, -122.221, 1510271],
  ["Florence", "Italy", 43.78, 11.25, 1500000],
  ["Ganzhou", "China", 25.92, 114.95, 1500000],
  ["Liuzhou", "China", 24.282, 109.248, 1497000],
  ["Bamako", "Mali", 12.652, -8.002, 1494000],
  ["Conakry", "Guinea", 9.533, -13.682, 1494000],
  ["Bursa", "Turkey", 40.202, 29.068, 1492000],
  ["Virginia Beach", "United States of America", 36.855, -75.98, 1491000],
  ["Leon", "Mexico", 21.152, -101.702, 1488000],
  ["San Antonio", "United States of America", 29.489, -98.509, 1473000],
  ["Nasik", "India", 20.002, 73.778, 1473000],
  ["Fushun", "China", 41.867, 123.868, 1470000],
  ["Kansas City", "United States of America", 39.109, -94.606, 1469000],
  ["Changde", "China", 29.032, 111.678, 1469000],
  ["Daejeon", "South Korea", 36.337, 127.423, 1468000],
  ["Phnom Penh", "Cambodia", 11.552, 104.915, 1466000],
  ["Neijiang", "China", 29.582, 105.048, 1466000],
  ["Quanzhou", "China", 24.902, 118.578, 1463000],
  ["Kharkiv", "Ukraine", 50.002, 36.248, 1461000],
  ["Hyderabad", "Pakistan", 25.382, 68.373, 1459000],
  ["Cordoba", "Argentina", -31.398, -64.184, 1452000],
  ["Lome", "Togo", 6.134, 1.221, 1452000],
  ["Huainan", "China", 32.632, 116.978, 1451000],
  ["Doha", "Qatar", 25.287, 51.533, 1450000],
  ["Kuala Lumpur", "Malaysia", 3.169, 101.698, 1448000],
  ["Maputo", "Mozambique", -25.953, 32.587, 1446000],
  ["Kaduna", "Nigeria", 10.522, 7.438, 1442000],
  ["Ft. Worth", "United States of America", 32.74, -97.34, 1440454],
  ["Gwangju", "South Korea", 35.173, 126.908, 1440000],
  ["Indianapolis", "United States of America", 39.752, -86.172, 1436000],
  ["San Salvador", "El Salvador", 13.712, -89.205, 1433000],
  ["Suining", "China", 30.535, 105.531, 1425000],
  ["Lyon", "France", 45.772, 4.828, 1423000],
  ["Kampala", "Uganda", 0.319, 32.581, 1420000],
  ["Tabriz", "Iran", 38.088, 46.299, 1413000],
  ["The Hague", "Netherlands", 52.08, 4.27, 1406000],
  ["Davao", "Philippines", 7.112, 125.628, 1402000],
  ["Marseille", "France", 43.292, 5.373, 1400000],
  ["Meerut", "India", 29.002, 77.698, 1398000],
  ["Semarang", "Indonesia", -6.965, 110.418, 1396000],
  ["Mianyang", "China", 31.472, 104.768, 1396000],
  ["Faridabad", "India", 28.435, 77.315, 1394000],
  ["Novosibirsk", "Russia", 55.032, 82.958, 1389000],
  ["Milwaukee", "United States of America", 43.055, -87.922, 1388000],
  ["Makkah", "Saudi Arabia", 21.432, 39.818, 1385000],
  ["Dubai", "United Arab Emirates", 25.232, 55.278, 1379000],
  ["Auckland", "New Zealand", -36.848, 174.763, 1377200],
  ["Brazzaville", "Congo (Brazzaville)", -4.257, 15.283, 1355000],
  ["Lubumbashi", "Congo (Kinshasa)", -11.678, 27.478, 1352000],
  ["Varanasi", "India", 25.332, 82.998, 1352000],
  ["Yiyang", "China", 28.602, 112.328, 1352000],
  ["Orlando", "United States of America", 28.512, -81.382, 1350000],
  ["Ciudad Juarez", "Mexico", 31.692, -106.492, 1343000],
  ["Ghaziabad", "India", 28.662, 77.406, 1341000],
  ["Pretoria", "South Africa", -25.705, 28.227, 1338000],
  ["Heze", "China", 35.232, 115.448, 1338000],
  ["Porto", "Portugal", 41.152, -8.622, 1337000],
  ["Asansol", "India", 23.685, 86.981, 1328000],
  ["Lusaka", "Zambia", -15.415, 28.281, 1328000],
  ["Changzhou", "China", 31.782, 119.968, 1327000],
  ["Mosul", "Iraq", 36.347, 43.143, 1316000],
  ["Yekaterinburg", "Russia", 56.852, 60.598, 1313000],
  ["Peshawar", "Pakistan", 34.007, 71.533, 1303000],
  ["Jamshedpur", "India", 22.789, 86.196, 1300000],
  ["Mandalay", "Myanmar", 21.972, 96.083, 1300000],
  ["Mbuji-Mayi", "Congo (Kinshasa)", -6.148, 23.598, 1295000],
  ["Madurai", "India", 9.922, 78.118, 1294000],
  ["Adana", "Turkey", 36.997, 35.318, 1293000],
  ["Jabalpur", "India", 23.177, 79.953, 1285000],
  ["San Jose", "Costa Rica", 9.937, -84.086, 1284000],
  ["Panama City", "Panama", 8.97, -79.535, 1281000],
  ["Nizhny Novgorod", "Russia", 56.335, 43.998, 1278000],
  ["Chifeng", "China", 42.272, 118.948, 1277000],
  ["Providence", "United States of America", 41.823, -71.417, 1277000],
  ["Munich", "Germany", 48.132, 11.573, 1275000],
  ["Columbus", "United States of America", 39.982, -82.992, 1270000],
  ["Stockholm", "Sweden", 59.353, 18.095, 1264000],
  ["Huaiyin", "China", 33.582, 119.028, 1264000],
  ["Makassar", "Indonesia", -5.138, 119.43, 1262000],
  ["Rajkot", "India", 22.312, 70.798, 1260000],
  ["West Palm Beach", "United States of America", 26.745, -80.124, 1250000],
  ["Dhanbad", "India", 23.802, 86.418, 1246000],
  ["Mudangiang", "China", 44.577, 129.588, 1244000],
  ["Geneva", "Switzerland", 46.21, 6.14, 1240000],
  ["Shiraz", "Iran", 29.632, 52.568, 1240000],
  ["Huzhou", "China", 30.872, 120.098, 1231000],
  ["Tianshui", "China", 34.602, 105.918, 1225000],
  ["Liupanshui", "China", 26.596, 104.831, 1221000],
  ["Seville", "Spain", 37.405, -5.98, 1212045],
  ["Amritsar", "India", 31.642, 74.868, 1212000],
  ["Vila Velha", "Brazil", -20.368, -40.318, 1209091],
  ["Vila Velha", "Brazil", 3.217, -51.217, 1209091],
  ["Almaty", "Kazakhstan", 43.327, 76.913, 1209000],
  ["Warangal", "India", 18.01, 79.58, 1203853],
  ["Rosario", "Argentina", -32.949, -60.668, 1203000],
  ["Allahabad", "India", 25.457, 81.838, 1201000],
  ["Benin City", "Nigeria", 6.342, 5.618, 1190000],
  ["Maceio", "Brazil", -9.618, -35.732, 1186000],
  ["Jining", "China", 35.402, 116.548, 1186000],
  ["Sofia", "Bulgaria", 42.685, 23.315, 1185000],
  ["Banghazi", "Libya", 32.119, 20.065, 1180000],
  ["Raleigh", "United States of America", 35.819, -78.645, 1163515],
  ["Prague", "Czechia", 50.085, 14.464, 1162000],
  ["Austin", "United States of America", 30.269, -97.745, 1161000],
  ["Glasgow", "United Kingdom", 55.876, -4.253, 1160000],
  ["Leshan", "China", 29.569, 103.731, 1157000],
  ["Ouagadougou", "Burkina Faso", 12.372, -1.527, 1149000],
  ["Adelaide", "Australia", -34.933, 138.598, 1145000],
  ["Ottawa", "Canada", 45.419, -75.702, 1145000],
  ["Torreon", "Mexico", 25.572, -103.422, 1144000],
  ["Srinagar", "India", 34.102, 74.813, 1140000],
  ["Samara", "Russia", 53.197, 50.149, 1137000],
  ["Vijayawada", "India", 16.522, 80.628, 1137000],
  ["Omsk", "Russia", 54.992, 73.398, 1135000],
  ["Birmingham", "United States of America", 33.53, -86.825, 1128047],
  ["Yulin", "China", 22.632, 110.148, 1127000],
  ["Nampo", "North Korea", 38.769, 125.45, 1127000],
  ["Xianyang", "China", 34.348, 108.713, 1126000],
  ["Cagayan de Oro", "Philippines", 8.451, 124.685, 1121561],
  ["Can Tho", "Vietnam", 10.05, 105.77, 1121000],
  ["Barquisimeto", "Venezuela", 10.052, -69.302, 1116000],
  ["Helsinki", "Finland", 60.178, 24.932, 1115000],
  ["Kazan", "Russia", 55.752, 49.124, 1115000],
  ["Aurangabad", "India", 19.898, 75.318, 1113000],
  ["Calgary", "Canada", 51.085, -114.082, 1110000],
  ["Zurich", "Switzerland", 47.382, 8.548, 1108000],
  ["Yerevan", "Armenia", 40.183, 44.512, 1102000],
  ["Huambo", "Angola", -12.748, 15.758, 1100000],
  ["Mogadishu", "Somalia", 2.069, 45.365, 1100000],
  ["Tbilisi", "Georgia", 41.727, 44.789, 1100000],
  ["Ankang", "China", 32.68, 109.02, 1100000],
  ["Belgrade", "Serbia", 44.821, 20.466, 1099000],
  ["Bhilai", "India", 21.219, 81.431, 1097000],
  ["Jinhua", "China", 29.12, 119.65, 1092852],
  ["Chelyabinsk", "Russia", 55.157, 61.437, 1091000],
  ["Natal", "Brazil", -5.778, -35.242, 1088000],
  ["Dushanbe", "Tajikistan", 38.56, 68.774, 1086244],
  ["Kobenhavn", "Denmark", 55.681, 12.562, 1085000],
  ["Memphis", "United States of America", 35.122, -90.002, 1081000],
  ["Zhuzhou", "China", 27.832, 113.148, 1080000],
  ["Suwon", "South Korea", 37.26, 127.009, 1078000],
  ["Vereeniging", "South Africa", -26.648, 27.958, 1074000],
  ["Xiangyang", "China", 32.022, 112.128, 1069000],
  ["Ulsan", "South Korea", 35.549, 129.315, 1061000],
  ["Amman", "Jordan", 31.952, 35.931, 1060000],
  ["Dublin", "Ireland", 53.335, -6.251, 1059000],
  ["Edmonton", "Canada", 53.552, -113.502, 1058000],
  ["Sholapur", "India", 17.672, 75.898, 1057000],
  ["Rostov", "Russia", 47.237, 39.711, 1052000],
  ["Dnipro", "Ukraine", 48.482, 34.998, 1050000],
  ["Xining", "China", 36.622, 101.768, 1048000],
  ["Norfolk", "United States of America", 36.85, -76.28, 1047869],
  ["Zhangjiakou", "China", 40.832, 114.928, 1046000],
  ["Ranchi", "India", 23.372, 85.328, 1044000],
  ["Gaziantep", "Turkey", 37.077, 37.383, 1044000],
  ["Lille", "France", 50.652, 3.078, 1044000],
  ["Monrovia", "Liberia", 6.315, -10.8, 1041000],
  ["Sao Luis", "Brazil", -2.514, -44.268, 1038000],
  ["Amsterdam", "Netherlands", 52.352, 4.915, 1031000],
  ["Jerusalem", "Israel", 31.778, 35.207, 1029300],
  ["Guatemala", "Guatemala", 14.623, -90.529, 1024000],
  ["Florianopolis", "Brazil", -27.578, -48.522, 1023000],
  ["Zhuhai", "China", 22.279, 113.566, 1023000],
  ["Port Elizabeth", "South Africa", -33.968, 25.598, 1021000],
  ["Jiamusi", "China", 46.832, 130.348, 1020000],
  ["Port Harcourt", "Nigeria", 4.812, 7.008, 1020000],
  ["Ufa", "Russia", 54.792, 56.038, 1018000],
  ["Bridgeport", "United States of America", 41.182, -73.202, 1018000],
  ["Buffalo", "United States of America", 42.882, -78.882, 1016000],
  ["Hengyang", "China", 26.882, 112.588, 1016000],
  ["Benxi", "China", 41.332, 123.748, 1012000],
  ["Medina", "Saudi Arabia", 24.502, 39.578, 1010000],
  ["Bucaramanga", "Colombia", 7.132, -73.128, 1009000],
  ["Maracay", "Venezuela", 10.249, -67.598, 1007000],
  ["Hims", "Syria", 34.732, 36.718, 1005000],
  ["Rotterdam", "Netherlands", 51.922, 4.478, 1005000],
  ["Cologne", "Germany", 50.932, 6.948, 1004000],
  ["Qinhuangdao", "China", 39.932, 119.618, 1003000],
  ["Fez", "Morocco", 34.057, -5.002, 1002000],
  ["Aden", "Yemen", 12.78, 45.009, 1000000],
  ["Baoshan", "China", 25.12, 99.15, 1000000],
  ["Da Nang", "Vietnam", 16.06, 108.25, 1000000],
  ["Cochabamba", "Bolivia", -17.41, -66.17, 1000000],
  ["Yongzhou", "China", 26.232, 111.618, 1000000],
  ["Perm", "Russia", 58.002, 56.248, 997000],
  ["Ahvaz", "Iran", 31.282, 48.718, 996000],
  ["Jodhpur", "India", 26.294, 73.015, 995000],
  ["Charlotte", "United States of America", 35.207, -80.832, 995000],
  ["San Luis Potosi", "Mexico", 22.172, -101.002, 992000],
  ["Yinchuan", "China", 38.47, 106.271, 991000],
  ["Odessa", "Ukraine", 46.492, 30.708, 991000],
  ["Ndjamena", "Chad", 12.115, 15.047, 989000],
  ["Donetsk", "Ukraine", 48.002, 37.828, 988000],
  ["Jacksonville", "United States of America", 30.332, -81.672, 988000],
  ["Jiaxing", "China", 30.772, 120.748, 988000],
  ["Joinville", "Brazil", -26.318, -48.842, 988000],
  ["Guilin", "China", 25.282, 110.278, 987000],
  ["Volgograd", "Russia", 48.712, 44.498, 984000],
  ["Guwahati", "India", 26.162, 91.768, 983000],
  ["Yichun", "China", 27.835, 114.398, 982000],
  ["Natal", "Brazil", -6.984, -60.27, 980588],
  ["Chandigarh", "India", 30.722, 76.778, 979000],
  ["Gwalior", "India", 26.232, 78.178, 978000],
  ["Qom", "Iran", 34.652, 50.948, 973000],
  ["Salt Lake City", "United States of America", 40.777, -111.932, 966000],
  ["Merida", "Mexico", 20.969, -89.619, 965000],
  ["Jixi", "China", 45.302, 130.968, 965000],
  ["Pingxiang", "China", 27.622, 113.848, 961000],
  ["Queretaro", "Mexico", 20.632, -100.382, 961000],
  ["Jinzhou", "China", 41.122, 121.098, 956000],
  ["Joao Pessoa", "Brazil", -7.099, -34.878, 956000],
  ["Kelang", "Malaysia", 3.022, 101.548, 956000],
  ["Thiruvananthapuram", "India", 8.502, 76.948, 954000],
  ["Kozhikode", "India", 11.252, 75.768, 953000],
  ["Ogbomosho", "Nigeria", 8.132, 4.238, 951000],
  ["Tiruchirappalli", "India", 10.812, 78.688, 951000],
  ["General Santos", "Philippines", 6.111, 125.175, 950530],
  ["Hue", "Vietnam", 16.47, 107.58, 950000],
  ["Bacolod", "Philippines", 10.632, 122.982, 949354],
  ["Louisville", "United States of America", 38.227, -85.751, 948000],
  ["Nantong", "China", 32.032, 120.823, 947000],
  ["Tulsa", "United States of America", 36.12, -95.93, 946962],
  ["Tegucigalpa", "Honduras", 14.104, -87.219, 946000],
  ["Foshan", "China", 23.032, 113.118, 943000],
  ["Kingston", "Jamaica", 17.977, -76.767, 937700],
  ["Naypyidaw", "Myanmar", 19.769, 96.117, 930000],
  ["Nice", "France", 43.717, 7.263, 927000],
  ["Irbil", "Iraq", 36.181, 44.007, 926000],
  ["Krasnoyarsk", "Russia", 56.016, 92.864, 925000],
  ["Djibouti", "Djibouti", 11.595, 43.148, 923000],
  ["Managua", "Nicaragua", 12.155, -86.27, 920000],
  ["Antwerpen", "Belgium", 51.222, 4.413, 920000],
  ["Konya", "Turkey", 37.877, 32.473, 919000],
  ["Bogor", "Indonesia", -6.568, 106.748, 918000],
  ["Niamey", "Niger", 13.519, 2.115, 915000],
  ["Hartford", "United States of America", 41.772, -72.682, 913000],
  ["Huaibei", "China", 33.952, 116.748, 913000],
  ["Xinyu", "China", 27.802, 114.928, 913000],
  ["Richmond", "United States of America", 37.552, -77.452, 912000],
  ["Teresina", "Brazil", -5.093, -42.782, 907000],
  ["Naha", "Japan", 26.207, 127.673, 905238],
  ["Xinxiang", "China", 35.322, 113.868, 903000],
  ["Yibin", "China", 28.772, 104.568, 902000],
  ["Albuquerque", "United States of America", 35.105, -106.641, 898642],
  ["Maiduguri", "Nigeria", 11.852, 13.158, 896000],
  ["Tirana", "Albania", 41.328, 19.819, 895350],
  ["Kathmandu", "Nepal", 27.719, 85.315, 895000],
  ["Bengbu", "China", 32.952, 117.328, 894000],
  ["Mendoza", "Argentina", -32.881, -68.819, 893000],
  ["Hubballi", "India", 15.362, 75.123, 890000],
  ["Concepcion", "Chile", -36.83, -73.05, 889725],
  ["Zaria", "Nigeria", 11.082, 7.708, 889000],
  ["Cartagena", "Colombia", 10.402, -75.516, 887000],
  ["Mysuru", "India", 12.312, 76.658, 887000],
  ["Anyang", "China", 36.082, 114.348, 887000],
  ["Ulaanbaatar", "Mongolia", 47.919, 106.915, 885000],
  ["Mexicali", "Mexico", 32.652, -115.482, 885000],
  ["Tongliao", "China", 43.622, 122.268, 884000],
  ["Mombasa", "Kenya", -4.038, 39.688, 882000],
  ["Newcastle", "United Kingdom", 55.002, -1.602, 882000],
  ["Omaha", "United States of America", 41.24, -96.01, 877110],
  ["Nashville", "United States of America", 36.172, -86.782, 877000],
  ["Callao", "Peru", -12.07, -77.135, 876877],
  ["Bilbao", "Spain", 43.25, -2.93, 875552],
  ["Raipur", "India", 21.237, 81.633, 875000],
  ["Johor Bahru", "Malaysia", 1.482, 103.728, 875000],
  ["Yichang", "China", 30.702, 111.278, 875000],
  ["Salem", "India", 11.672, 78.178, 873000],
  ["Marrakesh", "Morocco", 31.632, -8.002, 872000],
  ["Kaifeng", "China", 34.852, 114.348, 872000],
  ["Albany", "United States of America", 42.67, -73.82, 870716],
  ["Basra", "Iraq", 30.515, 47.812, 870000],
  ["Dandong", "China", 40.146, 124.392, 870000],
  ["Aguascalientes", "Mexico", 21.881, -102.292, 869000],
  ["Xuanzhou", "China", 30.954, 118.753, 866000],
  ["Bandar Lampung", "Indonesia", -5.428, 105.268, 865000],
  ["Palermo", "Italy", 38.127, 13.348, 863000],
  ["Cardiff", "United Kingdom", 51.5, -3.225, 861400],
  ["Kigali", "Rwanda", -1.952, 30.059, 860000],
  ["Tampico", "Mexico", 22.3, -97.87, 859419],
  ["Jiaozuo", "China", 35.252, 113.218, 857000],
  ["Padang", "Indonesia", -0.958, 100.358, 855000],
  ["Jullundur", "India", 31.337, 75.567, 855000],
  ["Valparaiso", "Chile", -33.046, -71.623, 854000],
  ["Zhenjiang", "China", 32.222, 119.428, 854000],
  ["Shache", "China", 38.426, 77.25, 851374],
  ["Anshun", "China", 26.252, 105.928, 849000],
  ["Pingdingshan", "China", 33.732, 113.298, 849000],
  ["Zunyi", "China", 27.702, 106.918, 849000],
  ["Toulouse", "France", 43.622, 1.448, 847000],
  ["Bhubaneshwar", "India", 20.272, 85.825, 844000],
  ["Voronezh", "Russia", 51.732, 39.268, 844000],
  ["Saratov", "Russia", 51.582, 46.028, 843000],
  ["Yuci", "China", 37.682, 112.728, 840000],
  ["Yancheng", "China", 33.388, 120.123, 839000],
  ["Bishkek", "Kyrgyzstan", 42.875, 74.583, 837000],
  ["Oslo", "Norway", 59.919, 10.748, 835000],
  ["Cuernavaca", "Mexico", 18.921, -99.24, 834001],
  ["Linfen", "China", 36.082, 111.518, 834000],
  ["Bangui", "Central African Republic", 4.367, 18.558, 831925],
  ["Warri", "Nigeria", 5.52, 5.76, 830106],
  ["Tucuman", "Argentina", -26.814, -65.219, 830000],
  ["Kermanshah", "Iran", 34.382, 47.058, 828313],
  ["Thessaloniki", "Greece", 40.698, 22.883, 828000],
  ["Freetown", "Sierra Leone", 8.472, -13.236, 827000],
  ["Kota", "India", 25.182, 75.833, 827000],
  ["Yueyang", "China", 29.382, 113.098, 826000],
  ["Agadir", "Morocco", 30.44, -9.62, 825467],
  ["Tucson", "United States of America", 32.207, -110.892, 823000],
  ["Jos", "Nigeria", 9.93, 8.89, 816824],
  ["Xingyi", "China", 25.092, 104.888, 816000],
  ["Cebu", "Philippines", 10.322, 123.898, 815000],
  ["Arequipa", "Peru", -16.418, -71.532, 815000],
  ["Liverpool", "United Kingdom", 53.418, -2.92, 811000],
  ["Rajshahi", "Bangladesh", 24.377, 88.603, 810000],
  ["Langfang", "China", 39.522, 116.678, 810000],
  ["Wuhu", "China", 31.352, 118.368, 810000],
  ["Culiacan", "Mexico", 24.832, -107.382, 809000],
  ["Zhaotang", "China", 27.322, 103.718, 809000],
  ["Valencia", "Spain", 39.487, -0.402, 808000],
  ["Cuiaba", "Brazil", -15.568, -56.087, 806000],
  ["Lingyuan", "China", 41.242, 119.399, 806000],
  ["Qui Nhon", "Vietnam", 13.78, 109.18, 805290],
  ["Aligarh", "India", 27.894, 78.06, 805000],
  ["Malang", "Indonesia", -7.978, 112.608, 805000],
  ["Lvov", "Ukraine", 49.835, 24.03, 803880],
  ["Bordeaux", "France", 44.852, -0.597, 803000],
  ["St. Petersburg", "United States of America", 27.771, -82.679, 800313],
  ["Baoji", "China", 34.38, 107.15, 800000],
  ["Pekanbaru", "Indonesia", 0.567, 101.423, 799000],
  ["Oran", "Algeria", 35.712, -0.622, 798000],
  ["Bhiwandi", "India", 19.352, 73.128, 795000],
  ["Yingkow", "China", 40.672, 122.278, 795000],
  ["Liaoyang", "China", 41.282, 123.178, 794000],
  ["Chihuahua", "Mexico", 28.647, -106.087, 793000],
  ["Jammu", "India", 32.714, 74.845, 791000],
  ["Malacca", "Malaysia", 2.206, 102.246, 788706],
  ["Oklahoma City", "United States of America", 35.472, -97.521, 788000],
  ["Zaporizhzhya", "Ukraine", 47.859, 35.175, 788000],
  ["Moradabad", "India", 28.844, 78.755, 787000],
  ["Honolulu", "United States of America", 21.309, -157.86, 786000],
  ["New Orleans", "United States of America", 29.997, -90.042, 785000],
  ["Antalya", "Turkey", 36.892, 30.698, 783000],
  ["Islamabad", "Pakistan", 33.702, 73.165, 780000],
  ["Al Hudaydah", "Yemen", 14.8, 42.951, 780000],
  ["Campo Grande", "Brazil", -20.448, -54.619, 778000],
  ["Shaoxing", "China", 30.002, 120.568, 777000],
  ["Yichun", "China", 47.702, 128.898, 777000],
  ["Mangaluru", "India", 12.9, 74.85, 776632],
  ["Zamboanga", "Philippines", 6.922, 122.078, 773000],
  ["Dayton", "United States of America", 39.752, -84.202, 773000],
  ["Hamhung", "North Korea", 39.912, 127.543, 773000],
  ["Fuyang", "China", 30.055, 119.95, 771000],
  ["Ilorin", "Nigeria", 8.492, 4.548, 771000],
  ["Fuxin", "China", 42.012, 121.658, 770000],
  ["Quetta", "Pakistan", 30.222, 67.023, 768000],
  ["Trujillo", "Peru", -8.12, -79.02, 765171],
  ["Kananga", "Congo (Kinshasa)", -5.888, 22.398, 765000],
  ["Trabzon", "Turkey", 40.98, 39.72, 764714],
  ["Cotonou", "Benin", 6.402, 2.518, 762000],
  ["Lodz", "Poland", 51.777, 19.449, 758000],
  ["Krakow", "Poland", 50.062, 19.958, 756000],
  ["Rochester", "United States of America", 43.172, -77.622, 755000],
  ["Vientiane", "Laos", 17.967, 102.6, 754000],
  ["Saltillo", "Mexico", 25.422, -101.007, 754000],
  ["El Paso", "United States of America", 31.782, -106.512, 753000],
  ["Taizz", "Yemen", 13.606, 44.037, 751000],
  ["Pietermaritzburg", "South Africa", -29.61, 30.39, 750845],
  ["Tangier", "Morocco", 35.747, -5.833, 750060],
  ["Kolhapur", "India", 16.7, 74.22, 750000],
  ["Fargona", "Uzbekistan", 40.39, 71.78, 750000],
  ["Hsinchu", "Taiwan", 24.817, 120.977, 750000],
  ["Namangan", "Uzbekistan", 41, 71.67, 750000],
  ["Riga", "Latvia", 56.95, 24.1, 742572],
  ["Nouakchott", "Mauritania", 18.086, -15.975, 742144],
  ["Gdansk", "Poland", 54.36, 18.64, 740000],
  ["St. Paul", "United States of America", 44.944, -93.085, 734854],
  ["Muscat", "Oman", 23.613, 58.593, 734697],
  ["Denpasar", "Indonesia", -8.65, 115.22, 732344],
  ["Sokoto", "Nigeria", 13.06, 5.24, 732178],
  ["Ashgabat", "Turkmenistan", 37.95, 58.383, 727700],
  ["Bremen", "Germany", 53.08, 8.8, 724909],
  ["Zagreb", "Croatia", 45.8, 16, 722526],
  ["Cucuta", "Colombia", 7.92, -72.52, 722146],
  ["Kandahar", "Afghanistan", 31.61, 65.695, 715542],
  ["Samarqand", "Uzbekistan", 39.67, 66.945, 708000],
  ["Bulawayo", "Zimbabwe", -20.17, 28.58, 699385],
  ["Sarajevo", "Bosnia and Herzegovina", 43.85, 18.383, 696731],
  ["Enugu", "Nigeria", 6.45, 7.5, 688862],
  ["Chisinau", "Moldova", 47.005, 28.858, 688134],
  ["Aracaju", "Brazil", -10.9, -37.12, 685356],
  ["San Pedro Sula", "Honduras", 15.5, -88.03, 680091],
  ["Ipoh", "Malaysia", 4.6, 101.065, 673318],
  ["Chongjin", "North Korea", 41.785, 129.79, 672614],
  ["An Najaf", "Iraq", 32, 44.335, 665552],
  ["Pointe-Noire", "Congo (Brazzaville)", -4.77, 11.88, 659084],
  ["Bien Hoa", "Vietnam", 10.97, 106.83, 652646],
  ["Andijon", "Uzbekistan", 40.79, 72.34, 650000],
  ["Krasnodar", "Russia", 45.02, 39, 649851],
  ["Zaragoza", "Spain", 41.65, -0.89, 649404],
  ["Genoa", "Italy", 44.41, 8.93, 647497],
  ["Lilongwe", "Malawi", -13.983, 33.783, 646750],
  ["Ulyanovsk", "Russia", 54.33, 48.41, 640680],
  ["Yogyakarta", "Indonesia", -7.78, 110.375, 636660],
  ["Winnipeg", "Canada", 49.883, -97.166, 632063],
  ["Izhevsk", "Russia", 56.85, 53.23, 631038],
  ["Quebec", "Canada", 46.84, -71.246, 624177],
  ["Bur Said", "Egypt", 31.26, 32.29, 623864],
  ["Asmara", "Eritrea", 15.333, 38.933, 620802],
  ["Dresden", "Germany", 51.05, 13.75, 617515],
  ["Palu", "Indonesia", -0.907, 119.833, 612445],
  ["Samsun", "Turkey", 41.28, 36.344, 609339],
  ["Pontianak", "Indonesia", -0.03, 109.32, 607311],
  ["Yaroslavl", "Russia", 57.62, 39.87, 606730],
  ["Constantine", "Algeria", 36.36, 6.6, 605179],
  ["Bandjarmasin", "Indonesia", -3.33, 114.58, 603576],
  ["Abu Dhabi", "United Arab Emirates", 24.467, 54.367, 603492],
  ["Kirkuk", "Iraq", 35.472, 44.392, 601433],
  ["Barnaul", "Russia", 53.355, 83.745, 599579],
  ["Zahedan", "Iran", 29.5, 60.83, 598887],
  ["Chiclayo", "Peru", -6.763, -79.837, 596792],
  ["Hermosillo", "Mexico", 29.099, -110.954, 595811],
  ["Port Louis", "Mauritius", -20.167, 57.5, 595491],
  ["Rasht", "Iran", 37.3, 49.63, 594590],
  ["Nagano", "Japan", 36.65, 138.17, 594311],
  ["Vinh", "Vietnam", 18.7, 105.68, 593645],
  ["Kayseri", "Turkey", 38.735, 35.49, 592840],
  ["Samarinda", "Indonesia", -0.5, 117.15, 592228],
  ["Vladivostok", "Russia", 43.13, 131.91, 587022],
  ["Irkutsk", "Russia", 52.32, 104.245, 586695],
  ["Blantyre", "Malawi", -15.79, 34.99, 584877],
  ["Khabarovsk", "Russia", 48.455, 135.12, 579000],
  ["Kisangani", "Congo (Kinshasa)", 0.52, 25.22, 578470],
  ["Libreville", "Gabon", 0.385, 9.458, 578156],
  ["Kerman", "Iran", 30.3, 57.08, 577514],
  ["Quetzaltenango", "Guatemala", 14.83, -91.52, 575263],
  ["Kuching", "Malaysia", 1.53, 110.33, 570407],
  ["Niigata", "Japan", 37.92, 139.04, 569797],
  ["Macau", "Macau S.A.R", 22.203, 113.545, 568700],
  ["Bouake", "Ivory Coast", 7.69, -5.03, 567481],
  ["Manama", "Bahrain", 26.236, 50.583, 563920],
  ["Santiago de Cuba", "Cuba", 20.025, -75.821, 555865],
  ["Kagoshima", "Japan", 31.586, 130.561, 555352],
  ["Makhachkala", "Russia", 42.98, 47.5, 554981],
  ["Kanazawa", "Japan", 36.56, 136.64, 551249],
  ["Orenburg", "Russia", 51.78, 55.11, 550204],
  ["Tabuk", "Saudi Arabia", 28.384, 36.555, 547957],
  ["Vilnius", "Lithuania", 54.683, 25.317, 542366],
  ["Goteborg", "Sweden", 57.75, 12, 537797],
  ["Tomsk", "Russia", 56.495, 84.975, 535479],
  ["Matsuyama", "Japan", 33.846, 132.766, 533541],
  ["Oaxaca", "Mexico", 17.083, -96.67, 530728],
  ["Beira", "Mozambique", -19.82, 34.87, 530604],
  ["Tarabulus", "Lebanon", 34.422, 35.868, 530000],
  ["Harrisburg", "United States of America", 40.274, -76.885, 528892],
  ["Hamadan", "Iran", 34.796, 48.515, 528256],
  ["Kota Kinabalu", "Malaysia", 5.98, 116.11, 527671],
  ["Ryazan", "Russia", 54.62, 39.72, 520173],
  ["Tyumen", "Russia", 57.14, 65.53, 519119],
  ["Lipetsk", "Russia", 52.62, 39.64, 515655],
  ["Eskisehir", "Turkey", 39.795, 30.53, 514869],
  ["Banda Aceh", "Indonesia", 5.55, 95.32, 513698],
  ["Salta", "Argentina", -24.783, -65.417, 512686],
  ["Penza", "Russia", 53.18, 45, 512602],
  ["Gaza", "Palestine", 31.53, 34.445, 505700],
  ["Kota Baharu", "Malaysia", 6.12, 102.23, 505583],
  ["Edinburgh", "United Kingdom", 55.948, -3.219, 504966],
  ["Annaba", "Algeria", 36.92, 7.76, 503524],
  ["Astrakhan", "Russia", 46.349, 48.055, 502533],
  ["El Minya", "Egypt", 28.09, 30.75, 500000],
  ["Thai Nguyen", "Vietnam", 21.6, 105.83, 500000],
  ["Macapa", "Brazil", 0.033, -51.05, 499166],
  ["Skopje", "North Macedonia", 42, 21.433, 494087],
  ["Mwanza", "Tanzania", -2.52, 32.93, 493944],
  ["Port Sudan", "Sudan", 19.616, 37.216, 489725],
  ["Santa Fe", "Argentina", -31.624, -60.69, 489505],
  ["Tula", "Russia", 54.2, 37.63, 489486],
  ["Tuxtla Gutierrez", "Mexico", 16.75, -93.15, 481128],
  ["Herat", "Afghanistan", 34.33, 62.17, 481009],
  ["Homyel", "Belarus", 52.43, 31, 480951],
  ["Yazd", "Iran", 31.92, 54.37, 477905],
  ["Hargeysa", "Somaliland", 9.56, 44.065, 477876],
  ["Kemerovo", "Russia", 55.34, 86.09, 477090],
  ["Shymkent", "Kazakhstan", 42.32, 69.595, 465392],
  ["Pristina", "Kosovo", 42.667, 21.166, 465186],
  ["Qazvin", "Iran", 36.27, 50, 464551],
  ["Bloemfontein", "South Africa", -29.12, 26.23, 463064],
  ["Bandar-e-Abbas", "Iran", 27.204, 56.272, 461499],
  ["Iquitos", "Peru", -3.75, -73.25, 458729],
  ["Mazar-e Sharif", "Afghanistan", 36.7, 67.1, 458151],
  ["Kirov", "Russia", 58.59, 49.67, 457437],
  ["Durango", "Mexico", 24.031, -104.67, 457140],
  ["Jambi", "Indonesia", -1.59, 103.61, 457090],
  ["Manado", "Indonesia", 1.48, 124.85, 451893],
  ["Qaraghandy", "Kazakhstan", 49.885, 73.115, 451800],
  ["Belfast", "United Kingdom", 54.6, -5.96, 450406],
  ["Sanliurfa", "Turkey", 37.17, 38.795, 449549],
  ["Baguio City", "Philippines", 16.43, 120.57, 447824],
  ["San Juan", "Argentina", -31.55, -68.52, 447048],
  ["Cheboksary", "Russia", 56.13, 47.25, 446781],
  ["Bamenda", "Cameroon", 5.96, 10.15, 445299],
  ["Strasbourg", "France", 48.58, 7.75, 439972],
  ["San Cristobal", "Venezuela", 7.77, -72.25, 438798],
  ["Khujand", "Tajikistan", 40.29, 69.62, 437684],
  ["Garoua", "Cameroon", 9.3, 13.39, 436899],
  ["Bukavu", "Congo (Kinshasa)", -2.51, 28.84, 436779],
  ["Nagasaki", "Japan", 32.765, 129.885, 435455],
  ["Kaliningrad", "Russia", 54.7, 20.497, 434954],
  ["San Luis", "Argentina", -33.3, -66.35, 432310],
  ["Santa Marta", "Colombia", 11.247, -74.202, 431781],
  ["Villahermosa", "Mexico", 18, -92.9, 428564],
  ["Bryansk", "Russia", 53.26, 34.43, 427236],
  ["Bengkulu", "Indonesia", -3.8, 102.27, 426673],
  ["Bratislava", "Slovakia", 48.15, 17.117, 423737],
  ["Baton Rouge", "United States of America", 30.458, -91.14, 422072],
  ["Ibague", "Colombia", 4.439, -75.232, 421685],
  ["Ivanovo", "Russia", 57.01, 41.01, 420839],
  ["Asyut", "Egypt", 27.19, 31.18, 420585],
  ["Kolwezi", "Congo (Kinshasa)", -10.717, 25.472, 418000],
  ["Ardabil", "Iran", 38.25, 48.3, 414603],
  ["Huancayo", "Peru", -12.08, -75.2, 412733],
  ["Nha Trang", "Vietnam", 12.25, 109.17, 411556],
  ["Maturin", "Venezuela", 9.75, -63.17, 410972],
  ["Kursk", "Russia", 51.74, 36.19, 409431],
  ["Oujda", "Morocco", 34.69, -1.91, 409391],
  ["Murcia", "Spain", 37.98, -1.13, 406807],
  ["Zanzibar", "Tanzania", -6.16, 39.2, 403658],
  ["Bissau", "Guinea Bissau", 11.865, -15.598, 403339],
  ["Kassala", "Sudan", 15.46, 36.39, 401477],
  ["Tver", "Russia", 56.86, 35.89, 400212],
  ["Columbia", "United States of America", 34.04, -80.9, 398093],
  ["Chiang Mai", "Thailand", 18.8, 98.98, 397211],
  ["Piura", "Peru", -5.21, -80.63, 396932],
  ["Ndola", "Zambia", -13, 28.65, 396339],
  ["Kisumu", "Kenya", -0.09, 34.75, 395615],
  ["Tallinn", "Estonia", 59.434, 24.728, 394024],
  ["Wellington", "New Zealand", -41.3, 174.783, 393400],
  ["El Obeid", "Sudan", 13.183, 30.217, 393311],
  ["Niyala", "Sudan", 12.06, 24.89, 392373],
  ["Nampula", "Mozambique", -15.136, 39.293, 388526],
  ["Resistencia", "Argentina", -27.46, -58.99, 387158],
  ["Misratah", "Libya", 32.38, 15.1, 386120],
  ["Pasto", "Colombia", 1.214, -77.281, 382236],
  ["Des Moines", "United States of America", 41.58, -93.62, 380655],
  ["Sevastapol", "Russia", 44.6, 33.465, 379200],
  ["Las Palmas", "Spain", 28.1, -15.43, 378495],
  ["Manizales", "Colombia", 5.06, -75.52, 375848],
  ["Palma", "Spain", 39.574, 2.654, 375773],
  ["Villavicencio", "Colombia", 4.153, -73.635, 374763],
  ["Valletta", "Malta", 35.9, 14.515, 368250],
  ["Trenton", "United States of America", 40.217, -74.743, 366513],
  ["Kuantan", "Malaysia", 3.83, 103.32, 366229],
  ["Nakuru", "Kenya", -0.28, 36.07, 364727],
  ["Christchurch", "New Zealand", -43.535, 172.63, 363200],
  ["Stavropol", "Russia", 45.05, 41.98, 363064],
  ["Maseru", "Lesotho", -29.317, 27.483, 361324],
  ["Cusco", "Peru", -13.525, -71.972, 361182],
  ["Ulan Ude", "Russia", 51.825, 107.625, 360278],
  ["Bobo Dioulasso", "Burkina Faso", 11.18, -4.29, 360106],
  ["Halifax", "Canada", 44.65, -63.6, 359111],
  ["Taraz", "Kazakhstan", 42.9, 71.365, 358153],
  ["Posadas", "Argentina", -27.358, -55.885, 357119],
  ["Archangel", "Russia", 64.575, 40.545, 356051],
  ["Ambon", "Indonesia", -3.717, 128.2, 355596],
  ["Santiago del Estero", "Argentina", -27.783, -64.267, 354692],
  ["Safi", "Morocco", 32.32, -9.24, 353476],
  ["Hualien", "Taiwan", 23.984, 121.6, 350468],
  ["Camaguey", "Cuba", 21.381, -77.917, 347562],
  ["Astana", "Kazakhstan", 51.181, 71.428, 345604],
  ["Merida", "Venezuela", 8.4, -71.13, 345489],
  ["Belgorod", "Russia", 50.63, 36.6, 345289],
  ["Kosti", "Sudan", 13.17, 32.66, 345068],
  ["Kurgan", "Russia", 55.46, 65.345, 343129],
  ["Vitsyebsk", "Belarus", 55.189, 30.185, 342700],
  ["Arusha", "Tanzania", -3.36, 36.67, 341136],
  ["Boise", "United States of America", 43.609, -116.227, 338071],
  ["Ciudad Bolivar", "Venezuela", 8.1, -63.6, 338000],
  ["Santa Cruz de Tenerife", "Spain", 28.47, -16.25, 336061],
  ["Kochi", "Japan", 33.562, 133.538, 335570],
  ["Nakhon Ratchasima", "Thailand", 15, 102.1, 334984],
  ["Orel", "Russia", 52.97, 36.07, 334552],
  ["Medani", "Sudan", 14.4, 33.52, 332714],
  ["Bujumbura", "Burundi", -3.376, 29.36, 331700],
  ["Wonsan", "North Korea", 39.16, 127.431, 329207],
  ["Pavlodar", "Kazakhstan", 52.3, 76.95, 329002],
  ["Canberra", "Australia", -35.283, 149.129, 327700],
  ["Madison", "United States of America", 43.073, -89.401, 327447],
  ["Sousse", "Tunisia", 35.83, 10.625, 327004],
  ["Iasi", "Romania", 47.168, 27.575, 325914],
  ["Birjand", "Iran", 32.88, 59.22, 324703],
  ["Miyazaki", "Japan", 31.918, 131.418, 324384],
  ["Valladolid", "Spain", 41.65, -4.75, 322304],
  ["Smolensk", "Russia", 54.783, 32.047, 320991],
  ["Ciudad del Este", "Paraguay", -25.517, -54.616, 320872],
  ["Maroua", "Cameroon", 10.596, 14.325, 319941],
  ["Bukhara", "Uzbekistan", 39.78, 64.43, 319476],
  ["Murmansk", "Russia", 68.97, 33.1, 319263],
  ["Holguin", "Cuba", 20.887, -76.263, 319102],
  ["Oskemen", "Kazakhstan", 49.99, 82.615, 319067],
  ["Vladimir", "Russia", 56.13, 40.41, 318648],
  ["New Delhi", "India", 28.6, 77.2, 317797],
  ["Cumana", "Venezuela", 10.45, -64.18, 317603],
  ["El Faiyum", "Egypt", 29.31, 30.84, 316772],
  ["Cluj-Napoca", "Romania", 46.788, 23.598, 316748],
  ["Ljubljana", "Slovenia", 46.055, 14.515, 314807],
  ["Aswan", "Egypt", 24.088, 32.899, 313442],
  ["Semey", "Kazakhstan", 50.435, 80.275, 311353],
  ["Pucallpa", "Peru", -8.369, -74.535, 310750],
  ["Antofagasta", "Chile", -23.65, -70.4, 309832],
  ["Chita", "Russia", 52.055, 113.465, 308500],
  ["Naltchik", "Russia", 43.498, 43.618, 307866],
  ["Porto Velho", "Brazil", -8.75, -63.9, 306180],
  ["San Salvador de Jujuy", "Argentina", -24.183, -65.3, 305891],
  ["Constanta", "Romania", 44.203, 28.61, 303399],
  ["Tambov", "Russia", 52.73, 41.43, 301482],
  ["Brest", "Belarus", 52.1, 23.7, 300715],
  ["Porto-Novo", "Benin", 6.483, 2.617, 300000],
  ["Qyzylorda", "Kazakhstan", 44.8, 65.465, 300000],
  ["Aomori", "Japan", 40.825, 140.71, 298394],
  ["Bandar Seri Begawan", "Brunei", 4.883, 114.933, 296500],
  ["Morioka", "Japan", 39.72, 141.13, 295172],
  ["Port-of-Spain", "Trinidad and Tobago", 10.652, -61.517, 294934],
  ["Vologda", "Russia", 59.21, 39.92, 294889],
  ["Sumy", "Ukraine", 50.924, 34.781, 294456],
  ["Fukushima", "Japan", 37.74, 140.47, 294237],
  ["Makurdi", "Nigeria", 7.73, 8.53, 292645],
  ["Minna", "Nigeria", 9.62, 6.55, 291905],
  ["Mbeya", "Tanzania", -8.89, 33.43, 291649],
  ["Victoria", "Canada", 48.433, -123.35, 289625],
  ["Sinuiju", "North Korea", 40.086, 124.421, 288112],
  ["Cuenca", "Ecuador", -2.9, -79, 286878],
  ["Sekondi", "Ghana", 4.943, -1.704, 286248],
  ["Bago", "Myanmar", 17.32, 96.515, 284318],
  ["Port Moresby", "Papua New Guinea", -9.465, 147.193, 283733],
  ["Kupang", "Indonesia", -10.179, 123.583, 282396],
  ["Zhytomyr", "Ukraine", 50.246, 28.662, 282192],
  ["Cap-Haitien", "Haiti", 19.759, -72.213, 281487],
  ["Batna", "Algeria", 35.57, 6.17, 280798],
  ["Tacna", "Peru", -18, -70.25, 280098],
  ["Lansing", "United States of America", 42.734, -84.547, 279952],
  ["Ica", "Peru", -14.068, -75.725, 279420],
  ["Kaolack", "Senegal", 14.15, -16.1, 277812],
  ["Kostroma", "Russia", 57.77, 40.94, 277656],
  ["Komsomolsk na Amure", "Russia", 50.555, 137.02, 275908],
  ["Bern", "Switzerland", 46.917, 7.467, 275329],
  ["Monteria", "Colombia", 8.758, -75.89, 275198],
  ["Mbandaka", "Congo (Kinshasa)", 0.04, 18.26, 274996],
  ["Ciudad Victoria", "Mexico", 23.72, -99.13, 274900],
  ["Setif", "Algeria", 36.18, 5.4, 274744],
  ["Pamplona", "Spain", 42.82, -1.65, 274545],
  ["Ubon Ratchathani", "Thailand", 15.25, 104.83, 273893],
  ["Guantanamo", "Cuba", 20.145, -75.206, 272801],
  ["Little Rock", "United States of America", 34.736, -92.331, 270893],
  ["Venice", "Italy", 45.439, 12.335, 270816],
  ["Malmo", "Sweden", 55.583, 13.033, 269349],
  ["Windhoek", "Namibia", -22.57, 17.084, 268132],
  ["Temuco", "Chile", -38.73, -72.58, 265901],
  ["Petrozavodsk", "Russia", 61.85, 34.28, 265025],
  ["Imphal", "India", 24.8, 93.95, 264986],
  ["Georgetown", "Guyana", 6.802, -58.167, 264350],
  ["Kindu", "Congo (Kinshasa)", -2.964, 25.91, 262914],
  ["Aqtobe", "Kazakhstan", 50.28, 57.17, 262457],
  ["Popayan", "Colombia", 2.42, -76.61, 258750],
  ["Al Mukalla", "Yemen", 14.541, 49.126, 258132],
  ["Rio Branco", "Brazil", -9.967, -67.8, 257642],
  ["Chimoio", "Mozambique", -19.12, 33.47, 256936],
  ["Daloa", "Ivory Coast", 6.89, -6.45, 255168],
  ["Paramaribo", "Suriname", 5.835, -55.167, 254169],
  ["El Fasher", "Sudan", 13.63, 25.35, 252609],
  ["Khon Kaen", "Thailand", 16.42, 102.83, 251056],
  ["Jackson", "United States of America", 32.299, -90.185, 250902],
  ["Morogoro", "Tanzania", -6.82, 37.66, 250902],
  ["Santa Clara", "Cuba", 22.4, -79.967, 250512],
  ["Dili", "East Timor", -8.559, 125.579, 234331],
  ["Nassau", "The Bahamas", 25.083, -77.35, 227940],
  ["Nicosia", "Cyprus", 35.167, 33.367, 224300],
  ["Dodoma", "Tanzania", -6.183, 35.75, 218269],
  ["Colombo", "Sri Lanka", 6.932, 79.858, 217000],
  ["Gaborone", "Botswana", -24.646, 25.912, 208411],
  ["Yamoussoukro", "Ivory Coast", 6.818, -5.275, 206499],
  ["Bridgetown", "Barbados", 13.102, -59.617, 191152],
  ["La Paz", "Mexico", 24.14, -110.32, 189767],
  ["Gibraltar", "Gibraltar", 36.132, -5.378, 187083],
  ["Suva", "Fiji", -18.133, 178.442, 175399],
  ["Bata", "Equatorial Guinea", 1.87, 9.77, 173046],
  ["Reykjavik", "Iceland", 64.15, -21.95, 166212],
  ["Malakal", "South Sudan", 9.537, 31.656, 160765],
  ["Hamilton", "New Zealand", -37.778, 175.29, 148200],
  ["Podgorica", "Montenegro", 42.466, 19.266, 145850],
  ["Papeete", "French Polynesia", -17.533, -149.567, 131695],
  ["Moroni", "Comoros", -11.704, 43.24, 128698],
  ["Agana", "Guam", 13.47, 144.75, 122411],
  ["Praia", "Cape Verde", 14.917, -23.517, 113364],
  ["Male", "Maldives", 4.167, 73.5, 112927],
  ["Luxembourg", "Luxembourg", 49.612, 6.13, 107260],
  ["Thimphu", "Bhutan", 27.473, 89.639, 98676],
  ["Noumea", "New Caledonia", -22.263, 166.444, 93060],
  ["Mbabane", "eSwatini", -26.317, 31.133, 90138],
  ["Sao Tome", "Sao Tome and Principe", 0.333, 6.733, 88219],
  ["Honiara", "Solomon Islands", -9.438, 159.95, 76328],
  ["San Juan", "Dominican Republic", 18.809, -71.231, 72950],
  ["Apia", "Samoa", -13.842, -171.739, 61916],
  ["Andorra", "Andorra", 42.5, 1.516, 53998],
  ["Hamilton", "Bermuda", 32.294, -64.784, 52320],
  ["Kingstown", "Saint Vincent and the Grenadines", 13.148, -61.212, 49485],
  ["Port Vila", "Vanuatu", -17.733, 168.317, 44040],
  ["Banjul", "The Gambia", 13.454, -16.592, 43094],
  ["Nukualofa", "Tonga", -21.139, -175.221, 42620],
  ["Castries", "Saint Lucia", 14.002, -61, 37963],
  ["Monaco", "Monaco", 43.74, 7.407, 36371],
  ["Saint John's", "Antigua and Barbuda", 17.118, -61.85, 35499],
  ["Saint George's", "Grenada", 12.053, -61.742, 33734],
  ["Victoria", "Seychelles", -4.617, 55.45, 33576],
  ["Tarawa", "Kiribati", 1.338, 173.018, 28802],
  ["Majuro", "Marshall Islands", 7.103, 171.38, 25400],
  ["Roseau", "Dominica", 15.301, -61.387, 23336],
  ["Basseterre", "Saint Kitts and Nevis", 17.302, -62.717, 21887],
  ["Belmopan", "Belize", 17.252, -88.767, 15220],
  ["Nuuk", "Greenland", 64.198, -51.733, 14798],
  ["Torshavn", "Faroe Islands", 62.03, -6.82, 14398],
  ["Pago Pago", "American Samoa", -14.277, -170.707, 12576],
  ["Melekeok", "Palau", 7.487, 134.627, 7026],
  ["Avarua", "Cook Islands", -21.196, -159.785, 5445],
  ["Funafuti", "Tuvalu", -8.517, 179.217, 4749],
  ["Palikir", "Federated States of Micronesia", 6.917, 158.15, 4645],
  ["Stanley", "Falkland Islands", -51.7, -57.85, 2213],
  ["Longyearbyen", "Svalbard and Jan Mayen Islands", 78.217, 15.55, 1232],
  ["Bir Lehlou", "Western Sahara", 26.119, -9.653, 500],
];

/** 국가 → [대표 도시(수도 우선), lat, lng] */
export const COUNTRY_REP_CITY: Readonly<Record<string, readonly [string, number, number]>> = {
  "Japan": [
    "Tokyo",
    35.687,
    139.749
  ],
  "United States of America": [
    "Washington",
    38.901,
    -77.011
  ],
  "Mexico": [
    "Mexico City",
    19.444,
    -99.133
  ],
  "India": [
    "New Delhi",
    28.6,
    77.2
  ],
  "Brazil": [
    "Brasilia",
    -15.781,
    -47.918
  ],
  "China": [
    "Beijing",
    39.931,
    116.386
  ],
  "Egypt": [
    "Cairo",
    30.052,
    31.248
  ],
  "Russia": [
    "Moscow",
    55.754,
    37.614
  ],
  "Turkey": [
    "Ankara",
    39.929,
    32.862
  ],
  "France": [
    "Paris",
    48.869,
    2.331
  ],
  "Nigeria": [
    "Abuja",
    9.085,
    7.531
  ],
  "Indonesia": [
    "Jakarta",
    -6.172,
    106.827
  ],
  "United Kingdom": [
    "London",
    51.502,
    -0.119
  ],
  "Colombia": [
    "Bogota",
    4.598,
    -74.085
  ],
  "Hong Kong S.A.R.": [
    "Hong Kong",
    22.307,
    114.183
  ],
  "Chile": [
    "Santiago",
    -33.448,
    -70.669
  ],
  "Singapore": [
    "Singapore",
    1.295,
    103.854
  ],
  "Australia": [
    "Canberra",
    -35.283,
    149.129
  ],
  "Saudi Arabia": [
    "Riyadh",
    24.643,
    46.771
  ],
  "Italy": [
    "Rome",
    41.898,
    12.481
  ],
  "South Africa": [
    "Pretoria",
    -25.705,
    28.227
  ],
  "Kenya": [
    "Nairobi",
    -1.281,
    36.815
  ],
  "Argentina": [
    "Buenos Aires",
    -34.601,
    -58.399
  ],
  "Philippines": [
    "Manila",
    14.606,
    120.98
  ],
  "South Korea": [
    "Seoul",
    37.568,
    126.998
  ],
  "Peru": [
    "Lima",
    -12.046,
    -77.052
  ],
  "Iran": [
    "Tehran",
    35.674,
    51.422
  ],
  "Congo (Kinshasa)": [
    "Kinshasa",
    -4.328,
    15.313
  ],
  "Taiwan": [
    "Taipei",
    25.036,
    121.568
  ],
  "Thailand": [
    "Bangkok",
    13.752,
    100.515
  ],
  "Spain": [
    "Madrid",
    40.402,
    -3.685
  ],
  "Canada": [
    "Ottawa",
    45.419,
    -75.702
  ],
  "Iraq": [
    "Baghdad",
    33.341,
    44.392
  ],
  "Germany": [
    "Berlin",
    52.524,
    13.4
  ],
  "Afghanistan": [
    "Kabul",
    34.519,
    69.181
  ],
  "Greece": [
    "Athens",
    37.985,
    23.731
  ],
  "Morocco": [
    "Rabat",
    34.025,
    -6.836
  ],
  "Ethiopia": [
    "Addis Ababa",
    9.035,
    38.698
  ],
  "Venezuela": [
    "Caracas",
    10.503,
    -66.919
  ],
  "Ukraine": [
    "Kiev",
    50.435,
    30.515
  ],
  "Senegal": [
    "Dakar",
    14.718,
    -17.475
  ],
  "Austria": [
    "Vienna",
    48.202,
    16.365
  ],
  "Uzbekistan": [
    "Tashkent",
    41.314,
    69.293
  ],
  "United Arab Emirates": [
    "Dubai",
    25.232,
    55.278
  ],
  "New Zealand": [
    "Wellington",
    -41.3,
    174.783
  ],
  "Sweden": [
    "Stockholm",
    59.353,
    18.095
  ],
  "Switzerland": [
    "Bern",
    46.917,
    7.467
  ],
  "Netherlands": [
    "Amsterdam",
    52.352,
    4.915
  ],
  "Bangladesh": [
    "Dhaka",
    23.725,
    90.407
  ],
  "Pakistan": [
    "Islamabad",
    33.702,
    73.165
  ],
  "Vietnam": [
    "Hanoi",
    21.035,
    105.848
  ],
  "Angola": [
    "Luanda",
    -8.836,
    13.232
  ],
  "Sudan": [
    "Khartoum",
    15.59,
    32.532
  ],
  "Myanmar": [
    "Naypyidaw",
    19.769,
    96.117
  ],
  "Ivory Coast": [
    "Yamoussoukro",
    6.818,
    -5.275
  ],
  "Algeria": [
    "Algiers",
    36.765,
    3.049
  ],
  "North Korea": [
    "Pyongyang",
    39.021,
    125.753
  ],
  "Israel": [
    "Jerusalem",
    31.778,
    35.207
  ],
  "Tanzania": [
    "Dodoma",
    -6.183,
    35.75
  ],
  "Portugal": [
    "Lisbon",
    38.725,
    -9.147
  ],
  "Syria": [
    "Aleppo",
    36.232,
    37.168
  ],
  "Ecuador": [
    "Guayaquil",
    -2.218,
    -79.922
  ],
  "Libya": [
    "Tripoli",
    32.893,
    13.18
  ],
  "Cuba": [
    "Havana",
    23.134,
    -82.366
  ],
  "Dominican Republic": [
    "Santo Domingo",
    18.472,
    -69.902
  ],
  "Ghana": [
    "Accra",
    5.552,
    -0.219
  ],
  "Kuwait": [
    "Kuwait City",
    29.372,
    47.976
  ],
  "Yemen": [
    "Sanaa",
    15.357,
    44.205
  ],
  "Romania": [
    "Bucharest",
    44.435,
    26.098
  ],
  "Belgium": [
    "Brussels",
    50.835,
    4.331
  ],
  "Poland": [
    "Warsaw",
    52.252,
    20.998
  ],
  "Hungary": [
    "Budapest",
    47.502,
    19.081
  ],
  "Malaysia": [
    "George Town",
    5.414,
    100.329
  ],
  "Czechia": [
    "Prague",
    50.085,
    14.464
  ],
  "Finland": [
    "Helsinki",
    60.178,
    24.932
  ],
  "Denmark": [
    "Kobenhavn",
    55.681,
    12.562
  ],
  "Ireland": [
    "Dublin",
    53.335,
    -6.251
  ],
  "Liberia": [
    "Monrovia",
    6.315,
    -10.8
  ],
  "Norway": [
    "Oslo",
    59.919,
    10.748
  ],
  "Puerto Rico": [
    "San Juan",
    18.44,
    -66.13
  ],
  "Tunisia": [
    "Tunis",
    36.803,
    10.18
  ],
  "Azerbaijan": [
    "Baku",
    40.397,
    49.86
  ],
  "Bolivia": [
    "La Paz",
    -16.496,
    -68.152
  ],
  "Haiti": [
    "Port-au-Prince",
    18.543,
    -72.338
  ],
  "Paraguay": [
    "Asuncion",
    -25.294,
    -57.643
  ],
  "Lebanon": [
    "Beirut",
    33.874,
    35.508
  ],
  "Belarus": [
    "Minsk",
    53.902,
    27.565
  ],
  "Madagascar": [
    "Antananarivo",
    -18.915,
    47.515
  ],
  "Cameroon": [
    "Douala",
    4.062,
    9.708
  ],
  "Zimbabwe": [
    "Harare",
    -17.816,
    31.043
  ],
  "Uruguay": [
    "Montevideo",
    -34.856,
    -56.173
  ],
  "Mali": [
    "Bamako",
    12.652,
    -8.002
  ],
  "Guinea": [
    "Conakry",
    9.533,
    -13.682
  ],
  "Cambodia": [
    "Phnom Penh",
    11.552,
    104.915
  ],
  "Togo": [
    "Lome",
    6.134,
    1.221
  ],
  "Mozambique": [
    "Maputo",
    -25.953,
    32.587
  ],
  "El Salvador": [
    "San Salvador",
    13.712,
    -89.205
  ],
  "Uganda": [
    "Kampala",
    0.319,
    32.581
  ],
  "Congo (Brazzaville)": [
    "Brazzaville",
    -4.257,
    15.283
  ],
  "Zambia": [
    "Lusaka",
    -15.415,
    28.281
  ],
  "Costa Rica": [
    "San Jose",
    9.937,
    -84.086
  ],
  "Panama": [
    "Panama City",
    8.97,
    -79.535
  ],
  "Kazakhstan": [
    "Astana",
    51.181,
    71.428
  ],
  "Bulgaria": [
    "Sofia",
    42.685,
    23.315
  ],
  "Burkina Faso": [
    "Ouagadougou",
    12.372,
    -1.527
  ],
  "Armenia": [
    "Yerevan",
    40.183,
    44.512
  ],
  "Somalia": [
    "Mogadishu",
    2.069,
    45.365
  ],
  "Georgia": [
    "Tbilisi",
    41.727,
    44.789
  ],
  "Serbia": [
    "Belgrade",
    44.821,
    20.466
  ],
  "Tajikistan": [
    "Dushanbe",
    38.56,
    68.774
  ],
  "Jordan": [
    "Amman",
    31.952,
    35.931
  ],
  "Guatemala": [
    "Guatemala",
    14.623,
    -90.529
  ],
  "Chad": [
    "Ndjamena",
    12.115,
    15.047
  ],
  "Honduras": [
    "Tegucigalpa",
    14.104,
    -87.219
  ],
  "Jamaica": [
    "Kingston",
    17.977,
    -76.767
  ],
  "Nicaragua": [
    "Managua",
    12.155,
    -86.27
  ],
  "Niger": [
    "Niamey",
    13.519,
    2.115
  ],
  "Albania": [
    "Tirana",
    41.328,
    19.819
  ],
  "Nepal": [
    "Kathmandu",
    27.719,
    85.315
  ],
  "Mongolia": [
    "Ulaanbaatar",
    47.919,
    106.915
  ],
  "Kyrgyzstan": [
    "Bishkek",
    42.875,
    74.583
  ],
  "Central African Republic": [
    "Bangui",
    4.367,
    18.558
  ],
  "Sierra Leone": [
    "Freetown",
    8.472,
    -13.236
  ],
  "Benin": [
    "Cotonou",
    6.402,
    2.518
  ],
  "Laos": [
    "Vientiane",
    17.967,
    102.6
  ],
  "Latvia": [
    "Riga",
    56.95,
    24.1
  ],
  "Mauritania": [
    "Nouakchott",
    18.086,
    -15.975
  ],
  "Oman": [
    "Muscat",
    23.613,
    58.593
  ],
  "Turkmenistan": [
    "Ashgabat",
    37.95,
    58.383
  ],
  "Croatia": [
    "Zagreb",
    45.8,
    16
  ],
  "Bosnia and Herzegovina": [
    "Sarajevo",
    43.85,
    18.383
  ],
  "Moldova": [
    "Chisinau",
    47.005,
    28.858
  ],
  "Malawi": [
    "Lilongwe",
    -13.983,
    33.783
  ],
  "Eritrea": [
    "Asmara",
    15.333,
    38.933
  ],
  "Gabon": [
    "Libreville",
    0.385,
    9.458
  ],
  "Lithuania": [
    "Vilnius",
    54.683,
    25.317
  ],
  "Somaliland": [
    "Hargeysa",
    9.56,
    44.065
  ],
  "Guinea Bissau": [
    "Bissau",
    11.865,
    -15.598
  ],
  "Estonia": [
    "Tallinn",
    59.434,
    24.728
  ],
  "Malta": [
    "Valletta",
    35.9,
    14.515
  ],
  "Lesotho": [
    "Maseru",
    -29.317,
    27.483
  ],
  "Brunei": [
    "Bandar Seri Begawan",
    4.883,
    114.933
  ],
  "Papua New Guinea": [
    "Port Moresby",
    -9.465,
    147.193
  ],
  "Namibia": [
    "Windhoek",
    -22.57,
    17.084
  ],
  "Guyana": [
    "Georgetown",
    6.802,
    -58.167
  ],
  "Suriname": [
    "Paramaribo",
    5.835,
    -55.167
  ],
  "East Timor": [
    "Dili",
    -8.559,
    125.579
  ],
  "The Bahamas": [
    "Nassau",
    25.083,
    -77.35
  ],
  "Cyprus": [
    "Nicosia",
    35.167,
    33.367
  ],
  "Sri Lanka": [
    "Colombo",
    6.932,
    79.858
  ],
  "Botswana": [
    "Gaborone",
    -24.646,
    25.912
  ],
  "Fiji": [
    "Suva",
    -18.133,
    178.442
  ],
  "Iceland": [
    "Reykjavik",
    64.15,
    -21.95
  ],
  "Equatorial Guinea": [
    "Bata",
    1.87,
    9.77
  ],
  "South Sudan": [
    "Malakal",
    9.537,
    31.656
  ],
  "Cape Verde": [
    "Praia",
    14.917,
    -23.517
  ],
  "Maldives": [
    "Male",
    4.167,
    73.5
  ],
  "Bhutan": [
    "Thimphu",
    27.473,
    89.639
  ],
  "Sao Tome and Principe": [
    "Sao Tome",
    0.333,
    6.733
  ],
  "Solomon Islands": [
    "Honiara",
    -9.438,
    159.95
  ],
  "Samoa": [
    "Apia",
    -13.842,
    -171.739
  ],
  "Bermuda": [
    "Hamilton",
    32.294,
    -64.784
  ],
  "Vanuatu": [
    "Port Vila",
    -17.733,
    168.317
  ],
  "Tonga": [
    "Nukualofa",
    -21.139,
    -175.221
  ],
  "Seychelles": [
    "Victoria",
    -4.617,
    55.45
  ],
  "Belize": [
    "Belmopan",
    17.252,
    -88.767
  ],
  "Greenland": [
    "Nuuk",
    64.198,
    -51.733
  ],
  "Falkland Islands": [
    "Stanley",
    -51.7,
    -57.85
  ],
  "Qatar": [
    "Doha",
    25.287,
    51.533
  ],
  "Djibouti": [
    "Djibouti",
    11.595,
    43.148
  ],
  "Rwanda": [
    "Kigali",
    -1.952,
    30.059
  ],
  "Mauritius": [
    "Port Louis",
    -20.167,
    57.5
  ],
  "Bahrain": [
    "Manama",
    26.236,
    50.583
  ],
  "Palestine": [
    "Gaza",
    31.53,
    34.445
  ],
  "North Macedonia": [
    "Skopje",
    42,
    21.433
  ],
  "Kosovo": [
    "Pristina",
    42.667,
    21.166
  ],
  "Slovakia": [
    "Bratislava",
    48.15,
    17.117
  ],
  "Burundi": [
    "Bujumbura",
    -3.376,
    29.36
  ],
  "Slovenia": [
    "Ljubljana",
    46.055,
    14.515
  ],
  "Trinidad and Tobago": [
    "Port-of-Spain",
    10.652,
    -61.517
  ],
  "Barbados": [
    "Bridgetown",
    13.102,
    -59.617
  ],
  "Montenegro": [
    "Podgorica",
    42.466,
    19.266
  ],
  "French Polynesia": [
    "Papeete",
    -17.533,
    -149.567
  ],
  "eSwatini": [
    "Mbabane",
    -26.317,
    31.133
  ],
  "Saint Vincent and the Grenadines": [
    "Kingstown",
    13.148,
    -61.212
  ],
  "The Gambia": [
    "Banjul",
    13.454,
    -16.592
  ],
  "Saint Lucia": [
    "Castries",
    14.002,
    -61
  ],
  "Antigua and Barbuda": [
    "Saint John's",
    17.118,
    -61.85
  ],
  "Grenada": [
    "Saint George's",
    12.053,
    -61.742
  ],
  "Dominica": [
    "Roseau",
    15.301,
    -61.387
  ],
  "Saint Kitts and Nevis": [
    "Basseterre",
    17.302,
    -62.717
  ],
  "American Samoa": [
    "Pago Pago",
    -14.277,
    -170.707
  ],
  "Macau S.A.R": [
    "Macau",
    22.203,
    113.545
  ],
  "Gibraltar": [
    "Gibraltar",
    36.132,
    -5.378
  ],
  "Comoros": [
    "Moroni",
    -11.704,
    43.24
  ],
  "Guam": [
    "Agana",
    13.47,
    144.75
  ],
  "Luxembourg": [
    "Luxembourg",
    49.612,
    6.13
  ],
  "New Caledonia": [
    "Noumea",
    -22.263,
    166.444
  ],
  "Andorra": [
    "Andorra",
    42.5,
    1.516
  ],
  "Monaco": [
    "Monaco",
    43.74,
    7.407
  ],
  "Kiribati": [
    "Tarawa",
    1.338,
    173.018
  ],
  "Marshall Islands": [
    "Majuro",
    7.103,
    171.38
  ],
  "Faroe Islands": [
    "Torshavn",
    62.03,
    -6.82
  ],
  "Palau": [
    "Melekeok",
    7.487,
    134.627
  ],
  "Cook Islands": [
    "Avarua",
    -21.196,
    -159.785
  ],
  "Tuvalu": [
    "Funafuti",
    -8.517,
    179.217
  ],
  "Federated States of Micronesia": [
    "Palikir",
    6.917,
    158.15
  ],
  "Svalbard and Jan Mayen Islands": [
    "Longyearbyen",
    78.217,
    15.55
  ],
  "Western Sahara": [
    "Bir Lehlou",
    26.119,
    -9.653
  ]
};
