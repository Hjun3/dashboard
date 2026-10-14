// 기상청 API 응답을 다루는 순수 함수들 (서버 함수 api/weather.js 에서 사용)

const HOUR = 3600 * 1000;
const pad = (n) => String(n).padStart(2, "0");

// 초단기실황 base_date, base_time 계산.
// 매시 정시 자료가 40분쯤 올라오므로, 40분 전이면 한 시간 전 정시를 쓴다 (자정이면 날짜도 전날로).
export function baseDateTime(nowMs = Date.now()) {
  let kst = new Date(nowMs + 9 * HOUR); // UTC 게터로 읽으면 한국 시각
  if (kst.getUTCMinutes() < 40) kst = new Date(kst.getTime() - HOUR);
  const date = `${kst.getUTCFullYear()}${pad(kst.getUTCMonth() + 1)}${pad(kst.getUTCDate())}`;
  const time = `${pad(kst.getUTCHours())}00`;
  return { date, time };
}

// "20261106", "1300" → "2026-11-06T13:00:00+09:00"
export function toIso(date, time) {
  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${time.slice(0, 2)}:${time.slice(2, 4)}:00+09:00`;
}

// 초단기실황 응답(JSON) → { rain1h, raining, tempC }
export function parseNcst(json) {
  const header = json?.response?.header;
  if (header?.resultCode !== "00") {
    throw new Error(`초단기실황 오류: ${header?.resultCode} ${header?.resultMsg ?? ""}`);
  }
  const items = json.response.body?.items?.item ?? [];
  const get = (cat) => items.find((i) => i.category === cat)?.obsrValue;
  const rain1h = parseFloat(get("RN1"));
  const pty = parseInt(get("PTY"), 10);
  const tempC = parseFloat(get("T1H"));
  return {
    rain1h: Number.isFinite(rain1h) ? rain1h : 0,
    raining: Number.isFinite(pty) ? pty !== 0 : false,
    tempC: Number.isFinite(tempC) ? tempC : null,
  };
}

// 기상특보 현황 응답(JSON) → "none" | "advisory" | "warning"
// 주의: 응답 형식은 공공데이터포털 문서로 확인이 필요하다.
//   발효 중인 특보 문구(t6)가 "o 호우주의보 : 서울, 경기도(...)" 처럼 줄마다 적혀 있다고 보고,
//   호우 특보 줄에 시범 지역 이름(area)이 들어 있는지만 본다.
export function parseWarning(json, area) {
  const header = json?.response?.header;
  if (header?.resultCode !== "00") {
    // 특보가 하나도 없으면 NO_DATA(03)로 오는 경우가 있다
    if (header?.resultCode === "03") return "none";
    throw new Error(`기상특보 오류: ${header?.resultCode} ${header?.resultMsg ?? ""}`);
  }
  const raw = json.response.body?.items?.item;
  const item = Array.isArray(raw) ? raw[0] : raw;
  const text = item?.t6;
  if (typeof text !== "string") throw new Error("기상특보 응답에 t6 이 없습니다");

  let level = "none";
  for (const line of text.split(/\r?\n|(?=o\s)/)) {
    if (!line.includes(area)) continue;
    if (line.includes("호우경보")) return "warning";
    if (line.includes("호우주의보")) level = "advisory";
  }
  return level;
}
