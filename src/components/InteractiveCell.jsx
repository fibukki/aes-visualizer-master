import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { hex2 } from '../animations/shared';

/**
 * A state cell that:
 *  • renders the byte
 *  • shows a rich tooltip on hover (hex · dec · bin · ASCII · S-box position)
 *  • can be "pinned" by clicking
 *
 * Drop-in replacement for any 4×4 cell in the visualizer.
 */
export default function InteractiveCell({
  value, row, col, opClass = '', pinned = false, onPin,
  size = 72, fontSize = 22,
  pulseKey = 0,
}) {
  const [hover, setHover] = useState(false);
  const ref = useRef(null);
  const show = hover || pinned;

  const dec  = (value ?? 0) & 0xff;
  const hex  = hex2(dec);
  const bin  = dec.toString(2).padStart(8, '0');
  const ascii = dec >= 0x20 && dec < 0x7f ? String.fromCharCode(dec) : '·';
  const sbHi = (dec >> 4) & 0xf;
  const sbLo = dec & 0xf;

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onPin?.(row, col)}
      className={`state-cell ${opClass} ${pinned ? 'pinned' : ''}`}
      style={{
        width: size, height: size,
        cursor: 'pointer',
        position: 'relative',
        outline: pinned ? '2px solid var(--accent-hl)' : 'none',
        outlineOffset: pinned ? -2 : 0,
        zIndex: show ? 5 : 1,
      }}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={`${hex}-${pulseKey}`}
          initial={{ opacity: 0.35, y: 8, scale: 0.88 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0.2, y: -8, scale: 0.86 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          style={{
            fontFamily: 'Share Tech Mono, monospace',
            fontSize, fontWeight: 700,
          }}
        >
          {hex}
        </motion.span>
      </AnimatePresence>

      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.14 }}
            style={{
              position: 'absolute',
              top: '100%', left: '50%',
              transform: 'translateX(-50%)',
              marginTop: 8,
              minWidth: 200,
              background: 'var(--bg-card)',
              border: `2px solid ${pinned ? 'var(--accent-hl)' : 'var(--accent)'}`,
              boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
              padding: '10px 12px',
              zIndex: 50,
              pointerEvents: 'none',
              fontFamily: 'Share Tech Mono, monospace',
              textAlign: 'left',
            }}
          >
            <div style={{
              fontFamily: 'Orbitron, monospace', fontSize: 8, fontWeight: 800,
              letterSpacing: 2, color: pinned ? 'var(--accent-hl)' : 'var(--accent)',
              marginBottom: 6,
              borderBottom: '1px solid var(--border-2)', paddingBottom: 4,
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span>BYTE [R{row} · C{col}]</span>
              {pinned && <span style={{ color: 'var(--accent-hl)' }}>⌖ PINNED</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', fontSize: 11, color: 'var(--text-2)' }}>
              <span style={{ color: 'var(--text-3)' }}>HEX</span>
              <span style={{ color: 'var(--accent)', fontWeight: 800 }}>0x{hex}</span>

              <span style={{ color: 'var(--text-3)' }}>DEC</span>
              <span style={{ color: 'var(--text)' }}>{dec}</span>

              <span style={{ color: 'var(--text-3)' }}>BIN</span>
              <span style={{ color: 'var(--accent-warn)', letterSpacing: 0.5 }}>{bin}</span>

              <span style={{ color: 'var(--text-3)' }}>ASCII</span>
              <span style={{ color: 'var(--accent-green)' }}>'{ascii}'</span>

              <span style={{ color: 'var(--text-3)' }}>S-box</span>
              <span style={{ color: 'var(--text)' }}>row {sbHi.toString(16).toUpperCase()} · col {sbLo.toString(16).toUpperCase()}</span>
            </div>

            {!pinned && (
              <div style={{
                marginTop: 8, paddingTop: 6,
                borderTop: '1px dashed var(--border-2)',
                fontSize: 9, color: 'var(--text-dim)', letterSpacing: 1, textAlign: 'center',
              }}>
                Click to pin
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
