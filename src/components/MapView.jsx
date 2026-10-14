import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { REGION } from "../config.js";
import { STATES, stateText } from "../logic/states.js";

// 시범 지역 지도에 빗물받이 6개를 상태 색 핀으로 표시
export default function MapView({ drains, results, selectedId, onSelect }) {
  const box = useRef(null);
  const map = useRef(null);
  const pins = useRef({});
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const m = L.map(box.current, { scrollWheelZoom: false, attributionControl: true })
      .setView([REGION.center.lat, REGION.center.lng], REGION.zoom);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(m);
    drains.forEach((d) => {
      const pin = L.circleMarker([d.lat, d.lng], { radius: 11, weight: 3, fillOpacity: 0.95 })
        .addTo(m)
        .on("click", () => onSelectRef.current(d.id));
      pin.bindTooltip(d.name, { permanent: true, direction: "top", offset: [0, -10], className: "pin-label" });
      pins.current[d.id] = pin;
    });
    map.current = m;
    return () => m.remove();
  }, [drains]);

  useEffect(() => {
    drains.forEach((d) => {
      const r = results[d.id];
      pins.current[d.id]?.setStyle({
        fillColor: STATES[r.state].color,
        color: d.id === selectedId ? "#1d2328" : "#ffffff",
      });
      pins.current[d.id]?.setTooltipContent(`${d.name} · ${stateText(r)}`);
    });
  }, [drains, results, selectedId]);

  return (
    <section className="card map-card">
      <h2>지도</h2>
      <div ref={box} className="map" role="application" aria-label="빗물받이 위치 지도" />
    </section>
  );
}
