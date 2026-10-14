// 시나리오를 처음부터 끝까지 돌리며 A~F 상태가 바뀌는 순간을 콘솔에 출력한다.
// 실행: npm run scenario
import { DRAINS, SCENARIO } from "../src/config.js";
import { judge } from "../src/logic/judge.js";
import { stateText } from "../src/logic/states.js";
import { scenarioHistory, scenarioWeather } from "../src/sim/scenario.js";

const prev = {};
for (let sec = 0; sec <= SCENARIO.lengthSec; sec++) {
  const w = scenarioWeather(sec);
  for (const d of DRAINS) {
    const r = judge(scenarioHistory(d.id, sec), w, sec * SCENARIO.minPerSec);
    const text = stateText(r) + (r.reasons.some((x) => x.includes("가능성 높음")) ? " (가능성 높음)" : "")
      + (r.reasons.some((x) => x.includes("일시 가림")) ? " (일시 가림)" : "");
    if (prev[d.id] !== text) {
      console.log(`${String(sec).padStart(2)}초  ${d.id}  ${prev[d.id] ?? "-"} → ${text}`);
      prev[d.id] = text;
    }
  }
}
