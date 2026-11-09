// components/logo.tsx
// Logo Skillo podľa docs/brand/primarne-logo.png a docs/brand/ikona-a-pouzitie.png.
//
// Značka "S": dvaja študenti si podávajú bod. Horný oblúk (čierny), bod v strede,
// dolný oblúk (ružový). Dolný oblúk je horný otočený o 180° okolo bodu.
// Pod 64 px sa používa variant "small": hrubší ťah a bez bodu, inak sa bod zleje so znakom.
//
// Wordmark "skillo" je Bricolage Grotesque 800 (font-logo). Toto písmo je LEN pre logo,
// zvyšok webu ostáva Inter / Inter Tight.

import { cx } from '@/components/ui';

// Geometria (viewBox 140 × 252): stredy oblúkov (70, 70) a (70, 182), bod (70, 126), polomer 56.
const TOP_ARC = 'M35.5 114.1A56 56 0 1 1 123.3 52.7';
const BOTTOM_ARC = 'M104.5 137.9A56 56 0 1 1 16.7 199.3';

interface MarkProps {
  className?: string;
  // small = pod 64 px (hrubší ťah, bez bodu)
  small?: boolean;
  // Farby: default = čierna + ružová (na bielej). onPink = čierna + biela (na ružovej ploche, app ikona).
  tone?: 'default' | 'onPink';
}

export function SkilloMark({ className, small = false, tone = 'default' }: MarkProps) {
  const stroke = small ? 36 : 28;
  const pad = stroke / 2 - 14; // pri hrubšom ťahu treba väčší okraj viewBoxu
  const bottomColor = tone === 'onPink' ? '#FFFFFF' : 'var(--color-pink)';
  return (
    <svg
      aria-hidden
      viewBox={`${-pad} ${-pad} ${140 + 2 * pad} ${252 + 2 * pad}`}
      fill="none"
      className={cx('h-8 w-auto shrink-0', className)}
    >
      <path d={TOP_ARC} stroke="var(--color-ink)" strokeWidth={stroke} strokeLinecap="round" />
      {!small && <circle cx="70" cy="126" r="14" fill="var(--color-ink)" />}
      <path d={BOTTOM_ARC} stroke={bottomColor} strokeWidth={stroke} strokeLinecap="round" />
    </svg>
  );
}

// Celé logo: značka + wordmark. Veľkosť sa riadi veľkosťou písma (className napr. "text-[28px]").
export function SkilloLogo({ className }: { className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-[0.3em] text-[28px] leading-none', className)}>
      <SkilloMark className="h-[1.25em]" />
      <span className="font-logo font-extrabold tracking-[-0.04em]">skillo</span>
    </span>
  );
}
