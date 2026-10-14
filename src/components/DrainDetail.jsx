import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TH } from "../config.js";
import { STATES, stateText } from "../logic/states.js";

const SERIES = "var(--series)";
const AXIS = { fontSize: 11, fill: "var(--muted)" };

export default function DrainDetail({ drain, history, result, rainAt, formatT, onOpen3D }) {
  const last = [...history].reverse().find((s) => s.online);
  const data = history.slice(-120).map((s) => ({
    t: s.t,
    label: formatT(s.t),
    loadPct: s.loadPct,
    level: s.level,
    rssi: s.rssi,
    rain: rainAt(s.t),
  }));

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

      <Chart title="수위 (구조물 기준선)" data={data}>
        <LineChart data={data} syncId="drain" margin={MARGIN}>
          <Grid />
          <XAxis dataKey="label" tick={AXIS} minTickGap={40} />
          <YAxis domain={[0, 3.2]} ticks={[0, 1, 2, 3]} tick={AXIS} width={28} />
          <ReferenceLine y={TH.pipeTop} stroke="var(--muted)" strokeDasharray="4 3" label={refLabel("배수관 상단")} />
          <ReferenceLine y={TH.floodWarn} stroke="var(--muted)" strokeDasharray="4 3" label={refLabel("바스켓 바닥")} />
          <ReferenceLine y={3} stroke="var(--muted)" strokeDasharray="4 3" label={refLabel("그레이팅 아래")} />
          <Tooltip content={<Tip unit="" name="수위" />} />
          <Line dataKey="level" stroke={SERIES} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls={false} />
        </LineChart>
      </Chart>

      <Chart title="1시간 강수량 (mm)" data={data}>
        <BarChart data={data} syncId="drain" margin={MARGIN}>
          <Grid />
          <XAxis dataKey="label" tick={AXIS} minTickGap={40} />
          <YAxis tick={AXIS} width={28} />
          <Tooltip content={<Tip unit=" mm" name="강수량" />} cursor={{ fill: "var(--line)" }} />
          <Bar dataKey="rain" fill="var(--rain)" radius={[2, 2, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </Chart>

      <Chart title="적재량 (%)" data={data}>
        <LineChart data={data} syncId="drain" margin={MARGIN}>
          <Grid />
          <XAxis dataKey="label" tick={AXIS} minTickGap={40} />
          <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tick={AXIS} width={28} />
          <ReferenceLine y={TH.collectLoad} stroke="var(--muted)" strokeDasharray="4 3" label={refLabel("수거 기준")} />
          <Tooltip content={<Tip unit="%" name="적재량" />} />
          <Line dataKey="loadPct" stroke={SERIES} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls={false} />
        </LineChart>
      </Chart>

      <Chart title="신호 세기 (dBm)" data={data}>
        <LineChart data={data} syncId="drain" margin={MARGIN}>
          <Grid />
          <XAxis dataKey="label" tick={AXIS} minTickGap={40} />
          <YAxis domain={[-120, -60]} ticks={[-120, -90, -60]} tick={AXIS} width={34} />
          <Tooltip content={<Tip unit=" dBm" name="신호 세기" />} />
          <Line dataKey="rssi" stroke={SERIES} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls={false} />
        </LineChart>
      </Chart>
      <p className="muted small">끊긴 구간은 선이 비어 있습니다. 수위 0 = 바닥, 1 = 배수관 상단, 2 = 바스켓 바닥, 3 = 그레이팅 바로 아래</p>
    </section>
  );
}

const MARGIN = { top: 8, right: 8, bottom: 0, left: 0 };

function Grid() {
  return <CartesianGrid stroke="var(--line)" vertical={false} />;
}

function refLabel(text) {
  return { value: text, position: "insideTopLeft", fontSize: 10, fill: "var(--muted)" };
}

function Chart({ title, children }) {
  return (
    <figure className="chart">
      <figcaption>{title}</figcaption>
      <div className="chart-box">
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </figure>
  );
}

function Tip({ active, payload, label, unit, name }) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="tip">
      <div className="muted">{label}</div>
      <div>{name}: <strong>{v == null ? "통신 끊김" : `${v}${unit}`}</strong></div>
    </div>
  );
}

function levelText(lv) {
  if (lv >= 3) return `${lv.toFixed(1)} · 그레이팅 바로 아래`;
  if (lv >= 2) return `${lv.toFixed(1)} · 바스켓 바닥 위`;
  if (lv > 1) return `${lv.toFixed(1)} · 배수관 위`;
  return `${lv.toFixed(1)} · 배수관 아래`;
}
