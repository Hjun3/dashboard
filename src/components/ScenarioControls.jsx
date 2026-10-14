import { SCENARIO } from "../config.js";

export default function ScenarioControls({ sec, playing, speed, onPlay, onRestart, onSpeed }) {
  const pct = (sec / SCENARIO.lengthSec) * 100;
  return (
    <section className="card controls">
      <div className="row">
        <button className="btn primary" onClick={onPlay}>{playing ? "일시정지" : "재생"}</button>
        <button className="btn" onClick={onRestart}>처음부터</button>
        <button className="btn" aria-pressed={speed === 2} onClick={onSpeed}>2배속</button>
        <span className="muted small grow-right">{sec}초 / {SCENARIO.lengthSec}초</span>
      </div>
      <div className="progress" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
      <p className="muted small">호우 하루를 약 60초로 압축했습니다 (화면 1초 = 실제 5분). 판정은 가상 센서 값을 판정 로직에 넣어 나온 결과입니다.</p>
    </section>
  );
}
