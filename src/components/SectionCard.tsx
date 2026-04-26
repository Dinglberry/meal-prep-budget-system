import React from "react";

interface SectionCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function SectionCard({ title, subtitle, children }: SectionCardProps) {
  return (
    <section style={styles.sectionCard}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={styles.sectionTitle}>{title}</h2>
        {subtitle ? <p style={styles.sectionSubtitle}>{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sectionCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 24,
    padding: 22,
    boxShadow: "0 4px 14px rgba(15, 23, 42, 0.04)",
  },
  sectionTitle: { margin: 0, fontSize: 24 },
  sectionSubtitle: { margin: "8px 0 0 0", color: "#64748b", lineHeight: 1.5 },
};
