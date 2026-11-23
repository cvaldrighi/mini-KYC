import { useId } from 'react';
import { cn } from '@/lib/utils';

const ROSETTE_ANGLES = Array.from({ length: 12 }, (_, index) => index * 15);

/**
 * Padrão de segurança das cédulas e documentos: linhas onduladas finas ao fundo e uma roseta
 * de elipses giradas. Decorativo (escondido de leitores de tela). Usa `currentColor`, então a
 * cor vem da classe de texto do pai e acompanha o tema.
 */
export function GuillochePattern({ className }: { className?: string }) {
  // O id do <pattern> precisa ser único na página, caso o componente apareça mais de uma vez.
  const waveId = `onda-${useId().replace(/:/g, '')}`;

  return (
    <svg
      aria-hidden
      viewBox="0 0 440 277"
      preserveAspectRatio="xMidYMid slice"
      className={cn('pointer-events-none absolute inset-0 size-full', className)}
    >
      <defs>
        <pattern id={waveId} width={44} height={9} patternUnits="userSpaceOnUse">
          <path d="M0 4.5 C11 0 11 0 22 4.5 S33 9 44 4.5" fill="none" stroke="currentColor" strokeWidth={0.6} />
        </pattern>
      </defs>
      <rect width={440} height={277} fill={`url(#${waveId})`} opacity={0.16} />
      <g transform="translate(350 150)" fill="none" stroke="currentColor" strokeWidth={0.7} opacity={0.45}>
        {ROSETTE_ANGLES.map((angle) => (
          <ellipse key={angle} rx={92} ry={30} transform={`rotate(${angle})`} />
        ))}
        <circle r={18} />
        <circle r={12} />
      </g>
    </svg>
  );
}
