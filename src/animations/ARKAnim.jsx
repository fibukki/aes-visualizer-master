import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toRowMajor, hex2, CELL, GAP } from './shared';

export default function ARKAnim({ fromState, toState, roundKey, onDone, speedMult = 1, manualMode = false, onWaitConfirm }) {
  const [phase, setPhase] = useState('slide-in');
  const [scanIdx, setScanIdx] = useState(-1);
  const [appliedCells, setApplied] = useState([]);
  const [waiting, setWaiting]     = useState(false);

  const slideInMs   = Math.round(speedMult * 500);
  const cellMs      = Math.max(55, Math.round(speedMult * 200)); 

  useEffect(() => {
    const t = setTimeout(() => {
      setPhase('scan');
      setScanIdx(0);
    }, slideInMs);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase !== 'scan' || scanIdx < 0 || waiting) return;

    if (manualMode) {
      setWaiting(true);
      onWaitConfirm?.(() => {
        setWaiting(false);
        setApplied(prev => [...prev, scanIdx]);
        if (scanIdx < 15) {
          setScanIdx(s => s + 1);
        } else {
          setPhase('fade-out');
          setTimeout(() => onDone?.(), Math.round(speedMult * 380));
        }
      });
      return;
    }

    const t = setTimeout(() => {
      setApplied(prev => [...prev, scanIdx]);
      if (scanIdx < 15) {
        setScanIdx(s => s + 1);
      } else {
        setTimeout(() => {
          setPhase('fade-out');
          setTimeout(() => onDone?.(), Math.round(speedMult * 380));
        }, Math.round(cellMs * 0.7));
      }
    }, cellMs);
    return () => clearTimeout(t);
  }, [scanIdx, phase, manualMode, waiting]);

  const gridH  = 4 * CELL + 3 * GAP + 28; 
  const keyCells = roundKey ? toRowMajor(roundKey) : [];

  const stateCells = toRowMajor(fromState).map(cell => {
    if (appliedCells.includes(cell.displayIdx)) {
      return { ...cell, value: toState[cell.col * 4 + cell.row] };
    }
    return cell;
  });

  const scanRow    = scanIdx >= 0 ? Math.floor(scanIdx / 4) : 0;
  const scanCol    = scanIdx >= 0 ? scanIdx % 4 : 0;
  const linearIdx  = scanCol * 4 + scanRow;
  const curFrom    = fromState[linearIdx] ?? 0;
  const curKey     = roundKey?.[linearIdx] ?? 0;
  const curTo      = toState[linearIdx] ?? 0;
  const curChanged = curFrom !== curTo;

  return (
    <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>

      <div style={{ position: 'relative', flexShrink: 0 }}>

        <AnimatePresence>
          {phase !== 'fade-out' && roundKey && (
            <motion.div
              key="rk-overlay"
              initial={{ y: -(gridH + 20), opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -(gridH / 2), opacity: 0, transition: { duration: speedMult * 0.35 } }}
              transition={{ duration: speedMult * 0.65, ease: [0.16, 1, 0.3, 1] }}
              style={{ position: 'absolute', top: 0, left: 0, zIndex: 20, pointerEvents: 'none' }}
            >
              <div style={{
                display: 'grid', gridTemplateColumns: `repeat(4, ${CELL}px)`,
                gap: GAP, padding: 14,
                background: 'color-mix(in srgb, var(--accent-warn) 10%, var(--bg-card2))',
                border: '2px solid var(--accent-warn)',
                boxShadow: '0 0 24px color-mix(in srgb, var(--accent-warn) 40%, transparent)',
              }}>
                {keyCells.map(({ value, displayIdx }) => {
                  const isActive = phase === 'scan' && displayIdx === scanIdx;
                  return (
                    <motion.div
                      key={displayIdx}
                      className="state-cell"
                      animate={{
                        color:       isActive ? 'var(--text)' : 'var(--accent-warn)',
                        borderColor: isActive ? 'var(--text)' : 'color-mix(in srgb, var(--accent-warn) 50%, var(--border))',
                        background:  isActive
                          ? 'color-mix(in srgb, var(--accent-warn) 30%, var(--bg-card2))'
                          : 'color-mix(in srgb, var(--accent-warn) 8%, var(--bg-card2))',
                        scale: isActive ? 1.07 : 1,
                        boxShadow: isActive
                          ? '0 0 14px color-mix(in srgb, var(--accent-warn) 55%, transparent)'
                          : 'none',
                      }}
                      transition={{ duration: 0.28 }}
                      style={{ fontSize: 18, fontWeight: 700 }}
                    >{hex2(value)}</motion.div>
                  );
                })}
              </div>
              <div style={{
                textAlign: 'center', marginTop: 4,
                fontFamily: 'Orbitron, monospace', fontSize: 8, letterSpacing: 2,
                color: 'var(--accent-warn)',
              }}>ROUND KEY (XOR)</div>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{
          display: 'grid', gridTemplateColumns: `repeat(4, ${CELL}px)`,
          gap: GAP, padding: 14,
          background: 'var(--bg-card2)', border: '2px solid var(--border)',
          position: 'relative', zIndex: 10,
        }}>
          {stateCells.map(({ value, row, col, displayIdx }) => {
            const isActive  = phase === 'scan' && displayIdx === scanIdx;
            const isApplied = appliedCells.includes(displayIdx);
            const changed   = fromState[col * 4 + row] !== toState[col * 4 + row];
            return (
              <motion.div
                key={`${row}-${col}`}
                className="state-cell"
                animate={{
                  borderColor: isActive
                    ? 'var(--accent-warn)'
                    : isApplied && changed
                      ? 'color-mix(in srgb, var(--accent) 50%, var(--border))'
                      : 'var(--border)',
                  scale:      isActive ? 1.07 : 1,
                  background: isActive
                    ? 'color-mix(in srgb, var(--accent-warn) 12%, var(--bg-card2))'
                    : 'var(--bg-card2)',
                  boxShadow: isActive && waiting
                    ? ['0 0 0px transparent', '0 0 20px color-mix(in srgb, var(--accent-warn) 65%, transparent)', '0 0 0px transparent']
                    : isActive ? '0 0 14px color-mix(in srgb, var(--accent-warn) 40%, transparent)' : 'none',
                }}
                transition={{
                  duration: isActive && waiting ? 1.2 : 0.28,
                  repeat: isActive && waiting ? Infinity : 0,
                }}
              >
                <AnimatePresence mode="wait">
                  <motion.span
                    key={`${displayIdx}-${value}`}
                    initial={{ opacity: 0, scale: 0.65 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 24, duration: Math.max(0.15, speedMult * 0.22) }}
                    style={{
                      fontFamily: 'Share Tech Mono, monospace', fontSize: 22, fontWeight: 700,
                      color: isApplied && changed ? 'var(--accent)' : 'var(--text)',
                    }}
                  >{hex2(value)}</motion.span>
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        <AnimatePresence>
          {phase === 'scan' && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                position: 'absolute', inset: 0, zIndex: 30, pointerEvents: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <motion.div
                animate={{ opacity: [0.15, 0.35, 0.15] }}
                transition={{ repeat: Infinity, duration: 1.0 }}
                style={{
                  fontFamily: 'Orbitron, monospace', fontSize: 80, fontWeight: 900,
                  color: 'var(--accent-warn)',
                  textShadow: '0 0 30px var(--accent-warn)',
                  userSelect: 'none',
                }}
              >⊕</motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ flex: 1, minWidth: 150, alignSelf: 'center' }}>

        {phase === 'scan' && scanIdx >= 0 && (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                key={scanIdx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  background: 'color-mix(in srgb, var(--accent-warn) 8%, var(--bg-card))',
                  border: '1.5px solid color-mix(in srgb, var(--accent-warn) 45%, var(--border))',
                  padding: '10px 14px', marginBottom: 10,
                }}
              >
                
                <div style={{
                  fontFamily: 'Orbitron, monospace', fontSize: 8, letterSpacing: 2,
                  color: 'var(--text-3)', marginBottom: 10,
                }}>
                  CELL [R{scanRow}, C{scanCol}]
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{
                    fontFamily: 'Share Tech Mono, monospace', fontSize: 20, fontWeight: 700,
                    color: 'var(--text)',
                  }}>{hex2(curFrom)}</span>
                  <span style={{
                    fontFamily: 'Share Tech Mono, monospace', fontSize: 22,
                    color: 'var(--accent-warn)', fontWeight: 900,
                  }}>⊕</span>
                  <span style={{
                    fontFamily: 'Share Tech Mono, monospace', fontSize: 20, fontWeight: 700,
                    color: 'var(--accent-warn)',
                  }}>{hex2(curKey)}</span>
                  <span style={{
                    fontFamily: 'Share Tech Mono, monospace', fontSize: 20,
                    color: 'var(--text-3)',
                  }}>=</span>
                  <motion.span
                    key={`r-${curTo}`}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 220, damping: 20 }}
                    style={{
                      fontFamily: 'Share Tech Mono, monospace', fontSize: 24, fontWeight: 900,
                      color: curChanged ? 'var(--accent)' : 'var(--text-dim)',
                    }}
                  >{hex2(curTo)}</motion.span>
                </div>

                <div style={{
                  marginTop: 8, fontFamily: 'Share Tech Mono, monospace', fontSize: 9,
                  color: 'var(--text-dim)', letterSpacing: 1,
                }}>
                  {curFrom.toString(2).padStart(8,'0')} ⊕ {curKey.toString(2).padStart(8,'0')} = {curTo.toString(2).padStart(8,'0')}
                </div>
              </motion.div>
            </AnimatePresence>

            <div style={{
              fontFamily: 'Orbitron, monospace', fontSize: 7,
              color: 'var(--text-3)', letterSpacing: 2, marginBottom: 5,
            }}>
              XOR PROGRESS — {appliedCells.length}/16
            </div>
            <div style={{ height: 4, background: 'var(--border-2)', overflow: 'hidden' }}>
              <motion.div
                animate={{ width: `${(appliedCells.length / 16) * 100}%` }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--accent-warn), var(--accent))',
                }}
              />
            </div>

            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 2, marginTop: 8, maxWidth: 140,
            }}>
              {Array.from({ length: 16 }, (_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    background: appliedCells.includes(i)
                      ? 'var(--accent)' : i === scanIdx
                        ? 'var(--accent-warn)'
                        : 'var(--border-2)',
                    scale: i === scanIdx ? 1.3 : 1,
                  }}
                  transition={{ duration: 0.28 }}
                  style={{ width: 7, height: 7 }}
                />
              ))}
            </div>
          </>
        )}

        {phase === 'fade-out' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'color-mix(in srgb, var(--accent-green) 8%, var(--bg-card))',
              border: '1.5px solid color-mix(in srgb, var(--accent-green) 40%, var(--border))',
              padding: '12px 14px',
            }}
          >
            <div style={{
              fontFamily: 'Orbitron, monospace', fontSize: 8, fontWeight: 700,
              color: 'var(--accent-green)', letterSpacing: 2, marginBottom: 6,
            }}>✓ ALL 16 BYTES XOR'D</div>
            <div style={{
              fontFamily: 'Exo 2, sans-serif', fontSize: 12,
              color: 'var(--text-2)', lineHeight: 1.55,
            }}>
              Round key diffused into state. XOR is its own inverse — same key decrypts.
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
