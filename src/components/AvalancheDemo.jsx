import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';

async function sha256hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

function diffBits(a, b) {
  let count = 0;
  for (let i = 0; i < a.length; i++) {
    let xor = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (xor) { count += xor & 1; xor >>= 1; }
  }
  return count;
}

function HashRow({ label, hash, compare, color }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontFamily:'var(--font-display)',fontSize:8,color:'var(--text-2)',letterSpacing:2,marginBottom:6 }}>
        {label}
      </div>
      <div style={{ display:'flex',flexWrap:'wrap',gap:1 }}>
        {hash.split('').map((ch, i) => {
          const differs = compare[i] !== ch;
          return (
            <motion.span
              key={i}
              animate={{ backgroundColor: differs ? 'rgba(255,34,85,0.35)' : 'rgba(0,15,30,0.8)' }}
              transition={{ duration: 0.3, delay: i * 0.004 }}
              style={{
                fontFamily:'var(--font-mono)',fontSize:11,
                padding:'1px 2px',
                color: differs ? '#ff8899' : 'var(--text-2)',
                border: '1px solid transparent',
                borderColor: differs ? 'rgba(255,34,85,0.3)' : 'transparent',
              }}
            >
              {ch}
            </motion.span>
          );
        })}
      </div>
    </div>
  );
}

export default function AvalancheDemo() {
  const [inputA, setInputA] = useState('Hello World! AES');
  const [inputB, setInputB] = useState('hello World! AES');
  const [hashA, setHashA] = useState('');
  const [hashB, setHashB] = useState('');
  const [diff, setDiff] = useState(null);
  const [loading, setLoading] = useState(false);

  const compute = useCallback(async () => {
    setLoading(true);
    const [a, b] = await Promise.all([sha256hex(inputA), sha256hex(inputB)]);
    setHashA(a); setHashB(b);
    setDiff(diffBits(a, b));
    setLoading(false);
  }, [inputA, inputB]);

  return (
    <div style={{ background:'var(--bg-card)',border:'1px solid var(--border-2)',overflow:'hidden' }}>
      <div className="panel-header">
        <div className="panel-header-dot" />
        Avalanche Effect — SHA-256
      </div>
      <div style={{ padding:'20px', display:'flex',flexDirection:'column',gap:16 }}>
        <p style={{ fontFamily:'var(--font-ui)',fontSize:13,color:'var(--text-2)',lineHeight:1.7 }}>
          The Avalanche Effect demonstrates that a single bit change in the input produces a completely different hash.
          Ideal behaviour: ~50% of output bits change.
        </p>

        <div style={{ display:'flex',gap:12,flexWrap:'wrap' }}>
          {[
            { label:'INPUT A', value:inputA, setter:setInputA, color:'var(--cyan)' },
            { label:'INPUT B', value:inputB, setter:setInputB, color:'var(--red)' },
          ].map(({ label, value, setter, color }) => (
            <div key={label} style={{ flex:'1 1 200px' }}>
              <div style={{ fontFamily:'var(--font-display)',fontSize:8,letterSpacing:2,color:'var(--text-2)',marginBottom:6 }}>{label}</div>
              <input
                value={value}
                onChange={e => setter(e.target.value)}
                style={{
                  width:'100%', background:'var(--bg-input)',
                  border:'1px solid var(--border-2)', color,
                  fontFamily:'var(--font-mono)',fontSize:13,
                  padding:'8px 10px',outline:'none',
                  borderRadius:0,
                  transition:'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = color}
                onBlur={e => e.target.style.borderColor = 'var(--border-2)'}
              />
            </div>
          ))}
        </div>

        <button className="btn-cyber btn-cyber-solid" onClick={compute} disabled={loading}
          style={{ alignSelf:'flex-start', padding:'10px 24px' }}>
          {loading ? '◌ COMPUTING…' : '⟳ COMPUTE HASHES'}
        </button>

        {hashA && hashB && (
          <motion.div initial={{ opacity:0,y:10 }} animate={{ opacity:1,y:0 }} style={{ display:'flex',flexDirection:'column',gap:8 }}>
            <HashRow label="SHA-256(A)" hash={hashA} compare={hashB} color="var(--cyan)" />
            <HashRow label="SHA-256(B)" hash={hashB} compare={hashA} color="var(--red)" />

            <motion.div
              initial={{ scale:0.95 }} animate={{ scale:1 }}
              style={{
                padding:'14px 18px',
                background:'rgba(255,34,85,0.06)',
                border:'1px solid rgba(255,34,85,0.3)',
                display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',
                boxShadow:'0 0 20px rgba(255,34,85,0.08)',
              }}
            >
              <div>
                <div style={{ fontFamily:'var(--font-display)',fontSize:9,color:'var(--red)',letterSpacing:2,marginBottom:2 }}>
                  BIT DIFFERENCE
                </div>
                <div style={{ fontFamily:'var(--font-display)',fontSize:28,color:'var(--text-1)',lineHeight:1 }}>
                  {diff}
                  <span style={{ fontSize:14,color:'var(--text-2)',marginLeft:4 }}>/ 256 bits</span>
                </div>
              </div>
              <div style={{ borderLeft:'1px solid rgba(255,34,85,0.2)',paddingLeft:12 }}>
                <div style={{ fontFamily:'var(--font-display)',fontSize:9,color:'var(--text-2)',letterSpacing:2,marginBottom:2 }}>
                  CHANGE RATE
                </div>
                <div style={{ fontFamily:'var(--font-display)',fontSize:28,color: Math.abs(diff/256 - 0.5) < 0.1 ? 'var(--green)' : 'var(--amber)', lineHeight:1 }}>
                  {Math.round((diff / 256) * 100)}%
                </div>
              </div>
              <p style={{ fontFamily:'var(--font-ui)',fontSize:12,color:'var(--text-2)',flex:1,minWidth:180,lineHeight:1.6 }}>
                {Math.round((diff / 256) * 100)}% of all output bits flipped from a single character change.
                Ideal Avalanche: 50%. Demonstrates cryptographic unpredictability.
              </p>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
