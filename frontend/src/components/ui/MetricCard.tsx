interface MetricCardProps {
  label: string;
  value: string;
  note: string;
  accent?: "blue" | "teal" | "amber";
}

export function MetricCard({ label, value, note, accent = "blue" }: MetricCardProps) {
  return (
    <div className={`metric-card metric-${accent}`}>
      <span className="metric-label">{label}</span>
      <strong>{value}</strong>
      <span className="metric-note">{note}</span>
    </div>
  );
}

