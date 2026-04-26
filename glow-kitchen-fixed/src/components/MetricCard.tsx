import React from "react";

interface MetricCardProps {
  label: string;
  value: string | number;
}

export function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div style={styles.metricCard}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={styles.metricValue}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  metricCard: {
    minWidth: 0,
    maxWidth: "100%",
    overflow: "hidden",
    border: "1px solid #e2e8f0",
    background: "#fff",
    borderRadius: 20,
    padding: "14px 12px",
  },
  metricLabel: {
    fontSize: 12,
    color: "#64748b",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  metricValue: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 1.1,
    wordBreak: "break-word",
    overflowWrap: "anywhere",
  },
};
