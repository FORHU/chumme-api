/**
 * Real city coordinates, `[longitude, latitude]`, keyed by ISO-3166 alpha-2.
 *
 * The globe places a community with no explicit position by spiralling around
 * its country's centroid. For compact countries that is fine; for archipelagos
 * it is not. The Philippines centroid is [122.9, 11.8] — open water in the
 * Visayan Sea — and 34 communities spiral out to a ~320km radius from it, so
 * most land in the Sulu and Philippine Seas. Indonesia is worse.
 *
 * Anchoring on cities fixes that by construction: cities are on land, and the
 * result reads like a real user map (clusters on Manila, Cebu, Davao) instead
 * of a ring floating offshore.
 *
 * Ordered roughly by population, because the seeder assigns cities by index —
 * so a country's first and busiest communities land in its largest cities.
 */
export const CITY_COORDINATES: Record<string, [number, number][]> = {
  PH: [
    [120.98, 14.60], // Manila
    [121.03, 14.55], // Makati
    [123.89, 10.32], // Cebu City
    [125.61, 7.07],  // Davao
    [120.59, 15.15], // Angeles
    [123.75, 13.14], // Naga
    [122.56, 10.72], // Iloilo
    [125.50, 8.95],  // Butuan
  ],
  US: [
    [-74.01, 40.71],  // New York
    [-118.24, 34.05], // Los Angeles
    [-87.63, 41.88],  // Chicago
    [-95.37, 29.76],  // Houston
    [-122.42, 37.77], // San Francisco
    [-84.39, 33.75],  // Atlanta
    [-80.19, 25.76],  // Miami
    [-122.33, 47.61], // Seattle
  ],
  IN: [
    [72.88, 19.08],  // Mumbai
    [77.21, 28.61],  // Delhi
    [77.59, 12.97],  // Bengaluru
    [80.27, 13.08],  // Chennai
    [88.36, 22.57],  // Kolkata
    [78.49, 17.39],  // Hyderabad
    [73.86, 18.52],  // Pune
    [72.57, 23.02],  // Ahmedabad
  ],
  ID: [
    [106.85, -6.21], // Jakarta
    [112.75, -7.25], // Surabaya
    [107.62, -6.92], // Bandung
    [98.68, 3.60],   // Medan
    [115.19, -8.65], // Denpasar
    [119.42, -5.15], // Makassar
    [110.42, -6.99], // Semarang
  ],
  BR: [
    [-46.63, -23.55], // São Paulo
    [-43.17, -22.91], // Rio de Janeiro
    [-47.93, -15.78], // Brasília
    [-38.50, -12.97], // Salvador
    [-43.94, -19.92], // Belo Horizonte
    [-51.23, -30.03], // Porto Alegre
  ],
  JP: [
    [139.69, 35.69], // Tokyo
    [135.50, 34.69], // Osaka
    [136.91, 35.18], // Nagoya
    [130.40, 33.59], // Fukuoka
    [141.35, 43.06], // Sapporo
    [135.77, 35.01], // Kyoto
  ],
  KR: [
    [126.98, 37.57], // Seoul
    [129.08, 35.18], // Busan
    [126.71, 37.46], // Incheon
    [128.60, 35.87], // Daegu
    [127.38, 36.35], // Daejeon
  ],
  GB: [
    [-0.13, 51.51],  // London
    [-2.24, 53.48],  // Manchester
    [-1.90, 52.48],  // Birmingham
    [-4.25, 55.86],  // Glasgow
    [-2.59, 51.45],  // Bristol
    [-1.55, 53.80],  // Leeds
  ],
  DE: [
    [13.40, 52.52],  // Berlin
    [9.99, 53.55],   // Hamburg
    [11.58, 48.14],  // Munich
    [6.96, 50.94],   // Cologne
    [8.68, 50.11],   // Frankfurt
  ],
  NG: [
    [3.38, 6.52],    // Lagos
    [7.49, 9.06],    // Abuja
    [8.52, 11.996],  // Kano
    [4.53, 8.50],    // Ilorin
    [7.03, 4.82],    // Port Harcourt
  ],
  MX: [
    [-99.13, 19.43],  // Mexico City
    [-103.35, 20.66], // Guadalajara
    [-100.31, 25.69], // Monterrey
    [-98.20, 19.04],  // Puebla
    [-86.85, 21.16],  // Cancún
  ],
  VN: [
    [106.70, 10.78], // Ho Chi Minh City
    [105.83, 21.03], // Hanoi
    [108.22, 16.05], // Da Nang
    [105.78, 10.03], // Can Tho
  ],
  TH: [
    [100.50, 13.76], // Bangkok
    [98.98, 18.79],  // Chiang Mai
    [100.88, 12.93], // Pattaya
    [98.39, 7.88],   // Phuket
  ],
  ES: [
    [-3.70, 40.42],  // Madrid
    [2.17, 41.39],   // Barcelona
    [-0.38, 39.47],  // Valencia
    [-5.98, 37.39],  // Seville
    [-2.93, 43.26],  // Bilbao
  ],
  FR: [
    [2.35, 48.86],   // Paris
    [5.37, 43.30],   // Marseille
    [4.84, 45.76],   // Lyon
    [1.44, 43.60],   // Toulouse
    [-1.55, 47.22],  // Nantes
  ],
  IT: [
    [12.50, 41.90],  // Rome
    [9.19, 45.46],   // Milan
    [14.27, 40.85],  // Naples
    [7.69, 45.07],   // Turin
    [11.25, 43.77],  // Florence
  ],
  CA: [
    [-79.38, 43.65],  // Toronto
    [-123.12, 49.28], // Vancouver
    [-73.57, 45.50],  // Montreal
    [-114.07, 51.05], // Calgary
    [-75.70, 45.42],  // Ottawa
  ],
  AU: [
    [151.21, -33.87], // Sydney
    [144.96, -37.81], // Melbourne
    [153.03, -27.47], // Brisbane
    [115.86, -31.95], // Perth
    [138.60, -34.93], // Adelaide
  ],
  TR: [
    [28.98, 41.01],  // Istanbul
    [32.86, 39.93],  // Ankara
    [27.14, 38.42],  // Izmir
    [29.06, 40.18],  // Bursa
  ],
  PK: [
    [67.01, 24.86],  // Karachi
    [74.34, 31.55],  // Lahore
    [73.05, 33.68],  // Islamabad
    [71.58, 34.02],  // Peshawar
  ],
  CN: [
    [116.41, 39.90], // Beijing
    [121.47, 31.23], // Shanghai
    [113.26, 23.13], // Guangzhou
    [114.06, 22.54], // Shenzhen
    [104.07, 30.57], // Chengdu
  ],
  EG: [
    [31.24, 30.04],  // Cairo
    [29.92, 31.20],  // Alexandria
    [32.64, 25.69],  // Luxor
    [31.21, 30.01],  // Giza
  ],
  RU: [
    [37.62, 55.75],  // Moscow
    [30.34, 59.93],  // St Petersburg
    [82.93, 55.03],  // Novosibirsk
    [60.60, 56.84],  // Yekaterinburg
  ],
  BD: [
    [90.41, 23.81],  // Dhaka
    [91.78, 22.36],  // Chattogram
    [89.54, 22.85],  // Khulna
  ],
  PL: [
    [21.01, 52.23],  // Warsaw
    [19.94, 50.06],  // Kraków
    [17.04, 51.11],  // Wrocław
  ],
  NL: [
    [4.90, 52.37],   // Amsterdam
    [4.48, 51.92],   // Rotterdam
    [5.11, 52.09],   // Utrecht
  ],
  MY: [
    [101.69, 3.14],  // Kuala Lumpur
    [100.33, 5.41],  // George Town
    [110.34, 1.55],  // Kuching
    [103.76, 1.55],  // Johor Bahru
  ],
  SG: [[103.82, 1.35], [103.85, 1.31], [103.79, 1.44]],
  ZA: [
    [28.05, -26.20], // Johannesburg
    [18.42, -33.92], // Cape Town
    [31.02, -29.86], // Durban
  ],
  KE: [
    [36.82, -1.29],  // Nairobi
    [39.67, -4.04],  // Mombasa
    [34.76, -0.09],  // Kisumu
  ],
  AR: [
    [-58.38, -34.60], // Buenos Aires
    [-64.19, -31.42], // Córdoba
    [-60.70, -32.95], // Rosario
  ],
  CO: [
    [-74.07, 4.71],  // Bogotá
    [-75.56, 6.24],  // Medellín
    [-76.53, 3.44],  // Cali
  ],
  CL: [
    [-70.65, -33.46], // Santiago
    [-71.62, -33.05], // Valparaíso
    [-73.05, -36.83], // Concepción
  ],
  PE: [
    [-77.04, -12.05], // Lima
    [-71.54, -16.41], // Arequipa
    [-71.97, -13.53], // Cusco
  ],
  SA: [
    [46.72, 24.71],  // Riyadh
    [39.20, 21.49],  // Jeddah
    [50.10, 26.43],  // Dammam
  ],
  TW: [
    [121.56, 25.03], // Taipei
    [120.30, 22.63], // Kaohsiung
    [120.68, 24.15], // Taichung
  ],
  HK: [[114.17, 22.32], [114.19, 22.28], [114.13, 22.37]],
  SE: [[18.07, 59.33], [11.97, 57.71], [13.00, 55.60]],
  NO: [[10.75, 59.91], [5.32, 60.39], [10.40, 63.43]],
  DK: [[12.57, 55.68], [10.20, 56.16], [10.39, 55.40]],
  FI: [[24.94, 60.17], [23.76, 61.50], [22.27, 60.45]],
  IE: [[-6.26, 53.35], [-8.48, 51.90], [-8.62, 53.27]],
  PT: [[-9.14, 38.72], [-8.61, 41.15], [-8.41, 40.21]],
  GR: [[23.73, 37.98], [22.94, 40.64], [25.14, 35.34]],
  CZ: [[14.44, 50.08], [16.61, 49.20], [17.25, 49.82]],
  RO: [[26.10, 44.43], [23.60, 46.77], [21.23, 45.75]],
  UA: [[30.52, 50.45], [36.23, 49.99], [30.73, 46.48]],
  BE: [[4.35, 50.85], [4.40, 51.22], [3.72, 51.05]],
  AT: [[16.37, 48.21], [15.44, 47.07], [13.06, 47.81]],
  CH: [[8.54, 47.38], [6.14, 46.20], [7.45, 46.95]],
  NZ: [[174.76, -36.85], [174.78, -41.29], [172.64, -43.53]],
  IL: [[34.78, 32.08], [35.21, 31.77], [34.99, 32.79]],
  MA: [[-7.59, 33.57], [-6.85, 34.02], [-8.00, 31.63]],
  GH: [[-0.19, 5.60], [-1.62, 6.70], [-0.84, 5.11]],
  NP: [[85.32, 27.71], [83.99, 28.21]],
  KH: [[104.92, 11.56], [103.86, 13.36]],
  LA: [[102.63, 17.97], [102.14, 19.89]],
};

/**
 * Position for the `index`-th community in a country, or null when the country
 * has no city data (the caller should then leave position empty and let the
 * client fall back to its centroid spiral).
 *
 * Cities are cycled through by index, and each community gets a small
 * deterministic jitter so that repeated visits to the same city don't stack
 * every circle on one pixel. The jitter is kept under ~0.06° (a few km) — large
 * enough to separate markers at city zoom, small enough that a circle can't
 * drift off the coastline it was placed on.
 */
export function cityPositionFor(
  countryCode: string,
  index: number,
  rand: () => number,
): { x: number; y: number } | null {
  const cities = CITY_COORDINATES[countryCode];
  if (!cities || cities.length === 0) return null;

  const [lng, lat] = cities[index % cities.length];
  const jitter = () => (rand() - 0.5) * 0.12;

  return {
    x: Number((lng + jitter()).toFixed(4)),
    y: Number((lat + jitter()).toFixed(4)),
  };
}
