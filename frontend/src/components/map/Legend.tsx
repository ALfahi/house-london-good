const stops = [
  { color: "#d9f0ed", label: "< 1.5%" },
  { color: "#91d1c8", label: "1.5–2.0%" },
  { color: "#48a99e", label: "2.0–2.5%" },
  { color: "#167a73", label: "2.5–3.0%" },
  { color: "#084c47", label: "> 3.0%" },
];

export function Legend() {
  return (
    <div className="map-legend" aria-label="Vacancy rate legend">
      <span className="legend-title">Vacancy rate</span>
      {stops.map((stop) => (
        <span className="legend-row" key={stop.label}>
          <i style={{ background: stop.color }} />
          {stop.label}
        </span>
      ))}
    </div>
  );
}

