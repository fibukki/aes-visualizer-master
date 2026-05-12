import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toRowMajor, hex2, CELL, GAP, STEP } from './shared';

const INV_MDS = [
  [0x0e, 0x0b, 0x0d, 0x09],
  [0x09, 0x0e, 0x0b, 0x0d],
  [0x0d, 0x09, 0x0e, 0x0b],
  [0x0b, 0x0d, 0x09, 0x0e],
];

function gmul(a, b) {
  let p = 0;
  for (let i = 0; i < 8; i++) {
    if (b & 1) p ^= a;
    const hi = a & 0x80;
    a = (a << 1) & 0xff;
    if (hi) a ^= 0x1b;
    b >>= 1;
  }
  return p;
}

function computeRow(mRow, colBytes) {
  const products = mRow.map((m, j) => gmul(m, colBytes[j]));
  const result   = products.reduce((a, b) => a ^ b, 0);
  return { products, result };
}

export default function MixColsAnim({ fromState, toState, onDone, speedMult = 1, manualMode = false, onWaitConfirm }) {
  const [activeCol, setActiveCol] = useState(0);
  const [mixedCols, setMixedCols] = useState([]);
  const [mathRow, setMathRow]     = useState(0);
  const [waiting, setWaiting]     = useState(false);

  const s = (ms) => Math.round(ms * speedMult);

  useEffect(() => {
    if (waiting) return;

    if (manualMode) {
      setWaiting(true);
      onWaitConfirm?.(() => {
        setWaiting(false);
        setMixedCols(prev => [...prev, activeCol]);
        if (activeCol < 3) {
          setTimeout(() => setActiveCol(c => c + 1), s(200));
        } else {
          setTimeout(() => onDone?.(), s(400));
        }
      });
      return;
    }

    let live = true;
    const t1 = setTimeout(() => {
      if (!live) return;
      setMixedCols(prev => [...prev, activeCol]);
      if (activeCol < 3) {
        setTimeout(() => { if (live) setActiveCol(c => c + 1); }, s(200));
      } else {
        setTimeout(() => { if (live) onDone?.(); }, s(400));
      }
    }, s(700));
    return () => { live = false; clearTimeout(t1); };
  }, [activeCol, manualMode, waiting]);

  useEffect(() => {
    const t = setInterval(() => setMathRow(r => (r + 1) % 4), 480);
    return () => clearInterval(t);
  }, []);

  const cells     = toRowMajor(fromState).map(cell =>
    mixedCols.includes(cell.col)
      ? { ...cell, value: toState[cell.col * 4 + cell.row] }
      : cell
  );

  const colBytes    = [0,1,2,3].map(row => fromState[activeCol * 4 + row]);
  const resultBytes = [0,1,2,3].map(row => toState[activeCol * 4 + row]);
  const colDone     = mixedCols.includes(activeCol);

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>

      <div style={{ position: 'relative', flexShrink: 0 }}>
        
        <motion.div
          animate={{
            left: 14 + activeCol * STEP,
            opacity: 0.9,
            boxShadow: waiting
              ? ['0 0 18px color-mix(in srgb, var(--accent-green) 28%, transparent)', '0 0 38px color-mix(in srgb, var(--accent-green) 58%, transparent)', '0 0 18px color-mix(in srgb, var(--accent-green) 28%, transparent)']
              : '0 0 18px color-mix(in srgb, var(--accent-green) 28%, transparent)',
          }}
          transition={{
            left: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
            boxShadow: { repeat: waiting ? Infinity : 0, duration: 1.3 },
          }}
          style={{
            position: 'absolute', top: 14, width: CELL, bottom: 14,
            background: 'color-mix(in srgb, var(--accent-green) 14%, transparent)',
            border: '1.5px solid color-mix(in srgb, var(--accent-green) 50%, transparent)',
            pointerEvents: 'none', zIndex: 5,
          }}
        />

        <div style={{
          display: 'grid', gridTemplateColumns: `repeat(4, ${CELL}px)`,
          gap: GAP, padding: 14,
          background: 'var(--bg-card2)', border: '2px solid var(--border)',
          position: 'relative', zIndex: 1,
        }}>
          {cells.map(({ value, row, col, displayIdx }) => {
            const isActiveCol = col === activeCol;
            const isMixed     = mixedCols.includes(col);
            return (
              <motion.div
                key={`${row}-${col}`}
                className="state-cell"
                animate={{
                  background: isActiveCol
                    ? 'color-mix(in srgb, var(--accent-green) 10%, var(--bg-card2))'
                    : 'var(--bg-card2)',
                  borderColor: isActiveCol
                    ? 'color-mix(in srgb, var(--accent-green) 55%, var(--border))'
                    : isMixed
                      ? 'color-mix(in srgb, var(--accent-green) 25%, var(--border))'
                      : 'var(--border)',
                }}
                transition={{ duration: 0.3 }}
              >
                <AnimatePresence mode="wait">
                  <motion.span
                    key={`${col}-${row}-${value}`}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.22, delay: isMixed ? row * 0.04 : 0 }}
                    style={{
                      fontFamily: 'Share Tech Mono, monospace', fontSize: 22, fontWeight: 700,
                      color: isActiveCol ? 'var(--accent-green)'
                           : isMixed ? 'color-mix(in srgb, var(--accent-green) 55%, var(--text))'
                           : 'var(--text)',
                    }}
                  >{hex2(value)}</motion.span>
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: GAP, padding: '4px 14px 0' }}>
          {[0,1,2,3].map(c => (
            <div key={c} style={{ width: CELL, display: 'flex', justifyContent: 'center' }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%', transition: 'background 0.3s',
                background: mixedCols.includes(c)
                  ? 'var(--accent-green)'
                  : c === activeCol ? 'var(--accent)' : 'var(--border)',
              }} />
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeCol}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.25 }}
          style={{
            flex: 1, minWidth: 220,
            background: 'color-mix(in srgb, var(--accent-green) 5%, var(--bg-card))',
            border: '1.5px solid color-mix(in srgb, var(--accent-green) 30%, var(--border))',
            padding: '12px',
          }}
        >
          
          <div style={{
            fontFamily: 'Orbitron, monospace', fontSize: 9, fontWeight: 700,
            color: 'var(--accent-green)', letterSpacing: 2, marginBottom: 10,
          }}>
            COLUMN {activeCol} × INV MDS{waiting && manualMode ? ' — ▸ CONFIRM' : ''}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 26px)', gap: 2 }}>
              {INV_MDS.flat().map((v, i) => (
                <div key={i} style={{
                  width: 26, height: 22,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Share Tech Mono, monospace', fontSize: 9, fontWeight: 700,
                  color: 'var(--accent-green)',
                  background: 'color-mix(in srgb, var(--accent-green) 8%, var(--bg-card2))',
                  border: '1px solid color-mix(in srgb, var(--accent-green) 25%, var(--border))',
                }}>{v.toString(16)}</div>
              ))}
            </div>
            <span style={{ color: 'var(--text-3)', fontSize: 16, fontFamily: 'serif' }}>×</span>
            
            <div style={{ display: 'grid', gridTemplateColumns: '34px', gap: 2 }}>
              {colBytes.map((b, i) => (
                <div key={i} style={{
                  width: 34, height: 22,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Share Tech Mono, monospace', fontSize: 10, fontWeight: 700,
                  color: 'var(--accent)',
                  background: 'color-mix(in srgb, var(--accent) 8%, var(--bg-card2))',
                  border: '1px solid color-mix(in srgb, var(--accent) 30%, var(--border))',
                }}>{hex2(b)}</div>
              ))}
            </div>
            <span style={{ color: 'var(--text-3)', fontSize: 16 }}>=</span>
            
            <div style={{ display: 'grid', gridTemplateColumns: '34px', gap: 2 }}>
              {resultBytes.map((b, i) => (
                <motion.div key={i}
                  animate={{ opacity: colDone ? 1 : 0.28 }}
                  style={{
                    width: 34, height: 22,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Share Tech Mono, monospace', fontSize: 10, fontWeight: 900,
                    color: 'var(--accent-green)',
                    background: 'color-mix(in srgb, var(--accent-green) 10%, var(--bg-card2))',
                    border: '1px solid color-mix(in srgb, var(--accent-green) 40%, var(--border))',
                  }}
                >{hex2(b)}</motion.div>
              ))}
            </div>
          </div>

          <div style={{
            background: 'color-mix(in srgb, var(--accent-green) 3%, var(--bg-card2))',
            border: '1px solid color-mix(in srgb, var(--accent-green) 20%, var(--border))',
            padding: '8px 10px', marginBottom: 8,
          }}>
            <div style={{
              fontFamily: 'Orbitron, monospace', fontSize: 7, color: 'var(--text-3)',
              letterSpacing: 2, marginBottom: 6,
            }}>GF(2⁸) PRODUCTS</div>

            {INV_MDS.map((mRow, i) => {
              const { products, result } = computeRow(mRow, colBytes);
              const isActiveRow = i === mathRow;
              return (
                <motion.div
                  key={i}
                  animate={{
                    background: isActiveRow
                      ? 'color-mix(in srgb, var(--accent-green) 8%, transparent)'
                      : 'transparent',
                  }}
                  transition={{ duration: 0.2 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 3,
                    marginBottom: 4, padding: '2px 4px', flexWrap: 'wrap',
                  }}
                >
                  
                  <span style={{
                    fontFamily: 'Share Tech Mono, monospace', fontSize: 9,
                    color: colDone ? 'var(--accent-green)' : 'var(--text-3)',
                    width: 18, flexShrink: 0, fontWeight: 700,
                  }}>s'{i}</span>
                  <span style={{ color: 'var(--text-3)', fontSize: 9 }}>=</span>

                  {products.map((p, j) => (
                    <span key={j} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <span style={{
                        fontFamily: 'Share Tech Mono, monospace', fontSize: 9,
                        color: 'var(--accent-green)', opacity: 0.7,
                      }}>{mRow[j].toString(16)}·</span>
                      <span style={{
                        fontFamily: 'Share Tech Mono, monospace', fontSize: 9,
                        color: 'var(--accent)',
                      }}>{hex2(colBytes[j])}</span>
                      <span style={{
                        fontFamily: 'Share Tech Mono, monospace', fontSize: 9,
                        color: 'var(--text-3)',
                      }}>={' '}</span>
                      <span style={{
                        fontFamily: 'Share Tech Mono, monospace', fontSize: 9,
                        color: 'var(--accent-warn)', fontWeight: 700,
                      }}>{hex2(p)}</span>
                      {j < 3 && <span style={{ color: 'var(--text-3)', fontSize: 9, margin: '0 1px' }}>⊕</span>}
                    </span>
                  ))}

                  <span style={{ color: 'var(--text-3)', fontSize: 9 }}>=</span>
                  <motion.span
                    animate={{
                      opacity: colDone ? 1 : 0.35,
                      color: colDone ? 'var(--accent-green)' : 'var(--text-3)',
                    }}
                    style={{
                      fontFamily: 'Share Tech Mono, monospace', fontSize: 10, fontWeight: 900,
                    }}
                  >{hex2(result)}</motion.span>
                </motion.div>
              );
            })}
          </div>

          <div style={{
            fontFamily: 'Share Tech Mono, monospace', fontSize: 9,
            color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 8,
          }}>
            All ops in GF(2⁸) mod x⁸+x⁴+x³+x+1
          </div>

          <div style={{
            fontFamily: 'Orbitron, monospace', fontSize: 8, color: 'var(--text-3)', letterSpacing: 1,
          }}>
            MIXING: {mixedCols.length}/4 columns{waiting && manualMode ? ' — WAITING FOR CONFIRM' : ' complete'}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
