// 상태 이름, 색, 위험 순서. 색은 3D 모델과 같다.
export const STATES = {
  flood: { label: "침수 위험", color: "#d23a3a", rank: 5, model: "flood" },
  bottom: { label: "하부 막힘", color: "#e0711c", rank: 4, model: "bottom" },
  cover: { label: "덮임 의심", color: "#d4a514", rank: 3, model: "grate" },
  collect: { label: "수거 필요", color: "#d4a514", rank: 2, model: "grate" },
  hold: { label: "판정 보류", color: "#8a9299", rank: 1, model: "normal" },
  normal: { label: "정상", color: "#2e9a5b", rank: 0, model: "normal" },
};

// 상태 요약에 보여 줄 순서
export const SUMMARY_ORDER = ["normal", "collect", "cover", "bottom", "flood", "hold"];

// 화면에 보일 상태 이름 (침수는 주의/위험 구분)
export function stateText(result) {
  if (result.state === "flood") return result.level === "위험" ? "침수 위험" : "침수 주의";
  return STATES[result.state].label;
}

// 우선 출동 순서: 침수 위험 → 하부 막힘 → 덮임 의심 → 수거 필요 (정상 제외, 판정 보류는 맨 뒤)
export function priorityScore(result) {
  const base = STATES[result.state].rank * 10;
  return result.state === "flood" && result.level === "위험" ? base + 1 : base;
}
