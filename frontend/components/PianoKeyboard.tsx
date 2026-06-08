import React from 'react';

interface Props {
  notes: number[];
  size?: 'small' | 'large';
}

const WHITE_SEMITONES = [0, 2, 4, 5, 7, 9, 11]; // C D E F G A B
const BLACK_KEYS = [
  { semi: 1, gap: 1 },   // C# between C(0) and D(1)
  { semi: 3, gap: 2 },   // D# between D(1) and E(2)
  { semi: 6, gap: 4 },   // F# between F(3) and G(4)
  { semi: 8, gap: 5 },   // G# between G(4) and A(5)
  { semi: 10, gap: 6 },  // A# between A(5) and B(6)
];

export const PianoKeyboard: React.FC<Props> = ({ notes, size = 'large' }) => {
  const noteSet = new Set(notes.map(n => ((n % 12) + 12) % 12));

  const wW = size === 'large' ? 18 : 9;
  const wH = size === 'large' ? 54 : 30;
  const bW = size === 'large' ? 11 : 6;
  const bH = size === 'large' ? 34 : 18;
  const totalW = wW * 7;

  return (
    <svg width={totalW + 1} height={wH + 1} style={{ display: 'block' }}>
      {/* White keys */}
      {WHITE_SEMITONES.map((semi, i) => (
        <rect
          key={semi}
          x={i * wW + 0.5} y={0.5}
          width={wW - 1} height={wH - 1}
          rx={size === 'large' ? 3 : 2}
          fill={noteSet.has(semi) ? '#bfdbfe' : 'white'}
          stroke={noteSet.has(semi) ? '#2563eb' : '#9ca3af'}
          strokeWidth={0.8}
        />
      ))}
      {/* Black keys */}
      {BLACK_KEYS.map(({ semi, gap }) => {
        const x = gap * wW - Math.round(bW / 2);
        return (
          <rect
            key={semi}
            x={x} y={0.5}
            width={bW} height={bH}
            rx={size === 'large' ? 2 : 1}
            fill={noteSet.has(semi) ? '#3b82f6' : '#1f2937'}
            stroke="#111"
            strokeWidth={0.5}
          />
        );
      })}
    </svg>
  );
};
