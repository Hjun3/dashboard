import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DRAINS, LIVE, SCENARIO } from "./config.js";
import { judge } from "./logic/judge.js";
import { STATES, stateText } from "./logic/states.js";
import { scenarioHistory, scenarioWeather } from "./sim/scenario.js";
import { createLiveSim } from "./sim/simulator.js";
import TopBar from "./components/TopBar.jsx";
import WeatherCard from "./components/WeatherCard.jsx";
import ScenarioControls from "./components/ScenarioControls.jsx";
import MapView from "./components/MapView.jsx";
import Summary from "./components/Summary.jsx";
import PriorityList from "./components/PriorityList.jsx";
import DrainDetail from "./components/DrainDetail.jsx";
import Toasts from "./components/Toasts.jsx";

const IDS = DRAINS.map((d) => d.id);
const KEEP_KEY = "drain-dashboard-view"; // 3D 화면에서 돌아왔을 때 보던 화면을 이어서 보여 주기 위함
const nowMin = () => Date.now() / 60000;
const pad = (n) => String(n).padStart(2, "0");

function loadKept() {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEEP_KEY));
    sessionStorage.removeItem(KEEP_KEY);
    return v || {};
  } catch {
    return {};
  }
}

export default function App() {
  const kept = useRef(loadKept()).current;
  const [mode, setMode] = useState(kept.mode ?? "live");
  const [sec, setSec] = useState(kept.sec ?? 0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selectedId, setSelectedId] = useState(kept.selectedId ?? "A");
  const [clock, setClock] = useState(() => new Date());

  // ── 실시간 모드: 기상청 날씨 + 가상 센서 ──
  const [liveWeather, setLiveWeather] = useState(null); // null = 불러오는 중
  const [rainTrack, setRainTrack] = useState({ rainStartAt: null, rainEndAt: null });
  const sim = useRef(null);
  const [live, setLive] = useState(() => {
    sim.current = createLiveSim(IDS);
    const t = nowMin();
    return { now: t, history: sim.current.backfill(t), rain: [] };
  });

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch("/api/weather");
        const body = await res.json();
        if (alive) setLiveWeather(body.ok ? body : { ok: false });
      } catch {
        if (alive) setLiveWeather({ ok: false });
      }
    }
    load();
    const id = setInterval(load, LIVE.weatherRefreshMin * 60000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // 실제 비가 시작/그친 시각 기록 (판정에 필요)
  useEffect(() => {
    if (!liveWeather?.ok) return;
    const t = nowMin();
    setRainTrack((r) => {
      if (liveWeather.raining && (r.rainStartAt == null || r.rainEndAt != null)) return { rainStartAt: t, rainEndAt: null };
      if (!liveWeather.raining && r.rainStartAt != null && r.rainEndAt == null) return { ...r, rainEndAt: t };
      return r;
    });
  }, [liveWeather]);

  const liveWeatherRef = useRef(liveWeather);
  liveWeatherRef.current = liveWeather;
  useEffect(() => {
    const id = setInterval(() => {
      const t = nowMin();
      const w = liveWeatherRef.current;
      const s = sim.current.step(t, w);
      setLive((prev) => {
        const keep = LIVE.backfillMin + 60;
        const history = Object.fromEntries(IDS.map((i) => [i, [...prev.history[i], s[i]].slice(-keep)]));
        const rain = [...prev.rain, { t, rain1h: w?.ok ? w.rain1h : 0 }].slice(-keep);
        return { now: t, history, rain };
      });
    }, LIVE.sampleEveryMin * 60000);
    return () => clearInterval(id);
  }, []);

  // 현재 시각 표시
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── 시나리오 재생 ──
  useEffect(() => {
    if (mode !== "scenario" || !playing) return;
    const id = setInterval(() => {
      setSec((s) => {
        if (s >= SCENARIO.lengthSec) return s;
        return s + 1;
      });
    }, 1000 / speed);
    return () => clearInterval(id);
  }, [mode, playing, speed]);
  useEffect(() => {
    if (sec >= SCENARIO.lengthSec) setPlaying(false);
  }, [sec]);

  // ── 지금 모드의 날씨, 측정 기록, 판정 ──
  const view = useMemo(() => {
    if (mode === "scenario") {
      const w = scenarioWeather(sec);
      const history = Object.fromEntries(IDS.map((i) => [i, scenarioHistory(i, sec)]));
      const now = sec * SCENARIO.minPerSec;
      const rainAt = (t) => scenarioWeather(t / SCENARIO.minPerSec).rain1h;
      return { weather: { ok: true, ...w }, history, now, rainAt, formatT: formatElapsed };
    }
    const w = liveWeather?.ok ? { ...liveWeather, ...rainTrack } : { raining: false, rain1h: 0, tempC: null, ...rainTrack };
    const rainMap = new Map(live.rain.map((r) => [r.t, r.rain1h]));
    return { weather: w, history: live.history, now: live.now, rainAt: (t) => rainMap.get(t) ?? 0, formatT: formatClock };
  }, [mode, sec, live, liveWeather, rainTrack]);

  const results = useMemo(
    () => Object.fromEntries(IDS.map((i) => [i, judge(view.history[i], view.weather, view.now)])),
    [view]
  );

  // ── 상태가 바뀌면 알림 미리보기 ──
  const [toasts, setToasts] = useState([]);
  const prevText = useRef(null);
  const pushToast = useCallback((item) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t.slice(-2), { ...item, id }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  useEffect(() => {
    const texts = Object.fromEntries(IDS.map((i) => [i, stateText(results[i])]));
    const prev = prevText.current;
    prevText.current = { mode, texts };
    if (!prev || prev.mode !== mode) return; // 모드를 바꾼 직후에는 알리지 않음
    for (const d of DRAINS) {
      const before = prev.texts[d.id];
      const after = texts[d.id];
      if (before === after) continue;
      const worse = STATES[results[d.id].state].rank > 0;
      if (mode === "live" && !worse) continue; // 실시간 모드는 나빠질 때만
      pushToast({ drainId: d.id, title: `${d.name}: ${before} → ${after}`, text: results[d.id].reasons[0], color: STATES[results[d.id].state].color });
    }
  }, [results, mode, pushToast]);

  const selected = DRAINS.find((d) => d.id === selectedId);
  const detailRef = useRef(null);
  function select(id) {
    setSelectedId(id);
    // 폰에서는 상세가 아래에 있으므로 스크롤해서 보여 준다
    if (window.matchMedia("(max-width: 899px)").matches) {
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }
  function open3D() {
    try {
      sessionStorage.setItem(KEEP_KEY, JSON.stringify({ mode, sec, selectedId }));
    } catch {
      /* 저장이 안 돼도 3D 화면은 열린다 */
    }
    window.location.href = `/model.html?state=${STATES[results[selectedId].state].model}`;
  }
  function changeMode(m) {
    setMode(m);
    setPlaying(false);
  }

  return (
    <div className="app">
      <TopBar mode={mode} onMode={changeMode} clock={clock} />
      <Toasts items={toasts} onSelect={select} />
      <main className="layout">
        <div className="col-left">
          {mode === "scenario" && (
            <ScenarioControls
              sec={sec}
              playing={playing}
              speed={speed}
              onPlay={() => {
                if (sec >= SCENARIO.lengthSec) setSec(0);
                setPlaying((p) => !p);
              }}
              onRestart={() => { setSec(0); setPlaying(true); }}
              onSpeed={() => setSpeed((s) => (s === 1 ? 2 : 1))}
            />
          )}
          <WeatherCard mode={mode} weather={mode === "scenario" ? view.weather : liveWeather} scenarioClock={formatElapsed(view.now)} />
          <MapView drains={DRAINS} results={results} selectedId={selectedId} onSelect={select} />
          <Summary results={results} />
          <PriorityList drains={DRAINS} results={results} onSelect={select} />
        </div>
        <div className="col-right" ref={detailRef}>
          <DrainDetail
            drain={selected}
            history={view.history[selectedId]}
            result={results[selectedId]}
            rainAt={view.rainAt}
            formatT={view.formatT}
            onOpen3D={open3D}
          />
        </div>
      </main>
    </div>
  );
}

// 시나리오: 시작 후 경과 시간 (예: 2:05)
function formatElapsed(min) {
  return `${Math.floor(min / 60)}:${pad(Math.round(min % 60))}`;
}

// 실시간: 시:분
function formatClock(min) {
  const d = new Date(min * 60000);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
