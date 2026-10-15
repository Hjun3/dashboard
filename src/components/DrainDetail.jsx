import { useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { TH } from "../config.js";
import { STATES, stateText } from "../logic/states.js";

const SERIES = "var(--series)";
const AXIS = { fontSize: 11, fill: "var(--muted)" };

// xDomain: 가로축 범위(분). 시나리오는 처음부터 전체 길이로 고정해, 재생 전에도 빈 축이 보이게 한다
export default function DrainDetail({ drain, history, result, rainAt, formatT, xDomain, xTicks, onOpen3D }) {
  const last = [...history].reverse().find((s) => s.online);
  const data = history.filter((s) => s.t >= xDomain[0]).map((s) => ({
    t: s.t,
    loadPct: s.loadPct,
    level: s.level,
    rssi: s.rssi,
    rain: rainAt(s.t),
  }));

  // 그래프를 터치·드래그(마우스는 올리기)한 시각. 네 그래프가 이 값 하나를 같이 쓴다
  const [hoverT, setHoverT] = useState(null);
  const hovered = hoverT == null ? null : data.find((d) => d.t === hoverT);
  function pick(e) {
    const r = e.currentTarget.getBoundingClientRect();
    const plotLeft = Y_WIDTH + MARGIN.left;
    const frac = (e.clientX - r.left - plotLeft) / (r.width - plotLeft - MARGIN.right);
    const t = xDomain[0] + Math.min(1, Math.max(0, frac)) * (xDomain[1] - xDomain[0]);
    let best = null;
    for (const d of data) if (!best || Math.abs(d.t - t) < Math.abs(best.t - t)) best = d;
    if (best) setHoverT(best.t);
  }
  const pointer = {
    onPointerDown: pick,
    onPointerMove: (e) => (e.pointerType === "mouse" || e.buttons || e.pointerType === "touch") && pick(e),
    onPointerLeave: (e) => e.pointerType === "mouse" && setHoverT(null),
  };
  const common = { margin: MARGIN, accessibilityLayer: false };
  // 강수량 축 위쪽 끝: 10 단위로 올림 (비가 없으면 10)
  const rainTop = Math.max(10, Math.ceil(Math.max(0, ...data.map((d) => d.rain)) / 10) * 10);
  const xAxis = { dataKey: "t", type: "number", domain: xDomain, ticks: xTicks, tickFormatter: formatT, tick: AXIS, allowDataOverflow: true };

  return (
    <section className="card detail">
      <div className="card-head">
        <h2>{drain.name} 상세</h2>
        <span className="pill" style={{ background: STATES[result.state].color }}>{stateText(result)}</span>
      </div>

      <div className="reasons">
        <h3>판정 근거</h3>
        <ul>
          {result.reasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </div>

      <dl className="kv">
        <dt>적재량</dt><dd>{last ? `${Math.round(last.loadPct)}%` : "-"}</dd>
        <dt>수위</dt><dd>{last ? levelText(last.level) : "-"}</dd>
        <dt>신호 세기</dt><dd>{history[history.length - 1].online ? `${Math.round(last.rssi)} dBm` : "통신 끊김"}</dd>
        <dt>배터리</dt><dd>{last ? `${last.battery}%` : "-"}</dd>
      </dl>

      <button className="btn primary wide" onClick={onOpen3D}>3D로 보기</button>

      {/* 어느 그래프를 터치하거나 좌우로 끌어도 네 그래프에 같은 시각의 세로선이 그려지고, 값은 아래 한 줄에 나온다 */}
      <div className="readout" aria-live="polite">
        {hovered ? (
          <>
            <strong>{formatT(hovered.t)}</strong>
            <span>수위 {val(hovered.level, "")}</span>
            <span>강수량 {hovered.rain} mm</span>
            <span>적재량 {val(hovered.loadPct, "%")}</span>
            <span>신호 {val(hovered.rssi, " dBm")}</span>
          </>
        ) : (
          <span className="muted">그래프를 터치하거나 좌우로 끌면 그 시각의 값이 나옵니다</span>
        )}
      </div>
      <Chart title="수위 (구조물 기준선)" pointer={pointer}>
        <ComposedChart data={data} {...common}>
          <Grid />
          <XAxis {...xAxis} />
          <YAxis domain={[0, 3.2]} ticks={[0, 1, 2, 3]} tick={AXIS} width={Y_WIDTH} />
          <ReferenceLine y={TH.pipeTop} stroke="var(--muted)" strokeDasharray="4 3" label={refLabel("배수관 상단")} />
          <ReferenceLine y={TH.floodWarn} stroke="var(--muted)" strokeDasharray="4 3" label={refLabel("바스켓 바닥")} />
          <ReferenceLine y={3} stroke="var(--muted)" strokeDasharray="4 3" label={refLabel("그레이팅 아래")} />
          <Cursor t={hoverT} />
          <Line dataKey="level" stroke={SERIES} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls={false} />
        </ComposedChart>
      </Chart>

      <Chart title="1시간 강수량 (mm)" pointer={pointer}>
        <ComposedChart data={data} {...common}>
          <Grid />
          <XAxis {...xAxis} />
          <YAxis domain={[0, rainTop]} ticks={[0, rainTop / 2, rainTop]} tick={AXIS} width={Y_WIDTH} />
          <Cursor t={hoverT} />
          <Area dataKey="rain" type="stepAfter" stroke="var(--rain)" fill="var(--rain)" fillOpacity={0.7} strokeWidth={1} isAnimationActive={false} />
        </ComposedChart>
      </Chart>

      <Chart title="적재량 (%)" pointer={pointer}>
        <ComposedChart data={data} {...common}>
          <Grid />
          <XAxis {...xAxis} />
          <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tick={AXIS} width={Y_WIDTH} />
          <ReferenceLine y={TH.collectLoad} stroke="var(--muted)" strokeDasharray="4 3" label={refLabel("수거 기준")} />
          <Cursor t={hoverT} />
          <Line dataKey="loadPct" stroke={SERIES} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls={false} />
        </ComposedChart>
      </Chart>

      <Chart title="신호 세기 (dBm)" pointer={pointer}>
        <ComposedChart data={data} {...common}>
          <Grid />
          <XAxis {...xAxis} />
          <YAxis domain={[-120, -60]} ticks={[-120, -90, -60]} tick={AXIS} width={Y_WIDTH} />
          <Cursor t={hoverT} />
          <Line dataKey="rssi" stroke={SERIES} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls={false} />
        </ComposedChart>
      </Chart>
      <p className="muted small">끊긴 구간은 선이 비어 있습니다. 수위 0 = 바닥, 1 = 배수관 상단, 2 = 바스켓 바닥, 3 = 그레이팅 바로 아래</p>
    </section>
  );
}

const MARGIN = { top: 8, right: 8, bottom: 0, left: 0 };
const Y_WIDTH = 34; // 세로축 칸 폭. 터치 위치 → 시각 계산에 쓴다

function Grid() {
  return <CartesianGrid stroke="var(--line)" vertical={false} />;
}

function refLabel(text) {
  return { value: text, position: "insideTopLeft", fontSize: 10, fill: "var(--muted)" };
}

function Chart({ title, pointer, children }) {
  return (
    <figure className="chart">
      <figcaption>{title}</figcaption>
      <div className="chart-box" {...pointer}>
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </figure>
  );
}

function Cursor({ t }) {
  return t == null ? null : <ReferenceLine x={t} stroke="var(--ink)" strokeWidth={1.5} ifOverflow="hidden" />;
}

function val(v, unit) {
  return v == null ? "통신 끊김" : `${v}${unit}`;
}

function levelText(lv) {
  if (lv >= 3) return `${lv.toFixed(1)} · 그레이팅 바로 아래`;
  if (lv >= 2) return `${lv.toFixed(1)} · 바스켓 바닥 위`;
  if (lv > 1) return `${lv.toFixed(1)} · 배수관 위`;
  return `${lv.toFixed(1)} · 배수관 아래`;
}
