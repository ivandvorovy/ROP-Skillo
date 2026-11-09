// app/apple-icon.tsx
// Ikona pri pridaní webu na plochu iPhonu (180 × 180 PNG). iOS si rohy zaobľuje sám,
// preto je pozadie celé ružové. Značka v plnej verzii s bodom (nad 64 px).

import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 252" fill="none">
  <path d="M35.5 114.1A56 56 0 1 1 123.3 52.7" stroke="#121117" stroke-width="28" stroke-linecap="round"/>
  <circle cx="70" cy="126" r="14" fill="#121117"/>
  <path d="M104.5 137.9A56 56 0 1 1 16.7 199.3" stroke="#FFFFFF" stroke-width="28" stroke-linecap="round"/>
</svg>`;

export default function AppleIcon() {
  const src = `data:image/svg+xml;base64,${Buffer.from(MARK_SVG).toString('base64')}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FF7AAC',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={60} height={108} alt="" />
      </div>
    ),
    size,
  );
}
