import React, { useState } from 'react';
import { lookupChord } from '../utils/chordDiagrams';
import { getPianoNotes } from '../utils/pianoChords';
import { PianoKeyboard } from './PianoKeyboard';
import { XIcon } from './Icons';

interface Props {
  chordName: string;
  onClose: () => void;
}

export const ChordDiagramModal: React.FC<Props> = ({ chordName, onClose }) => {
  const [tab, setTab] = useState<'guitar' | 'piano'>('guitar');
  const shape = lookupChord(chordName);
  const pianoNotes = getPianoNotes(chordName);

  const padLeft = 22, padTop = 48;
  const strSpacing = 17, fretSpacing = 22, numFrets = 4;
  const W = padLeft * 2 + strSpacing * 5 + (shape && shape.baseFret > 1 ? 22 : 0);
  const H = padTop + numFrets * fretSpacing + 18;

  const sx = (s: number) => padLeft + s * strSpacing;
  const fy = (row: number) => padTop + row * fretSpacing;
  const dotCY = (row: number) => fy(row) - fretSpacing / 2;
  const toRow = (fret: number) => shape ? fret - shape.baseFret + 1 : 1;

  const tabBtn = (active: boolean) =>
    `px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${active
      ? 'bg-blue-600 text-white'
      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-3 min-w-[200px]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between w-full">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">{chordName}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1 w-full">
          <button className={tabBtn(tab === 'guitar')} onClick={() => setTab('guitar')}>Guitarra</button>
          <button className={tabBtn(tab === 'piano')} onClick={() => setTab('piano')}>Piano</button>
        </div>

        {/* Guitar diagram */}
        {tab === 'guitar' && (
          !shape ? (
            <p className="text-gray-400 text-sm py-4">Sin diagrama disponible</p>
          ) : (
            <>
              <svg width={W} height={H} className="text-gray-800 dark:text-gray-100" overflow="visible">
                <text x={sx(5) + 7} y={fy(1) + 5} fontSize={10} fill="currentColor">{shape.baseFret}fr</text>
                {shape.baseFret === 1 && (
                  <rect x={sx(0)} y={fy(0) - 3} width={sx(5) - sx(0)} height={5} rx={1} fill="currentColor" />
                )}
                {[0,1,2,3,4,5].map(s => (
                  <line key={`s${s}`} x1={sx(s)} y1={fy(0)} x2={sx(s)} y2={fy(numFrets)} stroke="currentColor" strokeWidth={1} />
                ))}
                {Array.from({ length: numFrets + 1 }, (_, i) => (
                  <line key={`f${i}`} x1={sx(0)} y1={fy(i)} x2={sx(5)} y2={fy(i)} stroke="currentColor" strokeWidth={1} />
                ))}
                {shape.frets.map((fret, s) => {
                  if (fret === 0) return <text key={`o${s}`} x={sx(s)} y={fy(0) - 7} textAnchor="middle" fontSize={12} fill="currentColor">○</text>;
                  if (fret === -1) return <text key={`x${s}`} x={sx(s)} y={fy(0) - 7} textAnchor="middle" fontSize={12} fill="currentColor">×</text>;
                  return null;
                })}
                {shape.barre && (
                  <rect
                    x={sx(shape.barre.from) - 7} y={dotCY(toRow(shape.barre.fret)) - 7}
                    width={sx(shape.barre.to) - sx(shape.barre.from) + 14} height={14}
                    rx={7} fill="currentColor"
                  />
                )}
                {shape.frets.map((fret, s) => {
                  if (fret <= 0) return null;
                  const row = toRow(fret);
                  if (row < 1 || row > numFrets) return null;
                  if (shape.barre && fret === shape.barre.fret && s >= shape.barre.from && s <= shape.barre.to) return null;
                  return <circle key={`d${s}`} cx={sx(s)} cy={dotCY(row)} r={7} fill="currentColor" />;
                })}
              </svg>
              <p className="text-xs text-gray-400">Mi La Re Sol Si Mi</p>
            </>
          )
        )}

        {/* Piano diagram */}
        {tab === 'piano' && (
          !pianoNotes ? (
            <p className="text-gray-400 text-sm py-4">Sin diagrama disponible</p>
          ) : (
            <>
              <div className="mt-1">
                <PianoKeyboard notes={pianoNotes} size="large" />
              </div>
              <p className="text-xs text-gray-400">Do Re Mi Fa Sol La Si</p>
            </>
          )
        )}
      </div>
    </div>
  );
};
