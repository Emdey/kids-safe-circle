const STATUS = {
  seed: { label: 'Held for review', color: 'var(--color-seed)', ink: 'var(--color-ink)' },
  sprout: { label: 'Awaiting your OK', color: 'var(--color-sprout)', ink: 'var(--color-hedge-dark)' },
  bloom: { label: 'Live in the circle', color: 'var(--color-bloom)', ink: 'var(--color-hedge-dark)' },
  wilted: { label: 'Not shown', color: 'var(--color-clay)', ink: '#fff' }
};

export default function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.seed;
  return (
    <span
      style={{
        display: 'inline-block',
        background: s.color,
        color: s.ink,
        borderRadius: 999,
        padding: '4px 12px',
        fontSize: 13,
        fontWeight: 700
      }}
    >
      {s.label}
    </span>
  );
}
