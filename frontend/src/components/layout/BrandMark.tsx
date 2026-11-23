/** Roseta de guilhoché, a marca do mini-KYC. Decorativa. */
export function BrandMark({ className }: { className?: string }) {
  const angles = [0, 30, 60, 90, 120, 150];
  return (
    <svg viewBox="-30 -30 60 60" aria-hidden className={className}>
      <g fill="none" stroke="currentColor" strokeWidth={1.4}>
        {angles.map((angle) => (
          <ellipse key={angle} rx={26} ry={9} transform={`rotate(${angle})`} />
        ))}
      </g>
    </svg>
  );
}
