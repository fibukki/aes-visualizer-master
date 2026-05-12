import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

const KEYS = [
  { group: 'PLAYBACK', items: [
    { key: 'Space',     desc: 'Play / Pause auto-play' },
    { key: '→  /  Enter', desc: 'Next step · Confirm sub-step · Skip animation' },
    { key: '←',          desc: 'Previous step' },
    { key: 'R',          desc: 'Reset visualizer' },
  ]},
  { group: 'MODES', items: [
    { key: 'M', desc: 'Toggle Manual / Auto step mode' },
    { key: '1', desc: 'Switch to AES-128' },
    { key: '2', desc: 'Switch to AES-256' },
    { key: 'T', desc: 'Toggle Dark / Light theme' },
  ]},
  { group: 'NAVIGATION', items: [
    { key: 'D', desc: 'Open DECRYPT tab' },
    { key: 'E', desc: 'Open ENCRYPT tab' },
    { key: 'K', desc: 'Open KEY SCHEDULE tab' },
    { key: 'A', desc: 'Open AVALANCHE tab' },
  ]},
  { group: 'SPEED', items: [
    { key: 'S', desc: 'Slow speed' },
    { key: 'N', desc: 'Normal speed' },
    { key: 'F', desc: 'Fast speed' },
  ]},
  { group: 'HELP', items: [
    { key: '?  /  H', desc: 'Toggle this hotkeys panel' },
    { key: 'Esc',     desc: 'Close this panel' },
  ]},
];

function Kbd({ children }) {
  return (
    <kbd style={{
      fontFamily: 'Share Tech Mono, monospace',
      fontSize: 11, fontWeight: 700,
      padding: '4px 9px',
      background: 'var(--bg-card2)',
      border: '1.5px solid var(--border)',
      borderBottomWidth: 3,
      color: 'var(--text)',
      borderRadius: 4,
      whiteSpace: 'nowrap',
    }}>
      {children}
    </kbd>
  );
}

export default function HotkeysModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.code === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0,
            background: 'color-mix(in srgb, #000 65%, transparent)',
            backdropFilter: 'blur(3px)',
            zIndex: 300,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)',
              border: '2px solid var(--accent)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.55), 0 0 32px color-mix(in srgb, var(--accent) 25%, transparent)',
              maxWidth: 720, width: '100%',
              maxHeight: '85vh', overflow: 'auto',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 22px',
              borderBottom: '1.5px solid var(--border)',
              background: 'color-mix(in srgb, var(--accent) 6%, var(--bg-card))',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22 }}>⌨</span>
                <div>
                  <div style={{
                    fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 900,
                    letterSpacing: 3, color: 'var(--accent)',
                  }}>
                    KEYBOARD SHORTCUTS
                  </div>
                  <div style={{
                    fontFamily: 'Share Tech Mono, monospace', fontSize: 11,
                    color: 'var(--text-3)', marginTop: 2,
                  }}>
                    Press <Kbd>?</Kbd> any time to open · <Kbd>Esc</Kbd> to close
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700,
                  background: 'transparent', border: '1.5px solid var(--border)',
                  color: 'var(--text-2)',
                  padding: '6px 14px', cursor: 'pointer',
                  letterSpacing: 2,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-red)'; e.currentTarget.style.color = 'var(--accent-red)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}
              >✕ CLOSE</button>
            </div>

            <div style={{ padding: '18px 22px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
              {KEYS.map(group => (
                <div key={group.group}>
                  <div style={{
                    fontFamily: 'Orbitron, monospace', fontSize: 9, fontWeight: 800,
                    letterSpacing: 3, color: 'var(--accent-warn)',
                    marginBottom: 10, paddingBottom: 6,
                    borderBottom: '1px solid var(--border-2)',
                  }}>
                    {group.group}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {group.items.map((item, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        gap: 12,
                      }}>
                        <span style={{
                          fontFamily: 'Exo 2, sans-serif', fontSize: 13,
                          color: 'var(--text-2)', flex: 1, lineHeight: 1.4,
                        }}>{item.desc}</span>
                        <Kbd>{item.key}</Kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              padding: '12px 22px',
              borderTop: '1px solid var(--border-2)',
              background: 'color-mix(in srgb, var(--accent-green) 4%, var(--bg-card))',
              fontFamily: 'Share Tech Mono, monospace', fontSize: 11,
              color: 'var(--text-3)', textAlign: 'center', letterSpacing: 1,
            }}>
              Tip: Hover any state cell to inspect its byte (hex · dec · bin · ASCII).
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
