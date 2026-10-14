import { LIVE } from "../config.js";

// 실시간 모드의 가상 센서.
// 평상시: 수위는 배수관 아래에서 작게 흔들리고, 적재량은 빗물받이마다 다른 값에서 아주 천천히 증가.
// 실제 비가 오면(기상청 raining): 수위가 강수량에 비례해 올랐다가 비가 그치면 다시 빠짐.

const START_LOAD = { A: 34, B: 22, C: 41, D: 58, E: 18, F: 27 };
const LOAD_PER_MIN = 0.002; // 하루 약 3%p
const BASE_LEVEL = 0.3;

const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
const jitter = (amp) => (Math.random() * 2 - 1) * amp;

// 빗물받이마다 수위 상태를 들고 있는 시뮬레이터를 만든다
export function createLiveSim(ids) {
  const level = Object.fromEntries(ids.map((id) => [id, BASE_LEVEL]));
  const t0 = Date.now() / 60000;

  function sample(id, t, rain1h, raining) {
    // 비가 오면 목표 수위가 강수량에 비례해 오르고(배수관 아래 0.9까지), 아니면 기본값으로 돌아감
    const target = raining ? Math.min(0.9, BASE_LEVEL + rain1h * 0.03) : BASE_LEVEL;
    level[id] += (target - level[id]) * 0.2;
    return {
      t,
      loadPct: round(START_LOAD[id] + (t - t0 + LIVE.backfillMin) * LOAD_PER_MIN, 1),
      leftRightDiffPct: round(4 + jitter(1.5), 1),
      level: round(level[id] + jitter(0.02)),
      rssi: round(-80 + jitter(1.5), 1),
      battery: 90,
      online: true,
    };
  }

  return {
    // 처음 화면을 열었을 때 그래프가 비지 않도록 과거 기록을 채운다 (날씨는 평상시로 가정)
    backfill(now) {
      const out = Object.fromEntries(ids.map((id) => [id, []]));
      for (let t = now - LIVE.backfillMin; t <= now; t += LIVE.sampleEveryMin) {
        for (const id of ids) out[id].push(sample(id, t, 0, false));
      }
      return out;
    },
    step(now, weather) {
      const rain1h = weather?.ok ? weather.rain1h : 0;
      const raining = weather?.ok ? weather.raining : false;
      return Object.fromEntries(ids.map((id) => [id, sample(id, now, rain1h, raining)]));
    },
  };
}
