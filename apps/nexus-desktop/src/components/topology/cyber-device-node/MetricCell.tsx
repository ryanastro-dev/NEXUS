interface MetricCellProps {
  label: string;
  value: string;
  color: string;
  labelColor: string;
}

export function MetricCell({ label, value, color, labelColor }: MetricCellProps) {
  return (
    <div>
      <div style={{ fontSize: 10, color: labelColor, marginBottom: 4 }}>{label}</div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color,
          fontFamily: 'monospace',
        }}
      >
        {value}
      </div>
    </div>
  );
}
