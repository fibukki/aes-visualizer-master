import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toRowMajor, hex2, CELL, GAP, STEP } from './shared';

export default function CrossfadeGrid({ fromState, toState, op, onDone, speedMult = 1 }) {
  const [phase, setPhase] = useState('from');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('to'), 80 * speedMult);
    const t2 = setTimeout(() => onDone?.(), (80 + 16 * 35 + 320) * speedMult);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [speedMult, onDone]);

  const cells = toRowMajor(phase === 'to' ? toState : fromState);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(4, ${CELL}px)`,
      gap: GAP,
      padding: 14,
      background: 'var(--bg-card2)',
      border: '2px solid var(--border)',
    }}>
      {cells.map(({ value, row, col, displayIdx }) => {
        const prevVal = fromState[col * 4 + row];
        const nextVal = toState[col * 4 + row];
        const changed = prevVal !== nextVal;
        return (
          <div key={`${row}-${col}`} className="state-cell" style={{ overflow: 'hidden' }}>
            <AnimatePresence mode="wait">
              <motion.span
                key={`${phase}-${displayIdx}`}
                initial={{ opacity: 0, y: phase === 'to' ? 12 : -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: phase === 'to' ? -12 : 12 }}
                transition={{
                  duration: 0.28,
                  delay: changed ? displayIdx * 0.032 : 0,
                  ease: 'easeOut',
                }}
                style={{
                  fontFamily: 'Share Tech Mono, monospace',
                  fontSize: 22, fontWeight: 700,
                  color: changed && phase === 'to' ? 'var(--accent)' : 'var(--text)',
                }}
              >
                {hex2(value)}
              </motion.span>
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}