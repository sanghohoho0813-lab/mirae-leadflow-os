/**
 * Approximate locations for the capital area (서울·경기·인천), keyed by
 * 시/군/구. Pins sit at the district center, not the exact address — good
 * enough to see "where are this week's meetings" without a geocoding API.
 */

type LatLng = [number, number];

const SEOUL: Record<string, LatLng> = {
  종로구: [37.573, 126.979], 중구: [37.5641, 126.9979], 용산구: [37.5326, 126.9905], 성동구: [37.5634, 127.0369],
  광진구: [37.5385, 127.0823], 동대문구: [37.5744, 127.0396], 중랑구: [37.6063, 127.0927], 성북구: [37.5894, 127.0167],
  강북구: [37.6396, 127.0257], 도봉구: [37.6688, 127.0471], 노원구: [37.6542, 127.0568], 은평구: [37.6027, 126.9291],
  서대문구: [37.5791, 126.9368], 마포구: [37.5663, 126.9019], 양천구: [37.517, 126.8665], 강서구: [37.5509, 126.8495],
  구로구: [37.4954, 126.8874], 금천구: [37.4569, 126.8955], 영등포구: [37.5264, 126.8962], 동작구: [37.5124, 126.9393],
  관악구: [37.4784, 126.9516], 서초구: [37.4837, 127.0324], 강남구: [37.5172, 127.0473], 송파구: [37.5145, 127.1059],
  강동구: [37.5301, 127.1238],
};

const GYEONGGI: Record<string, LatLng> = {
  수원시: [37.2636, 127.0286], 성남시: [37.42, 127.1267], 고양시: [37.6584, 126.832], 용인시: [37.2411, 127.1776],
  부천시: [37.5034, 126.766], 안산시: [37.3219, 126.8309], 안양시: [37.3943, 126.9568], 남양주시: [37.636, 127.2165],
  화성시: [37.1995, 126.8312], 평택시: [36.9921, 127.1129], 의정부시: [37.7381, 127.0337], 시흥시: [37.38, 126.803],
  파주시: [37.76, 126.78], 김포시: [37.6153, 126.7156], 광명시: [37.4786, 126.8646], 광주시: [37.4295, 127.255],
  군포시: [37.3616, 126.9352], 하남시: [37.5393, 127.2149], 오산시: [37.1499, 127.0775], 이천시: [37.272, 127.435],
  안성시: [37.008, 127.2797], 의왕시: [37.3448, 126.9683], 양주시: [37.7853, 127.0458], 구리시: [37.5943, 127.1296],
  포천시: [37.8949, 127.2003], 동두천시: [37.9036, 127.0606], 과천시: [37.4292, 126.9876], 여주시: [37.2983, 127.637],
  양평군: [37.4917, 127.4875], 가평군: [37.8315, 127.5105], 연천군: [38.0966, 127.0748],
};

const INCHEON: Record<string, LatLng> = {
  중구: [37.4738, 126.6216], 동구: [37.4739, 126.6432], 미추홀구: [37.4638, 126.6503], 연수구: [37.4101, 126.6783],
  남동구: [37.4471, 126.7314], 부평구: [37.507, 126.7219], 계양구: [37.5372, 126.7376], 서구: [37.5456, 126.676],
  강화군: [37.7466, 126.488], 옹진군: [37.4466, 126.6368],
};

const PROVINCES: Record<string, { center: LatLng; districts: Record<string, LatLng> }> = {
  서울: { center: [37.5665, 126.978], districts: SEOUL },
  경기: { center: [37.4138, 127.2], districts: GYEONGGI },
  인천: { center: [37.4563, 126.7052], districts: INCHEON },
};

const PROVINCE_ALIASES: Record<string, string> = {
  서울: "서울", 서울시: "서울", 서울특별시: "서울",
  경기: "경기", 경기도: "경기",
  인천: "인천", 인천시: "인천", 인천광역시: "인천",
  부산: "부산", 부산시: "부산", 부산광역시: "부산",
  대구: "대구", 대구시: "대구", 대구광역시: "대구",
  광주: "광주", 광주광역시: "광주",
  대전: "대전", 대전광역시: "대전",
  울산: "울산", 울산광역시: "울산",
  세종: "세종", 세종시: "세종", 세종특별자치시: "세종",
  강원: "강원", 강원도: "강원", 강원특별자치도: "강원",
  충북: "충북", 충청북도: "충북", 충남: "충남", 충청남도: "충남",
  전북: "전북", 전라북도: "전북", 전북특별자치도: "전북", 전남: "전남", 전라남도: "전남",
  경북: "경북", 경상북도: "경북", 경남: "경남", 경상남도: "경남",
  제주: "제주", 제주도: "제주", 제주특별자치도: "제주",
};

function tokens(text: string): string[] {
  return text.replace(/[(),]/g, " ").split(/\s+/).filter(Boolean);
}

/**
 * "서울특별시 강남구 테헤란로 123" → "서울 강남구"
 * "경기도 성남시 분당구 판교로 256" → "경기 성남시"
 * Returns null when the address doesn't start with a recognizable place.
 */
export function regionFromAddress(address: string): string | null {
  const t = tokens(address);
  if (t.length === 0) return null;
  const province = PROVINCE_ALIASES[t[0]];
  if (province) {
    const district = t.find((x, i) => i > 0 && /(시|군|구)$/.test(x));
    return district ? `${province} ${district}` : province;
  }
  // No province given: infer it from a known district name.
  const district = t.find((x) => /(시|군|구)$/.test(x));
  if (!district) return null;
  if (GYEONGGI[district]) return `경기 ${district}`;
  if (SEOUL[district]) return `서울 ${district}`;
  if (INCHEON[district]) return `인천 ${district}`;
  return null;
}

export interface Located { lat: number; lng: number; precise: "district" | "province" }

/** Approximate coordinates for a region string, or null if outside 서울·경기·인천. */
export function locateRegion(region: string): Located | null {
  const t = tokens(region);
  let province = t.length ? PROVINCE_ALIASES[t[0]] : undefined;
  const district = t.find((x) => /(시|군|구)$/.test(x) && !PROVINCE_ALIASES[x]);
  if (!province && district) {
    province = GYEONGGI[district] ? "경기" : SEOUL[district] ? "서울" : INCHEON[district] ? "인천" : undefined;
  }
  const p = province ? PROVINCES[province] : undefined;
  if (!p) return null;
  const hit = district ? p.districts[district] : undefined;
  const [lat, lng] = hit ?? p.center;
  return { lat, lng, precise: hit ? "district" : "province" };
}

/**
 * Places several meetings in the same district on a small ring (~2km) around
 * the district center so every pin stays tappable. Order is stable by id.
 */
export function spreadPins<T extends { id: string; lat: number; lng: number }>(items: T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const it of items) {
    const key = `${it.lat.toFixed(4)},${it.lng.toFixed(4)}`;
    const g = groups.get(key);
    if (g) g.push(it); else groups.set(key, [it]);
  }
  const out: T[] = [];
  for (const g of groups.values()) {
    if (g.length === 1) { out.push(g[0]); continue; }
    const sorted = [...g].sort((a, b) => a.id.localeCompare(b.id));
    const r = 0.012 + Math.min(sorted.length, 8) * 0.002;
    sorted.forEach((it, i) => {
      const angle = (i / sorted.length) * Math.PI * 2 - Math.PI / 2;
      // Longitude degrees are shorter at this latitude; widen them to keep a circle.
      out.push({ ...it, lat: it.lat + Math.sin(angle) * r, lng: it.lng + (Math.cos(angle) * r) / Math.cos((it.lat * Math.PI) / 180) });
    });
  }
  return out;
}

export function kakaoMapUrl(address: string): string {
  return `https://map.kakao.com/link/search/${encodeURIComponent(address)}`;
}

export function naverMapUrl(address: string): string {
  return `https://map.naver.com/p/search/${encodeURIComponent(address)}`;
}
