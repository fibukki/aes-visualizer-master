import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { expandKey } from '../aes';

const SBOX_PARTIAL = (() => {

  
  const s = new Uint8Array(256);
  const inv = new Uint8Array(256);
  
  let p = 1, q = 1;
  do {
    p = p ^ (p << 1) ^ (p & 0x80 ? 0x1b : 0);
    p &= 0xff;
    q ^= q << 1; q ^= q << 2; q ^= q << 4;
    if (q & 0x80) q ^= 0x09;
    q &= 0xff;
    inv[p] = q;
  } while (p !== 1);
  inv[0] = 0;
  for (let i = 0; i < 256; i++) {
    const x = inv[i];
    const v = x ^ ((x << 1) | (x >> 7)) ^ ((x << 2) | (x >> 6)) ^
              ((x << 3) | (x >> 5)) ^ ((x << 4) | (x >> 4));
    s[i] = (v & 0xff) ^ 0x63;
  }
  return s;
})();

const RCON = [0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36];

function ByteBox({ value, label, accent = 'var(--accent)', glow = false, small = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      {label && (
        <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 7, color: 'var(--text-3)', letterSpacing: 1 }}>
          {label}
        </span>
      )}
      <motion.div
        animate={{
          borderColor: glow ? accent : 'var(--border)',
          background: glow
            ? `color-mix(in srgb, ${accent} 15%, var(--bg-card2))`
            : 'var(--bg-card2)',
          boxShadow: glow ? `0 0 10px color-mix(in srgb, ${accent} 40%, transparent)` : 'none',
        }}
        transition={{ duration: 0.25 }}
        style={{
          width: small ? 32 : 40, height: small ? 26 : 32,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1.5px solid var(--border)',
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: small ? 10 : 13, fontWeight: 700,
          color: glow ? accent : 'var(--text)',
        }}
      >
        {value.toString(16).padStart(2,'0').toUpperCase()}
      </motion.div>
    </div>
  );
}

export default function KeyExpandAnim({ keyBytes, round }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    setPhase(0);
    const timers = [1,2,3,4,5].map((p, i) =>
      setTimeout(() => setPhase(p), 900 + i * 900)
    );
    return () => timers.forEach(clearTimeout);
  }, [round, keyBytes]);

  const roundKeys = expandKey(keyBytes);
  const Nr = roundKeys.length - 1;
  const r = Math.max(1, Math.min(Nr, round));
  const prevRK    = roundKeys[r - 1];
  const thisRK    = roundKeys[r];

  const wLast = [prevRK[12], prevRK[13], prevRK[14], prevRK[15]];
  
  const wFirst = [prevRK[0], prevRK[1], prevRK[2], prevRK[3]];

  const wRot = [wLast[1], wLast[2], wLast[3], wLast[0]];
  
  const wSub = wRot.map(b => SBOX_PARTIAL[b]);
  
  const wRcon = [...wSub];
  wRcon[0] ^= RCON[r - 1];
  
  const wResult = wRcon.map((b, i) => b ^ wFirst[i]);

  const STEP_LABELS = [
    'W[4r−1]: LAST WORD OF PREV KEY',
    'ROTWORD: CYCLIC LEFT ROTATE',
    'SUBWORD: SBOX SUBSTITUTION',
    `XOR WITH RCON[${r-1}] = 0x${RCON[r-1].toString(16).padStart(2,'0').toUpperCase()}`,
    `XOR WITH W[${(r-1)*4}] → NEW W[${r*4}]`,
    '✓ FIRST WORD OF ROUND KEY DERIVED',
  ];

  const ACCENT_PER_PHASE = [
    'var(--accent-warn)', 'var(--accent)', 'var(--accent-hl)',
    'var(--accent-warn)', 'var(--accent-green)', 'var(--accent-green)',
  ];

  const displayWord = (
    phase === 0 ? wLast  :
    phase === 1 ? wRot   :
    phase === 2 ? wSub   :
    phase === 3 ? wRcon  : wResult
  );

  const accent = ACCENT_PER_PHASE[phase];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          style={{
            fontFamily: 'Orbitron, monospace', fontSize: 9, fontWeight: 700,
            color: accent, letterSpacing: 2, textAlign: 'center',
          }}
        >
          {STEP_LABELS[phase]}
        </motion.div>
      </AnimatePresence>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
          <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 7, color: 'var(--text-3)', letterSpacing: 1 }}>
            W[{(r-1)*4+3}]
          </span>
          {(phase === 1 ? wRot : wLast).map((b, i) => {
            
            const isRotated = phase === 1 && i === 3;
            const isMoved   = phase === 1 && i < 3;
            return (
              <motion.div
                key={i}
                animate={{
                  borderColor: phase >= 1 && i === 3 ? 'var(--accent)' : 'var(--border)',
                  background: isRotated
                    ? 'color-mix(in srgb, var(--accent) 15%, var(--bg-card2))'
                    : 'var(--bg-card2)',
                }}
                transition={{ duration: 0.3 }}
                style={{
                  width: 40, height: 32,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1.5px solid var(--border)',
                  fontFamily: 'Share Tech Mono, monospace', fontSize: 13, fontWeight: 700,
                  color: isRotated ? 'var(--accent)' : 'var(--text)',
                  boxSizing: 'border-box',
                }}
              >
                {b.toString(16).padStart(2,'0').toUpperCase()}
              </motion.div>
            );
          })}
        </div>

        {phase >= 1 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ paddingTop: 58, color: 'var(--accent)', fontSize: 18, fontWeight: 900 }}
          >→</motion.div>
        )}

        {phase >= 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
            <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 7, color: 'var(--accent-hl)', letterSpacing: 1 }}>
              SBOX
            </span>
            {wSub.map((b, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06, type: 'spring', stiffness: 300 }}
                style={{
                  width: 40, height: 32,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1.5px solid color-mix(in srgb, var(--accent-hl) 50%, var(--border))',
                  background: 'color-mix(in srgb, var(--accent-hl) 10%, var(--bg-card2))',
                  fontFamily: 'Share Tech Mono, monospace', fontSize: 13, fontWeight: 700,
                  color: 'var(--accent-hl)', boxSizing: 'border-box',
                }}
              >{b.toString(16).padStart(2,'0').toUpperCase()}</motion.div>
            ))}
          </div>
        )}

        {phase >= 3 && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ paddingTop: 58, color: 'var(--accent-warn)', fontSize: 16, fontWeight: 900 }}
            >⊕</motion.div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
              <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 7, color: 'var(--accent-warn)', letterSpacing: 1 }}>
                RCON[{r-1}]
              </span>
              {[RCON[r-1], 0, 0, 0].map((b, i) => (
                <div key={i} style={{
                  width: 40, height: 32,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1.5px solid ${i === 0 ? 'color-mix(in srgb, var(--accent-warn) 55%, var(--border))' : 'var(--border)'}`,
                  background: i === 0 ? 'color-mix(in srgb, var(--accent-warn) 12%, var(--bg-card2))' : 'var(--bg-card2)',
                  fontFamily: 'Share Tech Mono, monospace', fontSize: 13, fontWeight: i === 0 ? 700 : 400,
                  color: i === 0 ? 'var(--accent-warn)' : 'var(--text-dim)',
                  boxSizing: 'border-box',
                }}>{b.toString(16).padStart(2,'0').toUpperCase()}</div>
              ))}
            </div>
          </>
        )}

        {phase >= 4 && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ paddingTop: 58, color: 'var(--accent)', fontSize: 16, fontWeight: 900 }}
            >⊕</motion.div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
              <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 7, color: 'var(--accent)', letterSpacing: 1 }}>
                W[{(r-1)*4}]
              </span>
              {wFirst.map((b, i) => (
                <div key={i} style={{
                  width: 40, height: 32,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1.5px solid color-mix(in srgb, var(--accent) 45%, var(--border))',
                  background: 'color-mix(in srgb, var(--accent) 8%, var(--bg-card2))',
                  fontFamily: 'Share Tech Mono, monospace', fontSize: 13, fontWeight: 700,
                  color: 'var(--accent)', boxSizing: 'border-box',
                }}>{b.toString(16).padStart(2,'0').toUpperCase()}</div>
              ))}
            </div>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ paddingTop: 58, color: 'var(--text-3)', fontSize: 16 }}
            >=</motion.div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
              <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 7, color: 'var(--accent-green)', letterSpacing: 1 }}>
                W[{r*4}]
              </span>
              {wResult.map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.07, type: 'spring', stiffness: 280 }}
                  style={{
                    width: 40, height: 32,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1.5px solid color-mix(in srgb, var(--accent-green) 55%, var(--border))',
                    background: 'color-mix(in srgb, var(--accent-green) 12%, var(--bg-card2))',
                    fontFamily: 'Share Tech Mono, monospace', fontSize: 13, fontWeight: 700,
                    color: 'var(--accent-green)', boxSizing: 'border-box',
                  }}
                >{b.toString(16).padStart(2,'0').toUpperCase()}</motion.div>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
        {[0,1,2,3,4].map(i => (
          <motion.div
            key={i}
            animate={{
              background: i < phase ? 'var(--accent-green)' : i === phase ? accent : 'var(--border)',
              scale: i === phase ? 1.3 : 1,
            }}
            transition={{ duration: 0.2 }}
            style={{ width: 8, height: 8, borderRadius: '50%' }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{
            padding: '8px 12px',
            background: `color-mix(in srgb, ${accent} 5%, var(--bg-card))`,
            border: `1px solid color-mix(in srgb, ${accent} 25%, var(--border))`,
            fontFamily: 'Exo 2, sans-serif', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6,
          }}
        >
          {phase === 0 && 'The last 4-byte word of round key r−1 is taken as input for the key schedule.'}
          {phase === 1 && 'RotWord rotates bytes cyclically: [b0, b1, b2, b3] → [b1, b2, b3, b0]. This prevents aligned byte patterns.'}
          {phase === 2 && 'SubWord applies the AES S-Box to each byte independently. This provides non-linearity in the key schedule.'}
          {phase === 3 && `XOR with RCON (round constant 0x${RCON[r-1].toString(16).padStart(2,'0').toUpperCase()}) ensures each round key is unique and prevents related-key attacks.`}
          {phase === 4 && 'Final XOR with the first word of the previous round key derives W[4r] — the first word of the new round key.'}
          {phase === 5 && 'All 4 words are derived similarly. The round keys are mathematically linked but appear pseudo-random — that\'s the key schedule\'s purpose.'}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
