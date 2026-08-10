// The one signature motif in this app: a low scalloped fence line.
// It marks a boundary the same way the product itself does - the edge
// between "inside the circle" and everything outside it - so it's used
// only where a real boundary exists (between the gate/review area and
// the garden feed), not as generic decoration.
export default function FenceDivider({ label }) {
  return (
    <div style={{ margin: '32px 0', textAlign: 'center' }}>
      <svg width="100%" height="20" viewBox="0 0 400 20" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M0,10 Q10,0 20,10 T40,10 T60,10 T80,10 T100,10 T120,10 T140,10 T160,10 T180,10 T200,10 T220,10 T240,10 T260,10 T280,10 T300,10 T320,10 T340,10 T360,10 T380,10 T400,10"
          fill="none"
          stroke="var(--color-hedge)"
          strokeWidth="2"
          strokeOpacity="0.35"
        />
      </svg>
      {label && (
        <span
          style={{
            display: 'inline-block',
            marginTop: -10,
            background: 'var(--color-bg)',
            padding: '0 12px',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--color-ink-soft)'
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
