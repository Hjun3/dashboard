const pad = (n) => String(n).padStart(2, "0");

// children: 시나리오 모드일 때 상단에 함께 고정되는 재생 막대
export default function TopBar({ mode, onMode, clock, children }) {
  const time = `${pad(clock.getHours())}:${pad(clock.getMinutes())}:${pad(clock.getSeconds())}`;
  return (
    <header className="topbar">
      <div className="topbar-row">
        <div className="brand">
          <h1>빗물받이 막힘 감지</h1>
          <span className="muted small">시범 지역 · {time}</span>
        </div>
        <div className="seg" role="group" aria-label="모드">
          <button aria-pressed={mode === "live"} onClick={() => onMode("live")}>실시간</button>
          <button aria-pressed={mode === "scenario"} onClick={() => onMode("scenario")}>시나리오</button>
        </div>
      </div>
      {children}
    </header>
  );
}
