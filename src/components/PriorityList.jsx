import { STATES, priorityScore, stateText } from "../logic/states.js";

export default function PriorityList({ drains, results, onSelect }) {
  const items = drains
    .filter((d) => results[d.id].state !== "normal")
    .sort((a, b) => priorityScore(results[b.id]) - priorityScore(results[a.id]));
  return (
    <section className="card">
      <h2>우선 출동 목록</h2>
      {items.length === 0 ? (
        <p className="muted">출동이 필요한 빗물받이가 없습니다.</p>
      ) : (
        <ol className="plist">
          {items.map((d) => {
            const r = results[d.id];
            return (
              <li key={d.id}>
                <button onClick={() => onSelect(d.id)}>
                  <span className="pill" style={{ background: STATES[r.state].color }}>{stateText(r)}</span>
                  <span className="pname">{d.name}</span>
                  <span className="preason">{r.reasons[0]}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
