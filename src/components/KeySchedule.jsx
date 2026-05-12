import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { expandKey } from '../aes';
import KeyExpandAnim from '../animations/KeyExpandAnim';

function WordBox({ bytes, label, highlight }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        padding: '6px 8px',
        border: `1px solid ${highlight ? 'color-mix(in srgb, var(--accent-warn) 55%, var(--border))' : 'var(--border)'}`,
        background: highlight
          ? 'color-mix(in srgb, var(--accent-warn) 8%, var(--bg-card2))'
          : 'var(--bg-card2)',
        boxShadow: highlight ? '0 0 10px color-mix(in srgb, var(--accent-warn) 15%, transparent)' : 'none',
        transition: 'all 0.3s',
      }}
    >
      <span style={{
        fontFamily: 'Orbitron, monospace', fontSize: 7, letterSpacing: 1,
        color: highlight ? 'var(--accent-warn)' : 'var(--text-3)',
      }}>{label}</span>
      <div style={{ display: 'flex', gap: 2 }}>
        {bytes.map((b, i) => (
          <span key={i} style={{
            fontFamily: 'Share Tech Mono, monospace', fontSize: 11,
            color: highlight ? 'var(--accent-warn)' : 'var(--text)',
            background: 'var(--bg-card2)',
            padding: '1px 3px',
            border: '1px solid var(--border-2)',
          }}>
            {b.toString(16).padStart(2,'0').toUpperCase()}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

export default function KeySchedule({ keyBytes, activeRound }) {
  const roundKeys = expandKey(keyBytes);
  const [expandRound, setExpandRound] = useState(null);
  const [animKey, setAnimKey] = useState(0);

  function showExpansion(r) {
    if (expandRound === r) {
      setExpandRound(null);
    } else {
      setExpandRound(r);
      setAnimKey(k => k + 1); 
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflow: 'auto' }}>

      <AnimatePresence>
        {expandRound !== null && (
          <motion.div
            key={`anim-${expandRound}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              padding: '16px',
              background: 'color-mix(in srgb, var(--accent-green) 4%, var(--bg-card2))',
              border: '1.5px solid color-mix(in srgb, var(--accent-green) 30%, var(--border))',
              marginBottom: 12,
            }}>
              <div style={{
                fontFamily: 'Orbitron, monospace', fontSize: 9, fontWeight: 700,
                color: 'var(--accent-green)', letterSpacing: 2, marginBottom: 12,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                KEY EXPANSION — ROUND {expandRound}
                <button
                  onClick={() => setExpandRound(null)}
                  style={{
                    fontFamily: 'Orbitron, monospace', fontSize: 8, letterSpacing: 1,
                    background: 'transparent', border: '1px solid var(--border)',
                    color: 'var(--text-3)', cursor: 'pointer', padding: '3px 8px',
                  }}
                >✕ CLOSE</button>
              </div>
              <KeyExpandAnim key={animKey} keyBytes={keyBytes} round={expandRound} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {roundKeys.map((rk, r) => {
        const words  = [rk.slice(0,4), rk.slice(4,8), rk.slice(8,12), rk.slice(12,16)];
        const isActive = r === activeRound;
        const canExpand = r >= 1; 
        return (
          <motion.div
            key={r}
            animate={{ opacity: isActive ? 1 : 0.5, scale: isActive ? 1.01 : 1 }}
            transition={{ duration: 0.3 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <span style={{
              fontFamily: 'Share Tech Mono, monospace', fontSize: 10,
              width: 52, flexShrink: 0,
              color: isActive ? 'var(--accent-warn)' : 'var(--text-2)',
              fontWeight: isActive ? 700 : 400,
            }}>RK[{r}]</span>

            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1 }}>
              {words.map((w, wi) => (
                <WordBox key={wi} bytes={w} label={`W${r*4+wi}`} highlight={isActive} />
              ))}
            </div>

            {canExpand && (
              <button
                onClick={() => showExpansion(r)}
                title={`Animate derivation of RK[${r}]`}
                style={{
                  fontFamily: 'Orbitron, monospace', fontSize: 7, letterSpacing: 1,
                  background: expandRound === r
                    ? 'color-mix(in srgb, var(--accent-green) 15%, var(--bg-card2))'
                    : 'transparent',
                  border: `1px solid ${expandRound === r ? 'var(--accent-green)' : 'var(--border-2)'}`,
                  color: expandRound === r ? 'var(--accent-green)' : 'var(--text-3)',
                  cursor: 'pointer', padding: '3px 7px', flexShrink: 0,
                  transition: 'all 0.2s',
                }}
              >
                {expandRound === r ? '▲' : '▶'} DERIVE
              </button>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
