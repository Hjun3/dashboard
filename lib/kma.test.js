import { describe, expect, it } from "vitest";
import { baseDateTime, parseNcst, parseWarning, toIso } from "./kma.js";

// 한국 시각으로 Date 만들기
const kst = (s) => Date.parse(`${s}+09:00`);

describe("baseDateTime", () => {
  it("40분 이후면 그 시각 정시", () => {
    expect(baseDateTime(kst("2026-11-06T13:45:00"))).toEqual({ date: "20261106", time: "1300" });
  });
  it("40분 전이면 한 시간 전 정시", () => {
    expect(baseDateTime(kst("2026-11-06T13:10:00"))).toEqual({ date: "20261106", time: "1200" });
  });
  it("자정 넘어가면 날짜도 전날로", () => {
    expect(baseDateTime(kst("2026-11-06T00:20:00"))).toEqual({ date: "20261105", time: "2300" });
    expect(baseDateTime(kst("2026-01-01T00:05:00"))).toEqual({ date: "20251231", time: "2300" });
  });
});

describe("toIso", () => {
  it("관측 시각 형식", () => {
    expect(toIso("20261106", "1300")).toBe("2026-11-06T13:00:00+09:00");
  });
});

const ok = (items) => ({ response: { header: { resultCode: "00" }, body: { items: { item: items } } } });

describe("parseNcst", () => {
  it("RN1, PTY, T1H 를 읽는다", () => {
    const r = parseNcst(ok([
      { category: "RN1", obsrValue: "4.5" },
      { category: "PTY", obsrValue: "1" },
      { category: "T1H", obsrValue: "14.2" },
    ]));
    expect(r).toEqual({ rain1h: 4.5, raining: true, tempC: 14.2 });
  });
  it("비가 없으면 raining=false", () => {
    const r = parseNcst(ok([{ category: "RN1", obsrValue: "0" }, { category: "PTY", obsrValue: "0" }]));
    expect(r.raining).toBe(false);
    expect(r.rain1h).toBe(0);
  });
  it("오류 코드면 예외", () => {
    expect(() => parseNcst({ response: { header: { resultCode: "30" } } })).toThrow();
  });
});

describe("parseWarning", () => {
  const t6 = (text) => ok([{ t6: text }]);
  const area = { province: "충청북도", city: "청주" };
  it("괄호 안에 청주가 있으면 호우주의보", () => {
    expect(parseWarning(t6("o 호우주의보 : 충청북도(청주, 증평), 서울\no 강풍주의보 : 강원도"), area)).toBe("advisory");
  });
  it("도 전체 특보", () => {
    expect(parseWarning(t6("o 호우경보 : 충청북도, 충청남도"), area)).toBe("warning");
  });
  it("호우경보가 주의보보다 우선", () => {
    expect(parseWarning(t6("o 호우주의보 : 충청북도(청주)\no 호우경보 : 충청북도(청주, 진천)"), area)).toBe("warning");
  });
  it("같은 도의 다른 시군이면 무시", () => {
    expect(parseWarning(t6("o 호우주의보 : 충청북도(충주, 제천)"), area)).toBe("none");
  });
  it("다른 특보에 청주가 있어도 무시", () => {
    expect(parseWarning(t6("o 폭염주의보 : 충청북도(청주)"), area)).toBe("none");
  });
  it("특보 없음", () => {
    expect(parseWarning(t6("o 없 음"), area)).toBe("none");
  });
});
