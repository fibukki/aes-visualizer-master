import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useAnimate } from 'framer-motion';
import { toRowMajor, hex2, CELL, GAP, STEP } from './shared';

const ROW_COLOR = [
  'var(--text-dim)',    
  'var(--accent)',      
  'var(--accent-hl)',   
  'var(--accent-warn)', 
];

export default function ShiftRowsAnim({ fromState, toState, onDone, speedMult = 1, manualMode = false, onWaitConfirm }) {
  const [scope, animate] = useAnimate();
  const [phase, setPhase] = useState('preview');

  const previewMs = Math.round(speedMult * 900);
  const slideDur  = Math.max(0.08, speedMult * 0.45); 
  const wrapDur1  = Math.max(0.05, speedMult * 0.28); 
  const wrapDur2  = Math.max(0.06, speedMult * 0.38); 

  useEffect(() => {
    if (manualMode) {
      onWaitConfirm?.(() => setPhase('sliding'));
      return;
    }
    const t = setTimeout(() => setPhase('sliding'), previewMs);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase !== 'sliding') return;
    let live = true;

    async function run() {
      await Promise.all([1, 2, 3].map(animRow));
      if (live) {
        setPhase('done');
        setTimeout(() => onDone?.(), 450);
      }
    }

    async function animRow(row) {
      await Promise.all(
        [0, 1, 2, 3].map(col => animCell(row, col))
      );
    }

    async function animCell(row, col) {
      const sel    = `[data-sr="${row}-${col}"]`;
      const wraps  = col + row >= 4;
      const tc     = (col + row) % 4; 

      if (!wraps) {
        await animate(sel, { x: row * STEP }, { duration: slideDur, ease: [0.16, 1, 0.3, 1] });
      } else {
        await animate(sel, { x: (4 - col) * STEP }, { duration: wrapDur1, ease: [0.4, 0, 1, 1] });
        await animate(sel, { x: -(col + 1) * STEP }, { duration: 0 });
        await animate(sel, { x: (tc - col) * STEP }, { duration: wrapDur2, ease: [0.16, 1, 0.3, 1] });
      }
    }

    run();
    return () => { live = false; };
  }, [phase]);

  const cells = toRowMajor(fromState);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      <div style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: 26,
        fontWeight: 800,
        color: 'var(--accent)',
        letterSpacing: '0.04em',
        textAlign: 'center',
        marginBottom: 4,
      }}>
        {phase === 'preview' ? (manualMode ? 'INV SHIFT ROWS — PRESS CONFIRM TO BEGIN' : 'INV SHIFT ROWS — CYCLIC RIGHT SHIFT') :
         phase === 'sliding'  ? 'SHIFTING BYTES…' : '✓ SHIFT COMPLETE'}
      </div>

      <div style={{ display: 'flex', gap: GAP, paddingLeft: 76 }}>
        {['COL 0', 'COL 1', 'COL 2', 'COL 3'].map(l => (
          <div key={l} style={{
            width: CELL, textAlign: 'center',
            fontFamily: 'Inter, sans-serif',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--text-dim)',
            letterSpacing: '0.06em',
          }}>{l}</div>
        ))}
      </div>

      <div ref={scope} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
        {[0, 1, 2, 3].map(row => {
          const rc     = ROW_COLOR[row];
          const isDone = phase === 'done' && row > 0;
          const rowCells = cells.filter(c => c.row === row);

          return (
            <div key={row} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

              <div style={{
                width: 68, display: 'flex', alignItems: 'center',
                justifyContent: 'flex-end', gap: 3, flexShrink: 0,
              }}>
                <span style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--text-dim)',
                  letterSpacing: '0.04em',
                  marginRight: 4,
                }}>R{row}</span>

                {row === 0 ? (
                  <span style={{ fontSize: 18, color: 'var(--text-dim)', fontFamily: 'monospace' }}>—</span>
                ) : (
                  Array.from({ length: row }, (_, i) => (
                    <motion.span
                      key={i}
                      animate={phase === 'preview'
                        ? { x: [0, 5, 0], opacity: [0.45, 1, 0.45] }
                        : { opacity: 0, transition: { duration: 0.2 } }}
                      transition={{
                        repeat: phase === 'preview' ? Infinity : 0,
                        duration: 0.65, delay: i * 0.13,
                      }}
                      style={{ color: rc, fontSize: 20, fontWeight: 900, lineHeight: 1 }}
                    >→</motion.span>
                  ))
                )}
              </div>

              <div style={{
                position: 'relative',
                width: 4 * STEP - GAP,
                height: CELL,
                overflow: 'hidden',
                background: row === 0
                  ? 'var(--bg-card2)'
                  : `color-mix(in srgb, ${rc} 6%, var(--bg-card2))`,
                border: row === 0
                  ? '1px solid var(--border)'
                  : `1.5px solid color-mix(in srgb, ${rc} 40%, var(--border))`,
                boxShadow: row > 0 && phase === 'sliding'
                  ? `0 0 14px color-mix(in srgb, ${rc} 22%, transparent)`
                  : 'none',
                transition: 'box-shadow 0.3s',
              }}>
                {rowCells.map(({ value, col }) => (
                  <motion.div
                    key={col}
                    data-sr={`${row}-${col}`}
                    style={{
                      position: 'absolute', left: col * STEP,
                      width: CELL, height: CELL,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 24, fontWeight: 700,
                      border: `2px solid ${
                        row === 0 ? 'var(--border)'
                               : `color-mix(in srgb, ${rc} 55%, var(--border))`
                      }`,
                      background: row === 0
                        ? 'var(--bg-card2)'
                        : `color-mix(in srgb, ${rc} 10%, var(--bg-card2))`,
                      color: isDone ? 'var(--accent-green)'
                           : row === 0 ? 'var(--text-3)' : rc,
                      boxSizing: 'border-box',
                    }}
                  >
                    {hex2(value)}
                    {isDone && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: col * 0.06, type: 'spring', stiffness: 320, damping: 20 }}
                        style={{
                          position: 'absolute', top: 2, right: 4,
                          fontSize: 14, color: 'var(--accent-green)',
                        }}
                      >✓</motion.span>
                    )}
                  </motion.div>
                ))}
              </div>

              <div style={{
                width: 38,
                fontFamily: 'Inter, sans-serif',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.03em',
                color: isDone ? 'var(--accent-green)' : row === 0 ? 'var(--text-dim)' : rc,
              }}>
                {isDone ? '✓' : `+${row}`}
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {phase === 'preview' && (
          <motion.div key="pre"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              marginTop: 8, padding: '12px 14px',
              background: 'color-mix(in srgb, var(--accent) 5%, var(--bg-card))',
              border: '1px solid color-mix(in srgb, var(--accent) 30%, var(--border))',
              fontFamily: 'Inter, sans-serif', fontSize: 14,
              color: 'var(--text-2)', lineHeight: 1.65,
            }}>
            <strong style={{
              color: 'var(--accent)',
              fontFamily: 'Inter, sans-serif',
              fontSize: 12,
              letterSpacing: '0.08em',
            }}>UPCOMING: CYCLIC RIGHT SHIFT</strong>
            <br />
            {manualMode
              ? 'Row 0 unchanged · Row 1 +1 · Row 2 +2 · Row 3 +3. Press ▸ BEGIN SHIFT in the control bar to start the rotation.'
              : 'Row 0 unchanged · Row 1 shifts +1 · Row 2 shifts +2 · Row 3 shifts +3. Bytes that fall off the right edge wrap back to the left — cyclic rotation.'}
          </motion.div>
        )}
        {phase === 'done' && (
          <motion.div key="done"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{
              marginTop: 8, padding: '12px 14px',
              background: 'color-mix(in srgb, var(--accent-green) 6%, var(--bg-card))',
              border: '1px solid color-mix(in srgb, var(--accent-green) 30%, var(--border))',
              fontFamily: 'Inter, sans-serif', fontSize: 14,
              color: 'var(--text-2)', lineHeight: 1.65,
            }}>
            <strong style={{
              color: 'var(--accent-green)',
              fontFamily: 'Inter, sans-serif',
              fontSize: 12,
              letterSpacing: '0.08em',
            }}>✓ INVSHIFTROWS COMPLETE</strong>
            <br />
            Encryption shifted rows <em>left</em>; InvShiftRows shifts them <em>right</em>{' '}
            to undo the transposition and restore byte positions.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
