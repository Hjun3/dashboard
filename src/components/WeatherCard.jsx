const WARN = {
  none: "없음",
  advisory: "주의보",
  warning: "경보",
  unknown: "확인 불가",
};

export default function WeatherCard({ mode, weather, scenarioClock }) {
  const scenario = mode === "scenario";
  return (
    <section className="card">
      <div className="card-head">
        <h2>
          날씨 {scenario && <span className="badge">시나리오</span>}
        </h2>
        {weather?.ok && (
          <span className="muted small">{scenario ? `경과 ${scenarioClock}` : `기상청 ${formatObserved(weather.observedAt)}`}</span>
        )}
      </div>
      {weather == null ? (
        <p className="muted">날씨를 불러오는 중입니다…</p>
      ) : !weather.ok ? (
        <>
          <p className="muted">날씨를 불러오지 못했습니다</p>
          {/* 원인 확인용 한 줄 (예: 인증키 미설정, 응답 지연) */}
          {(weather.detail || weather.error) && <p className="muted small">{weather.detail || weather.error}</p>}
        </>
      ) : (
        <>
          <dl className="facts">
            <div><dt>1시간 강수량</dt><dd>{weather.rain1h} mm</dd></div>
            <div><dt>비</dt><dd>{weather.raining ? "오는 중" : "안 옴"}</dd></div>
            <div>
              <dt>호우특보</dt>
              <dd className={weather.warning === "advisory" || weather.warning === "warning" ? "warn" : ""}>{WARN[weather.warning] ?? "확인 불가"}</dd>
            </div>
          </dl>
          {(weather.warning === "advisory" || weather.warning === "warning") && (
            <p className="note">호우특보 발효 중이라 측정 주기 단축 중</p>
          )}
        </>
      )}
    </section>
  );
}

function formatObserved(iso) {
  if (!iso) return "-";
  // "2026-11-06T13:00:00+09:00" → "11월 6일 13:00"
  const [d, t] = iso.split("T");
  const [, m, day] = d.split("-");
  return `${Number(m)}월 ${Number(day)}일 ${t.slice(0, 5)}`;
}
