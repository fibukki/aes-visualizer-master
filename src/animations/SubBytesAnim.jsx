import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { INV_SBOX } from '../aes';
import { hex2 } from './shared';

const INV_SBOX_TABLE = Array.from({ length: 16 }, (_, r) =>
  Array.from({ length: 16 }, (_, c) => INV_SBOX[r * 16 + c])
);

const CELL_G  = 56;
const GAP_G   = 4;
const STEP_G  = CELL_G + GAP_G;
const CELL_SB = 18;

export default function SubBytesAnim({
  fromState, toState, onDone,
  speedMult = 1,
  manualMode = false,
  onWaitConfirm,
}) {
  const [scanIdx, setScanIdx]     = useState(0);
  const [scanPhase, setScanPhase] = useState('lookup');
  const [appliedCells, setApplied] = useState([]);
  const [finished, setFinished]   = useState(false);
  const [waiting, setWaiting]     = useState(false);

  const lookupMs  = Math.max(50, Math.round(speedMult * 290));
  const applyMs   = Math.max(80, Math.round(speedMult * 520));

  const displayCells = Array.from({ length: 16 }, (_, di) => {
    const row = Math.floor(di / 4);
    const col = di % 4;
    return { row, col, displayIdx: di, value: fromState[col * 4 + row] };
  });

  const confirmAllRemaining = () => {
    const remaining = 16 - appliedCells.length;
    for (let i = 0; i < remaining; i++) {
      setTimeout(() => {
        setApplied(prev => [...prev, scanIdx + i]);
      }, i * 50);
    }
    setFinished(true);
    setTimeout(() => onDone?.(), 400);
  };

  useEffect(() => {
    if (finished) return;

    if (!manualMode) {
      const t1 = setTimeout(() => setScanPhase('apply'), lookupMs);
      const t2 = setTimeout(() => {
        setApplied(prev => [...prev, scanIdx]);
        if (scanIdx < 15) {
          setScanIdx(s => s + 1);
          setScanPhase('lookup');
        } else {
          setFinished(true);
          setTimeout(() => onDone?.(), Math.round(speedMult * 400));
        }
      }, applyMs);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    } else {
      setWaiting(true);
      onWaitConfirm?.(() => {
        setWaiting(false);
        setScanPhase('apply');
        setTimeout(() => {
          setApplied(prev => [...prev, scanIdx]);
          if (scanIdx < 15) {
            setScanIdx(s => s + 1);
            setScanPhase('lookup');
          } else {
            setFinished(true);
            setTimeout(() => onDone?.(), 400);
          }
        }, 380);
      });
      return () => setWaiting(false);
    }
  }, [scanIdx, finished, manualMode, speedMult, onDone]);

  const scanRow = Math.floor(scanIdx / 4);
  const scanCol = scanIdx % 4;
  const curByte = fromState[scanCol * 4 + scanRow];
  const curHi   = (curByte >> 4) & 0xf;
  const curLo   = curByte & 0xf;
  const outByte = toState[scanCol * 4 + scanRow];

  const needsPulse = manualMode && waiting && scanPhase === 'lookup';

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>

        <div style={{
          fontFamily: 'Orbitron, monospace', fontSize: 8, letterSpacing: 2,
          color: waiting ? 'var(--accent-warn)' : 'var(--accent-hl)',
          textAlign: 'center', lineHeight: 1.5,
        }}>
          {finished
            ? '✓ ALL BYTES SUBSTITUTED'
            : waiting
              ? `▸ CLICK CONFIRM — [R${scanRow} C${scanCol}]`
              : `[R${scanRow} C${scanCol}] 0x${hex2(curByte)}→0x${hex2(outByte)}`}
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: `repeat(4, ${CELL_G}px)`,
          gap: GAP_G, padding: 8,
          background: 'var(--bg-card2)', border: '2px solid var(--border)',
        }}>
          {displayCells.map(({ value, row, col, displayIdx }) => {
            const isActive  = displayIdx === scanIdx && !finished;
            const isApplied = appliedCells.includes(displayIdx);
            const shown     = isApplied ? toState[col * 4 + row] : value;
            const isSending = isActive && scanPhase === 'apply';

            return (
              <motion.div
                key={`${row}-${col}`}
                animate={{
                  borderColor: isActive
                    ? (isSending
                        ? 'var(--accent-green)'
                        : needsPulse ? ['var(--accent-warn)', 'color-mix(in srgb, var(--accent-warn) 60%, var(--border))', 'var(--accent-warn)']
                          : 'var(--accent-hl)')
                    : isApplied
                      ? 'color-mix(in srgb, var(--accent-green) 35%, var(--border))'
                      : 'var(--border)',
                  scale: isSending ? [1, 1.13, 1] : 1,
                  background: isActive
                    ? `color-mix(in srgb, ${isSending ? 'var(--accent-green)' : needsPulse ? 'var(--accent-warn)' : 'var(--accent-hl)'} 12%, var(--bg-card2))`
                    : 'var(--bg-card2)',
                  boxShadow: isSending
                    ? '0 0 14px color-mix(in srgb, var(--accent-green) 50%, transparent)'
                    : needsPulse && isActive
                      ? ['0 0 0px transparent', '0 0 16px color-mix(in srgb, var(--accent-warn) 55%, transparent)', '0 0 0px transparent']
                      : 'none',
                }}
                transition={{
                  duration: needsPulse && isActive ? 1.0 : 0.22,
                  repeat: needsPulse && isActive ? Infinity : 0,
                  delay: isSending ? 0.1 : 0,
                }}
                style={{
                  width: CELL_G, height: CELL_G,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid var(--border)',
                  boxSizing: 'border-box', position: 'relative',
                }}
              >
                <AnimatePresence mode="wait">
                  <motion.span
                    key={`${displayIdx}-${shown}`}
                    initial={{ opacity: 0, scale: 0.55 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 240, damping: 22 }}
                    style={{
                      fontFamily: 'Share Tech Mono, monospace',
                      fontSize: 18, fontWeight: 700,
                      color: isApplied ? 'var(--accent-green)'
                           : isActive ? (needsPulse ? 'var(--accent-warn)' : 'var(--accent-hl)')
                           : 'var(--text)',
                    }}
                  >{hex2(shown)}</motion.span>
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 3,
          justifyContent: 'center', width: 4 * STEP_G - GAP_G + 16,
        }}>
          {Array.from({ length: 16 }, (_, i) => (
            <motion.div
              key={i}
              animate={{
                background: appliedCells.includes(i)
                  ? 'var(--accent-green)'
                  : i === scanIdx
                    ? (waiting ? 'var(--accent-warn)' : 'var(--accent-hl)')
                    : 'var(--border)',
                scale: i === scanIdx ? 1.5 : 1,
              }}
              transition={{ duration: 0.18 }}
              style={{ width: 6, height: 6, borderRadius: '50%' }}
            />
          ))}
        </div>

        {/* Confirm All button – appears only in manual mode waiting state */}
        {manualMode && waiting && scanPhase === 'lookup' && (
          <button
            onClick={confirmAllRemaining}
            style={{
              marginTop: 8,
              fontFamily: 'Orbitron, monospace',
              fontSize: 9,
              padding: '6px 12px',
              border: '1px solid var(--accent-green)',
              background: 'color-mix(in srgb, var(--accent-green) 8%, var(--bg-card2))',
              color: 'var(--accent-green)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              letterSpacing: 1,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--accent-green) 18%, var(--bg-card2))'}
            onMouseLeave={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--accent-green) 8%, var(--bg-card2))'}
          >
            ⚡ CONFIRM ALL REMAINING
          </button>
        )}
      </div>

      <div style={{ flexShrink: 0 }}>
        <div style={{
          fontFamily: 'Orbitron, monospace', fontSize: 8, letterSpacing: 2,
          color: 'var(--text-3)', marginBottom: 6,
        }}>
          {finished
            ? 'INV S-BOX — COMPLETE'
            : `INV S-BOX — 0x${hex2(curByte)} → ROW ${curHi.toString(16).toUpperCase()} COL ${curLo.toString(16).toUpperCase()}`}
        </div>

        <div style={{ position: 'relative', display: 'inline-block' }}>
          <motion.div
            animate={{ top: (curHi + 1) * (CELL_SB + 1) + 1 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute', left: CELL_SB + 2, height: CELL_SB, right: 0,
              background: 'color-mix(in srgb, var(--accent-hl) 13%, transparent)',
              borderTop: '1px solid color-mix(in srgb, var(--accent-hl) 40%, transparent)',
              borderBottom: '1px solid color-mix(in srgb, var(--accent-hl) 40%, transparent)',
              pointerEvents: 'none', zIndex: 1,
            }}
          />
          <motion.div
            animate={{ left: (curLo + 1) * (CELL_SB + 1) + 1 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute', top: CELL_SB + 2, width: CELL_SB, bottom: 0,
              background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
              borderLeft: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
              borderRight: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
              pointerEvents: 'none', zIndex: 1,
            }}
          />

          <table style={{ borderCollapse: 'separate', borderSpacing: 1, position: 'relative', zIndex: 2 }}>
            <thead>
              <tr>
                <th style={{ width: CELL_SB, height: CELL_SB, fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'var(--text-dim)' }} />
                {Array.from({ length: 16 }, (_, c) => (
                  <th key={c} style={{
                    width: CELL_SB, height: CELL_SB,
                    fontFamily: 'Share Tech Mono, monospace', fontSize: 8, fontWeight: 400,
                    color: c === curLo ? 'var(--accent)' : 'var(--text-dim)',
                    textAlign: 'center', paddingBottom: 2, transition: 'color 0.15s',
                  }}>{c.toString(16).toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {INV_SBOX_TABLE.map((row, ri) => (
                <tr key={ri}>
                  <td style={{
                    width: CELL_SB, height: CELL_SB,
                    fontFamily: 'Share Tech Mono, monospace', fontSize: 8, fontWeight: 600,
                    color: ri === curHi ? 'var(--accent-hl)' : 'var(--text-dim)',
                    textAlign: 'center', paddingRight: 2, transition: 'color 0.15s',
                  }}>{ri.toString(16).toUpperCase()}</td>
                  {row.map((val, ci) => {
                    const isTarget  = ri === curHi && ci === curLo;
                    const isSending = isTarget && scanPhase === 'apply';
                    const isWaiting = isTarget && waiting;
                    return (
                      <motion.td
                        key={ci}
                        animate={{
                          background: isTarget
                            ? (isSending
                                ? 'color-mix(in srgb, var(--accent-green) 40%, var(--bg-card2))'
                                : isWaiting
                                  ? ['color-mix(in srgb, var(--accent-warn) 25%, var(--bg-card2))', 'color-mix(in srgb, var(--accent-warn) 12%, var(--bg-card2))', 'color-mix(in srgb, var(--accent-warn) 25%, var(--bg-card2))']
                                  : 'color-mix(in srgb, var(--accent-hl) 30%, var(--bg-card2))')
                            : 'var(--bg-card2)',
                          color:       isTarget ? 'var(--text)' : 'var(--text-2)',
                          borderColor: isTarget
                            ? (isSending ? 'var(--accent-green)' : isWaiting ? 'var(--accent-warn)' : 'var(--accent-hl)')
                            : 'var(--border-2)',
                          scale: isSending ? [1, 1.35, 1] : 1,
                        }}
                        transition={{
                          duration: isWaiting ? 1.0 : 0.18,
                          repeat: isWaiting ? Infinity : 0,
                        }}
                        style={{
                          width: CELL_SB, height: CELL_SB,
                          fontFamily: 'Share Tech Mono, monospace', fontSize: 8,
                          textAlign: 'center', border: '1px solid var(--border-2)',
                          fontWeight: isTarget ? 900 : 400,
                        }}
                      >
                        {val.toString(16).padStart(2,'0').toUpperCase()}
                      </motion.td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!finished && (
          <motion.div
            key={scanIdx}
            initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
            style={{
              marginTop: 8, padding: '6px 10px',
              background: 'var(--bg-card2)', border: '1px solid var(--border)',
              fontFamily: 'Share Tech Mono, monospace', fontSize: 12,
              display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
            }}
          >
            <span style={{ color: 'var(--text-3)' }}>InvSBox[</span>
            <span style={{ color: 'var(--accent-hl)', fontWeight: 700 }}>0x{hex2(curByte)}</span>
            <span style={{ color: 'var(--text-3)' }}>]</span>
            <span style={{ color: 'var(--text-3)' }}>=</span>
            <motion.span
              key={outByte}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              style={{
                color: scanPhase === 'apply' ? 'var(--accent-green)' : 'var(--text-3)',
                fontWeight: 900, transition: 'color 0.18s',
              }}
            >0x{hex2(outByte)}</motion.span>
            <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>
              ({appliedCells.length}/16)
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
}