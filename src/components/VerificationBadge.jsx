import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

async function verifyWithCryptoJS(plainBytes, keyBytes) {
  // Dynamically import crypto‑js (must be installed: npm install crypto-js)
  const CryptoJS = await import('crypto-js');
  const keyHex = CryptoJS.enc.Hex.parse(keyBytes.map(b => b.toString(16).padStart(2,'0')).join(''));
  const plainHex = CryptoJS.enc.Hex.parse(plainBytes.map(b => b.toString(16).padStart(2,'0')).join(''));
  const encrypted = CryptoJS.AES.encrypt(plainHex, keyHex, { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.NoPadding });
  return encrypted.ciphertext.toString().toUpperCase();
}

export default function VerificationBadge({ open, onClose, keyBytes, plainBytes }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function verify() {
    setLoading(true);
    try {
      const externalCipher = await verifyWithCryptoJS(plainBytes, keyBytes);
      const { encrypt } = await import('../aes');
      const internalCipher = encrypt(plainBytes, keyBytes).map(b => b.toString(16).padStart(2,'0')).join('').toUpperCase();
      const match = externalCipher === internalCipher;
      setResult({ match, externalCipher, internalCipher });
    } catch (err) {
      setResult({ match: false, error: err.message });
    }
    setLoading(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, background: 'color-mix(in srgb, #000 65%, transparent)',
            backdropFilter: 'blur(3px)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg-card)', border: '2px solid var(--accent)', borderRadius: 12, maxWidth: 500, width: '90%', padding: 24 }}
          >
            <h3 style={{ fontFamily: 'Crimson Pro', fontSize: 24, marginBottom: 8 }}>AES-256-ECB Verification</h3>
            <p style={{ marginBottom: 16, color: 'var(--text-2)' }}>
              This uses <strong>CryptoJS</strong> (industry standard) to encrypt the same plaintext with the same key.
              Compare with our visualizer's encryption result.
            </p>
            {!result && !loading && (
              <button className="btn btn-filled" onClick={verify} style={{ width: '100%' }}>Verify now</button>
            )}
            {loading && <p>Verifying using CryptoJS...</p>}
            {result && !result.error && (
              <div>
                <div style={{ background: 'var(--bg-card2)', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                  <div className="eyebrow">External (CryptoJS)</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>{result.externalCipher}</div>
                  <div className="eyebrow" style={{ marginTop: 8 }}>Internal (our AES)</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>{result.internalCipher}</div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: result.match ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {result.match ? '✓ MATCH — Implementation is correct!' : '✗ MISMATCH — Something is wrong.'}
                </div>
                {!result.match && <p className="upgrade-muted">Check key length, padding or block mode.</p>}
              </div>
            )}
            {result?.error && <p style={{ color: 'var(--accent-red)' }}>Error: {result.error}</p>}
            <button className="btn-control" onClick={onClose} style={{ marginTop: 20, width: '100%' }}>Close</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}