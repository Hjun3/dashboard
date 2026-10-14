import { STATES, SUMMARY_ORDER } from "../logic/states.js";

export default function Summary({ results }) {
  const count = Object.fromEntries(SUMMARY_ORDER.map((k) => [k, 0]));
  Object.values(results).forEach((r) => count[r.state]++);
  return (
    <section className="card">
      <h2>상태 요약</h2>
      <ul className="summary">
        {SUMMARY_ORDER.filter((k) => k !== "hold" || count.hold > 0).map((k) => (
          <li key={k}>
            <span className="dot" style={{ background: STATES[k].color }} />
            <span>{STATES[k].label}</span>
            <strong>{count[k]}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}
