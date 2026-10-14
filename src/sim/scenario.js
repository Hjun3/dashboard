import { SCENARIO } from "../config.js";

// 호우 하루를 약 60초로 압축한 시나리오 (화면 1초 = 실제 5분).
// 여기서는 "가상 센서 값"과 "날씨"만 만든다. 상태 판정은 judge()가 한다.

const M = SCENARIO.minPerSec;
const RAIN_START = 5; // 초
const WARN_ON = 10;
const RAIN_END = 45;
const WARN_OFF = 55;

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

// 재현 가능한 작은 흔들림 (-1 ~ 1)
function wobble(seed, sec) {
  const x = Math.sin(seed * 12.9898 + sec * 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

// 날씨 흐름: 0~5초 맑음 → 5초 비 시작 → 10초 호우주의보 → 45초 비 그침 → 55초 특보 해제
export function scenarioWeather(sec) {
  let rain1h = 0;
  if (sec >= RAIN_START && sec < RAIN_END) {
    if (sec < WARN_ON) rain1h = 3 + (sec - RAIN_START) * 6; // 3 → 27mm
    else if (sec < 40) rain1h = 38 + 8 * Math.sin((sec - WARN_ON) / 4); // 30~46mm
    else rain1h = 30 - (sec - 40) * 5; // 30 → 10mm
  }
  return {
    rain1h: round(rain1h, 1),
    raining: rain1h > 0,
    tempC: 21.5,
    warning: sec >= WARN_ON && sec < WARN_OFF ? "advisory" : "none",
    rainStartAt: sec >= RAIN_START ? RAIN_START * M : null,
    rainEndAt: sec >= RAIN_END ? RAIN_END * M : null,
  };
}

// 정상 빗물받이의 수위: 비가 오면 오르고(최대 약 0.85), 그치면 다시 빠짐
function normalLevel(sec) {
  const up = clamp01((sec - RAIN_START) / 10);
  const down = clamp01((sec - RAIN_END) / 5);
  return 0.3 + 0.55 * up * (1 - down);
}

const BASE = { A: 45, B: 30, C: 40, D: 62, E: 25, F: 20 };

// 빗물받이 id 의 sec 초 시점 측정값 1건
export function scenarioSample(id, sec) {
  const seed = id.charCodeAt(0);
  const n = wobble(seed, sec);
  let level = normalLevel(sec) + n * 0.02;
  let loadPct = BASE[id] + sec * 0.02;
  let rssi = -80 + n * 1.5;
  let online = true;

  switch (id) {
    case "A": // 덮임: 비가 와도 수위·적재량 그대로, 15초부터 신호가 서서히 약해짐
      level = 0.3 + n * 0.02;
      loadPct = BASE.A;
      rssi = -80 - Math.max(0, sec - 15) * 0.75;
      break;
    case "B": // 하부 막힘: 15~25초 배수관 위로 상승, 비가 그쳐도 유지
      if (sec >= 15) level = Math.min(normalLevel(sec), 0.85) + 0.75 * clamp01((sec - 15) / 10) + n * 0.02;
      if (sec >= RAIN_END) level = 1.6 + n * 0.02;
      break;
    case "C": // 침수: 20~40초 급상승, 적재량 급감(물에 뜨는 힘), 42초 통신 끊김
      if (sec >= 20) level = Math.min(3, 1 + 0.1 * (sec - 20));
      if (sec >= 28) loadPct = BASE.C - 30 * clamp01((sec - 28) / 10);
      if (sec >= 42) online = false;
      break;
    case "D": // 수거 필요: 10~30초 적재량 62% → 78%
      loadPct = 62 + 16 * Math.pow(clamp01((sec - 10) / 20), 1.3);
      break;
    case "E": // 차량 가림: 15초 신호 급락, 16~22초 끊김, 23초 회복
      if (sec === 15) rssi = -115;
      if (sec >= 16 && sec <= 22) online = false;
      break;
    default: // F: 비교 기준 (끝까지 정상)
      break;
  }

  if (!online) {
    return { t: sec * M, loadPct: null, leftRightDiffPct: null, level: null, rssi: null, battery: null, online };
  }
  return {
    t: sec * M,
    loadPct: round(loadPct, 1),
    leftRightDiffPct: round(4 + n * 2, 1),
    level: round(level),
    rssi: round(rssi, 1),
    battery: 92,
    online,
  };
}

// 0초부터 sec 초까지의 측정값 목록
export function scenarioHistory(id, sec) {
  const out = [];
  for (let s = 0; s <= sec; s++) out.push(scenarioSample(id, s));
  return out;
}
