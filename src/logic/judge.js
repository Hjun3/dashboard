import { TH } from "../config.js";
import { STATES } from "./states.js";

// 빗물받이 1개의 상태를 판정하는 순수 함수.
//
// history: 최근 측정값 목록 (시간 순) { t, loadPct, leftRightDiffPct, level, rssi, battery, online }
//          t 는 분 단위 시각. online=false 인 기록은 다른 값이 null 일 수 있다.
// weather: { raining, rain1h, tempC, rainStartAt, rainEndAt }
//          rainStartAt: 이번 비가 시작된 시각(분), 비가 온 적 없으면 null
//          rainEndAt:   비가 그친 시각(분), 아직 오는 중이면 null
// now:     현재 시각(분)
//
// 반환: { state, level: "주의"|"위험"|null, reasons: [문장] }
export function judge(history, weather = {}, now) {
  if (!history || history.length === 0) {
    return result("hold", null, ["측정값이 아직 없습니다."]);
  }
  const last = history[history.length - 1];
  const online = history.filter((s) => s.online);
  const lastOn = online[online.length - 1];
  if (!lastOn) return result("hold", null, ["통신이 끊겨 판정을 보류합니다."]);

  const notes = [];

  // ── 통신 끊김 구분 ──
  if (!last.online) {
    const cause = offlineCause(history);
    const offMin = now - lastOn.t;
    if (cause === "flood") {
      return result("flood", "위험", [
        `수위가 급상승한 뒤(마지막 수위 ${fmt(lastOn.level)}) 통신이 끊겼습니다. 침수가 진행 중인 것으로 보고 침수 위험을 유지합니다.`,
      ]);
    }
    if (cause === "battery") {
      return result("hold", null, [
        `배터리가 ${lastOn.battery}%로 떨어진 뒤 통신이 끊겼습니다. 장비 이상으로 점검이 필요합니다.`,
      ]);
    }
    if (cause === "vehicle" && offMin <= TH.vehicleMaxMin) {
      notes.push(
        "통신이 잠시 끊겼습니다. 직전에 신호가 한순간에 크게 떨어져 일시 가림(차량 추정)으로 보고, 막힘으로 판정하지 않고 지켜봅니다."
      );
    } else {
      return result("hold", null, [`통신이 ${Math.round(offMin)}분째 끊겨 판정을 보류합니다.`]);
    }
  } else if (recentVehicle(history, now)) {
    notes.push("최근 신호가 한순간에 떨어졌다 회복되었습니다. 일시 가림(차량 추정)으로 보고 막힘으로 판정하지 않습니다.");
  }

  const freezing = weather.tempC != null && weather.tempC <= TH.freezeTempC;
  if (freezing) notes.push(`기온이 ${weather.tempC}도로 결빙 가능성이 있어 적재량 판정을 보류합니다.`);

  // ── 청소 감지 · 안착 불량 ──
  const clean = findCleaning(online, now);
  if (clean) {
    notes.push("적재량이 0 근처로 떨어졌다 다시 올라 청소로 보고 자동 영점 조정했습니다.");
    const after = online.filter((s) => s.t >= clean.t);
    const worst = Math.max(...after.map((s) => s.leftRightDiffPct ?? 0));
    if (worst > TH.seatDiff) {
      notes.push(`청소 후 좌우 무게 차이가 ${worst}%로 커서 거름망 안착 불량이 의심됩니다.`);
    }
  }

  // ── 상태별 조건 (해당하는 것을 모두 모은 뒤 가장 위험한 것을 고름) ──
  const found = [];

  // 침수 주의 / 위험
  if (lastOn.level >= TH.floodWarn) {
    const lv = lastOn.level >= TH.floodDanger ? "위험" : "주의";
    const r = [
      lv === "위험"
        ? `수위가 ${fmt(lastOn.level)}로 그레이팅 바로 아래(3)에 가깝습니다. 넘치기 직전입니다.`
        : `수위가 ${fmt(lastOn.level)}로 바스켓 바닥 기준선(2)을 넘었습니다.`,
    ];
    const drop = loadDrop(online, now);
    if (weather.raining && drop >= TH.floodLoadDrop) {
      r.push(`비가 오는 중 적재량이 30분 사이 ${Math.round(drop)}%p 급감했습니다 (물에 뜨는 힘으로 추정).`);
    }
    found.push(result("flood", lv, r));
  }

  // 하부 막힘: 비가 그친 뒤에도 배수관 위 수위가 일정 시간 유지
  if (weather.rainEndAt != null && now - weather.rainEndAt >= TH.bottomHoldMin) {
    const after = online.filter((s) => s.t >= weather.rainEndAt);
    if (after.length > 0 && after.every((s) => s.level > TH.pipeTop)) {
      found.push(
        result("bottom", null, [
          `비가 그친 지 ${Math.round(now - weather.rainEndAt)}분이 지났는데도 수위가 배수관 위(${fmt(lastOn.level)})에 머물러 있습니다.`,
        ])
      );
    }
  }

  // 덮임 의심: 비가 일정 시간 이상 오는데 수위와 적재량이 거의 그대로
  const cover = checkCover(online, weather, now, freezing);
  if (cover) found.push(cover);

  // 수거 필요
  if (!freezing && lastOn.loadPct >= TH.collectLoad) {
    found.push(
      result("collect", null, [`적재량이 ${Math.round(lastOn.loadPct)}%로 수거 기준(${TH.collectLoad}%)을 넘었습니다.`])
    );
  }

  if (found.length === 0) {
    const r = [];
    if (lastOn.level <= TH.pipeTop) {
      r.push(
        freezing
          ? `수위가 배수관 아래(${fmt(lastOn.level)})입니다.`
          : `적재량 ${Math.round(lastOn.loadPct)}%, 수위가 배수관 아래(${fmt(lastOn.level)})로 정상 범위입니다.`
      );
    } else {
      r.push(`비가 오는 동안 수위(${fmt(lastOn.level)})가 올랐지만 막힘 조건에는 해당하지 않습니다.`);
    }
    if (weather.raining) r.push("비가 오면 수위가 올랐다가 다시 빠지고 있습니다.");
    return result("normal", null, [...r, ...notes]);
  }

  found.sort((a, b) => STATES[b.state].rank - STATES[a.state].rank);
  const top = found[0];
  return result(top.state, top.level, [...top.reasons, ...notes]);
}

function result(state, level, reasons) {
  return { state, level, reasons };
}

function fmt(v) {
  return Number(v).toFixed(1);
}

// 통신이 끊긴 이유를 직전 기록으로 추정: "flood" | "vehicle" | "battery" | "unknown"
function offlineCause(history) {
  let i = history.length - 1;
  while (i >= 0 && !history[i].online) i--;
  const lastOn = history[i];
  const prev = history[i - 1];
  const before = history.filter((s) => s.online && s.t <= lastOn.t - 30);
  const ref = before[before.length - 1];

  if (lastOn.level >= TH.floodWarn) return "flood";
  if (ref && lastOn.level - ref.level >= TH.levelSurge) return "flood";
  if (prev && prev.online && prev.rssi - lastOn.rssi >= TH.rssiSuddenDrop) return "vehicle";
  if (lastOn.battery <= TH.batteryLow) return "battery";
  return "unknown";
}

// 최근 일정 시간 안에 신호 급락(차량 등 일시 가림) 기록이 있는지
function recentVehicle(history, now) {
  for (let i = 1; i < history.length; i++) {
    const a = history[i - 1];
    const b = history[i];
    if (b.t < now - TH.vehicleNoteMin) continue;
    if (a.online && b.online && a.rssi - b.rssi >= TH.rssiSuddenDrop) return true;
  }
  return false;
}

// 최근 30분 동안 적재량이 얼마나 줄었는지 (%p)
function loadDrop(online, now) {
  const recent = online.filter((s) => s.t >= now - 30);
  if (recent.length < 2) return 0;
  const max = Math.max(...recent.map((s) => s.loadPct));
  return max - recent[recent.length - 1].loadPct;
}

// 청소 감지: 적재량이 한 번에 크게 떨어져 0 근처가 된 마지막 시점
function findCleaning(online, now) {
  for (let i = online.length - 1; i >= 1; i--) {
    const a = online[i - 1];
    const b = online[i];
    if (b.t < now - TH.cleanNoteMin) break;
    if (b.loadPct < TH.cleanZero && a.loadPct - b.loadPct >= TH.cleanDrop) return b;
  }
  return null;
}

function checkCover(online, weather, now, freezing) {
  if (weather.rainStartAt == null) return null;
  const end = weather.rainEndAt ?? now;
  if (end - weather.rainStartAt < TH.coverRainMin) return null;
  if (weather.rainEndAt != null && now - weather.rainEndAt > TH.coverKeepMin) return null;

  const win = online.filter((s) => s.t >= weather.rainStartAt && s.t <= end);
  if (win.length < 3) return null;
  const range = (key) => Math.max(...win.map((s) => s[key])) - Math.min(...win.map((s) => s[key]));
  if (range("level") >= TH.coverLevelRange) return null;
  if (!freezing && range("loadPct") >= TH.coverLoadRange) return null;

  const reasons = [
    `비가 ${Math.round(end - weather.rainStartAt)}분 넘게 왔는데 수위와 적재량이 거의 변하지 않았습니다. 물이 위에서 막혀 들어오지 못하는 것으로 보입니다.`,
  ];

  // 신호가 서서히 약해지면 덮임 가능성 높음 (한 번에 떨어진 경우는 제외)
  const since = online.filter((s) => s.t >= weather.rainStartAt);
  const base = since[0].rssi;
  const cur = since[since.length - 1].rssi;
  let maxStep = 0;
  for (let i = 1; i < since.length; i++) maxStep = Math.max(maxStep, since[i - 1].rssi - since[i].rssi);
  if (base - cur >= TH.rssiGradualDrop && maxStep < TH.rssiSuddenDrop) {
    reasons.push(`통신 신호가 서서히 ${Math.round(base - cur)}dB 약해져 그레이팅 위 덮임 가능성 높음.`);
  }
  return result("cover", null, reasons);
}
