import { SCENARIO } from "../config.js";
import { STATES, stateText } from "../logic/states.js";

// 좁은 폰 화면에 들어가도록 두 글자로
const SHORT = { normal: "정상", collect: "수거", cover: "덮임", bottom: "하부", flood: "침수", hold: "보류" };

// 화면 위에 고정되는 시나리오 재생 막대: 재생 버튼, 진행 막대, 빗물받이 6개 상태
export default function ScenarioControls({ sec, playing, speed, drains, results, selectedId, onSelect, onPlay, onRestart, onSpeed }) {
  const pct = (sec / SCENARIO.lengthSec) * 100;
  return (
    <div className="scenario-bar">
      <div className="row">
        <button className="btn primary" onClick={onPlay}>{playing ? "일시정지" : "재생"}</button>
        <button className="btn" onClick={onRestart}>처음부터</button>
        <button className="btn" aria-pressed={speed === 2} onClick={onSpeed}>2배속</button>
        <span className="sec grow-right">{sec}초<span className="muted"> / {SCENARIO.lengthSec}</span></span>
      </div>
      <div className="progress" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
      <ul className="chips" aria-label="빗물받이 상태">
        {drains.map((d, i) => {
          const r = results[d.id];
          return (
            <li key={d.id}>
              <button
                className="chip"
                aria-pressed={d.id === selectedId}
                title={`${d.name} · ${stateText(r)}`}
                style={{ background: STATES[r.state].color }}
                onClick={() => onSelect(d.id)}
              >
                <b>{i + 1}번</b>
                <span>{SHORT[r.state]}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
