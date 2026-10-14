import { describe, expect, it } from "vitest";
import { SCENARIO } from "../config.js";
import { judge } from "./judge.js";
import { scenarioHistory, scenarioWeather } from "../sim/scenario.js";

// 시나리오 sec 초 시점에 빗물받이 id 를 판정
function at(id, sec) {
  return judge(scenarioHistory(id, sec), scenarioWeather(sec), sec * SCENARIO.minPerSec);
}
const has = (r, word) => r.reasons.some((s) => s.includes(word));

describe("시나리오 A: 덮임 의심", () => {
  it("비가 오기 전과 초반에는 정상", () => {
    expect(at("A", 20).state).toBe("normal");
  });
  it("약 25초에 덮임 의심", () => {
    expect(at("A", 25).state).toBe("cover");
  });
  it("35초 이후 '가능성 높음'이 붙는다", () => {
    expect(has(at("A", 30), "가능성 높음")).toBe(false);
    expect(has(at("A", 35), "가능성 높음")).toBe(true);
  });
});

describe("시나리오 B: 하부 막힘", () => {
  it("비가 오는 동안은 하부 막힘이 아님", () => {
    expect(at("B", 40).state).toBe("normal");
  });
  it("비가 그친 뒤 약 52초에 하부 막힘", () => {
    expect(at("B", 50).state).toBe("normal");
    expect(at("B", 52).state).toBe("bottom");
  });
});

describe("시나리오 C: 침수", () => {
  it("30초 침수 주의", () => {
    const r = at("C", 30);
    expect(r.state).toBe("flood");
    expect(r.level).toBe("주의");
  });
  it("38초 침수 위험, 적재량 급감이 보조 근거", () => {
    const r = at("C", 38);
    expect(r.level).toBe("위험");
    expect(has(r, "물에 뜨는 힘")).toBe(true);
  });
  it("42초 통신이 끊긴 뒤에도 침수 위험 유지", () => {
    for (const sec of [42, 50, 60]) {
      const r = at("C", sec);
      expect(r.state).toBe("flood");
      expect(r.level).toBe("위험");
    }
  });
});

describe("시나리오 D: 수거 필요", () => {
  it("약 22초에 수거 필요", () => {
    expect(at("D", 20).state).toBe("normal");
    expect(at("D", 22).state).toBe("collect");
  });
});

describe("시나리오 E: 차량 가림", () => {
  it("한 번도 막힘으로 판정되지 않는다", () => {
    for (let sec = 0; sec <= SCENARIO.lengthSec; sec++) {
      expect(at("E", sec).state).toBe("normal");
    }
  });
  it("근거에 '일시 가림(차량 추정)'", () => {
    expect(has(at("E", 15), "일시 가림(차량 추정)")).toBe(true);
    expect(has(at("E", 18), "일시 가림(차량 추정)")).toBe(true);
  });
});

describe("시나리오 F: 비교 기준", () => {
  it("끝까지 정상", () => {
    for (let sec = 0; sec <= SCENARIO.lengthSec; sec++) {
      expect(at("F", sec).state).toBe("normal");
    }
  });
});

// ── 보조 규칙 ──
const sample = (t, o = {}) => ({
  t, loadPct: 30, leftRightDiffPct: 3, level: 0.3, rssi: -80, battery: 90, online: true, ...o,
});
const dry = { raining: false, rain1h: 0, tempC: 15, rainStartAt: null, rainEndAt: null };

describe("보조 규칙", () => {
  it("결빙(0도 이하)이면 적재량 판정 보류", () => {
    const h = [sample(0, { loadPct: 80 }), sample(1, { loadPct: 80 })];
    expect(judge(h, dry, 1).state).toBe("collect");
    const r = judge(h, { ...dry, tempC: -2 }, 1);
    expect(r.state).toBe("normal");
    expect(has(r, "결빙")).toBe(true);
  });

  it("청소 감지 → 자동 영점 조정, 좌우 차이가 크면 안착 불량", () => {
    const h = [sample(0, { loadPct: 60 }), sample(1, { loadPct: 1 }), sample(2, { loadPct: 2, leftRightDiffPct: 35 })];
    const r = judge(h, dry, 2);
    expect(has(r, "자동 영점 조정")).toBe(true);
    expect(has(r, "안착 불량")).toBe(true);
  });

  it("배터리 저하 뒤 끊김 → 장비 이상(판정 보류)", () => {
    const h = [sample(0, { battery: 10 }), sample(1, { battery: 9 }), { t: 2, online: false }];
    const r = judge(h, dry, 2);
    expect(r.state).toBe("hold");
    expect(has(r, "장비 이상")).toBe(true);
  });

  it("측정값이 없으면 판정 보류", () => {
    expect(judge([], dry, 0).state).toBe("hold");
  });
});
