import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AESVisualizer, encrypt, modeFromKey } from './aes';
import AnimCenter from './components/AnimCenter';
import RoundFlow from './components/RoundFlow';
import AlgorithmPanel from './components/AlgorithmPanel';
import KeySchedule from './components/KeySchedule';
import AvalancheDemo from './components/AvalancheDemo';
import ControlBar from './components/ControlBar';
import HotkeysModal from './components/HotkeysModal';
import StepInsight from './components/StepInsight';
import StudentStepInput from './components/StudentStepInput';
import EncryptionDemo from './components/EncryptionDemo';
import VerificationBadge from './components/VerificationBadge';
import './index.css';

function randomBytes(n) { return Array.from(crypto.getRandomValues(new Uint8Array(n))); }
function toHex2(b)       { return b.toString(16).padStart(2,'0').toUpperCase(); }
function toAscii(bytes)  { return bytes.map(b => (b >= 0x20 && b < 0x7f) ? String.fromCharCode(b) : '.').join(''); }

const TABS = [
  { label: 'Decrypt',       hotkey: 'D' },
  { label: 'Encrypt',       hotkey: 'E' },
  { label: 'Key Schedule',  hotkey: 'K' },
  { label: 'Avalanche',     hotkey: 'A' },
];

function opHeadline(op) {
  if (op === 'addRoundKey') return 'ADDROUNDKEY';
  if (op === 'SubBytes') return 'SUBBYTES';
  if (op === 'ShiftRows') return 'SHIFTROWS';
  if (op === 'MixColumns') return 'MIXCOLUMNS';
  if (op === 'final') return 'FINAL PLAINTEXT';
  return 'INITIAL STATE';
}

function opExplanation(op) {
  if (op === 'addRoundKey') return 'XOR each byte with this round key.';
  if (op === 'SubBytes') return 'Replace each byte using the inverse S-Box.';
  if (op === 'ShiftRows') return 'Shift rows to the right: Row1 +1, Row2 +2, Row3 +3.';
  if (op === 'MixColumns') return 'Undo column mixing in GF(2^8).';
  if (op === 'final') return 'All reverse rounds finished; plaintext is restored.';
  return 'Ciphertext is loaded; decryption is ready to start.';
}

// Helper: pad/truncate string to exactly 16 chars (block size)
function normalizePlaintext(str) {
  if (str.length > 16) return str.slice(0, 16);
  return str.padEnd(16, ' ');
}

function SegmentedKeyInput({ keyBytes, onChange }) {
  const refs = useRef([]);
  function handle(i, val) {
    const clean = val.replace(/[^0-9a-fA-F]/g,'').slice(0,2);
    const next = [...keyBytes]; next[i] = parseInt(clean.padEnd(2,'0'),16) || 0;
    onChange(next);
    if (clean.length === 2 && i < keyBytes.length - 1) refs.current[i+1]?.focus();
  }
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
      {keyBytes.map((b,i) => (
        <input key={i} ref={el => refs.current[i]=el} className="hex-seg"
          value={toHex2(b)} onChange={e => handle(i,e.target.value)}
          onFocus={e => e.target.select()} maxLength={2} spellCheck={false} />
      ))}
    </div>
  );
}

function ThemeToggle({ theme, onToggle }) {
  const dark = theme === 'dark';
  return (
    <button className="theme-toggle" onClick={onToggle} title="Toggle theme (T)">
      <span style={{ fontSize: 13 }}>{dark ? '☀' : '☾'}</span>
      <div className={`toggle-track ${dark ? '' : 'on'}`}>
        <div className={`toggle-thumb ${dark ? '' : 'on'}`} />
      </div>
      <span>{dark ? 'Dark' : 'Light'}</span>
    </button>
  );
}

function AesModeSelector({ keyBits, onChange }) {
  const opts = [
    { bits: 128, name: 'AES-128', meta: '16 bytes · 10 rounds', hk: '1' },
    { bits: 256, name: 'AES-256', meta: '32 bytes · 14 rounds', hk: '2' },
  ];
  return (
    <div role="radiogroup" aria-label="AES variant"
      style={{ display: 'flex', boxShadow: 'var(--shadow)', borderRadius: 8 }}>
      {opts.map(o => {
        const active = keyBits === o.bits;
        return (
          <button
            key={o.bits}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.bits)}
            title={`Switch to ${o.name} — press ${o.hk}`}
            className={`mode-card ${active ? 'active' : ''}`}
          >
            <span className="mode-name">{o.name}</span>
            <span className="mode-meta">{o.meta}</span>
          </button>
        );
      })}
    </div>
  );
}

function SectionCard({ label, children }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      boxShadow: 'var(--shadow)',
    }}>
      <div style={{
        padding: '12px 16px',
        fontFamily: 'Inter, sans-serif',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--text-3)',
        borderBottom: '1px solid var(--border-2)',
      }}>
        {label}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState('light');
  const [tab, setTab]     = useState(0);

  // ── Key & mode ────────────────────────────────────────────
  // DEFAULT AES-256 (32 bytes)
  const [keyBytes, setKeyBytes] = useState(() => randomBytes(32));
  const keyBits     = useMemo(() => modeFromKey(keyBytes).bits, [keyBytes]);
  const totalRounds = useMemo(() => modeFromKey(keyBytes).Nr,   [keyBytes]);

  const resetRef = useRef(null);

  function setMode(bits) {
    const n = bits === 256 ? 32 : 16;
    if (keyBytes.length !== n) {
      setKeyBytes(randomBytes(n));
      resetRef.current?.();
    }
  }

  // ── Plaintext / ciphertext ────────────────────────────────
  const [plaintextInputRaw, setPlaintextInputRaw] = useState('AES Decrypt Demo');
  // Normalize to exactly 16 characters
  const plainBytes = useMemo(() => {
    const normalized = normalizePlaintext(plaintextInputRaw);
    return Array.from(new TextEncoder().encode(normalized));
  }, [plaintextInputRaw]);
  
  const [inputError, setInputError]     = useState('');
  const [toast, setToast]               = useState(null);

  const [ciphertextMode, setCiphertextMode]         = useState('auto');
  const [customCiphertextHex, setCustomCiphertextHex] = useState('');
  const [ciphertextError, setCiphertextError]       = useState('');
  const [currentCiphertext, setCurrentCiphertext]   = useState(() => encrypt(Array.from(new TextEncoder().encode('AES Decrypt Demo')), randomBytes(32)));

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);

  const getCipher = useCallback(() => encrypt(plainBytes, keyBytes), [plainBytes, keyBytes]);

  useEffect(() => {
    if (ciphertextMode === 'auto') setCurrentCiphertext(getCipher());
  }, [ciphertextMode, getCipher]);

  // ── Visualizer state ──────────────────────────────────────
  const vizRef     = useRef(null);
  const playRef    = useRef(null);
  const confirmRef = useRef(null);

  const [step, setStep]                         = useState(null);
  const [stepIndex, setStepIndex]               = useState(0);
  const [started, setStarted]                   = useState(false);
  const [isPlaying, setIsPlaying]               = useState(false);

  const [speed, setSpeed]                       = useState(2.0);
  const [manualMode, setManualMode]             = useState(false);

  const [displayedState, setDisplayedState]     = useState(null);
  const [previousState, setPreviousState]       = useState(null);
  const [statePulseTick, setStatePulseTick]     = useState(0);
  const [anim, setAnim]                         = useState(null);
  const [animNeedsConfirm, setAnimNeedsConfirm] = useState(false);
  const animBusy = !!anim;

  const [helpOpen, setHelpOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);

  // ── Helpers ───────────────────────────────────────────────
  const showToast = useCallback((msg, type='info', ms=2000) => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), ms);
  }, []);

  const parseCustomCiphertext = useCallback(() => {
    const hex = customCiphertextHex.trim().toUpperCase();
    if (!/^[0-9A-F]{32}$/.test(hex)) {
      setCiphertextError('Must be exactly 32 hex characters (128 bits)');
      return null;
    }
    setCiphertextError('');
    const bytes = [];
    for (let i = 0; i < 32; i += 2) bytes.push(parseInt(hex.substr(i, 2), 16));
    return bytes;
  }, [customCiphertextHex]);

  const initViz = useCallback((customCt = null) => {
    const ct = (ciphertextMode === 'custom' && customCt) ? customCt : getCipher();
    setCurrentCiphertext(ct);
    vizRef.current = new AESVisualizer(ct, keyBytes);
    const first = vizRef.current.current;
    setStep({ ...first });
    setStepIndex(0);
    setDisplayedState([...first.state]);
    setPreviousState(null);
    setStatePulseTick(0);
    setStarted(true);
    setAnim(null);
    setAnimNeedsConfirm(false);
    confirmRef.current = null;
    setIsPlaying(false);
  }, [getCipher, keyBytes, ciphertextMode]);

  const startWithCustomCiphertext = useCallback(() => {
    const ct = parseCustomCiphertext();
    if (ct) initViz(ct);
  }, [parseCustomCiphertext, initViz]);

  const reset = useCallback(() => {
    setIsPlaying(false); setStarted(false);
    setStep(null); setDisplayedState(null);
    setPreviousState(null);
    setStatePulseTick(0);
    setAnim(null); setAnimNeedsConfirm(false);
    confirmRef.current = null; vizRef.current = null;
    showToast('Visualizer reset');
  }, [showToast]);

  resetRef.current = reset;

  // ── Step transitions (skip animation immediately) ─────────
  const triggerNext = useCallback(() => {
    if (!vizRef.current) return;
    const viz = vizRef.current;
    if (viz.currentStep >= viz.totalSteps - 1) return;

    const before = [...viz.current.state];
    const nextStepData = viz.steps[viz.currentStep + 1];
    const toState  = [...nextStepData.state];

    viz.executeNextStep();
    setStepIndex(viz.currentStep);
    setStep({ ...viz.current });
    setAnim(null);
    setPreviousState(before);
    setDisplayedState(toState);
    setStatePulseTick((v) => v + 1);
  }, []);

  const advance = useCallback(() => {
    if (!started) return;
    triggerNext();
  }, [started, triggerNext]);

  const jumpToStep = useCallback((targetIndex) => {
    if (!vizRef.current) return;
    const viz = vizRef.current;
    const clamped = Math.max(0, Math.min(targetIndex, viz.totalSteps - 1));
    const prev = clamped > 0 ? [...viz.steps[clamped - 1].state] : null;

    viz.goToStep(clamped);
    const cur = viz.current;
    setStepIndex(viz.currentStep);
    setStep({ ...cur });
    setPreviousState(prev);
    setDisplayedState([...cur.state]);
    setStatePulseTick((v) => v + 1);
    setAnim(null);
    setAnimNeedsConfirm(false);
    confirmRef.current = null;
    setIsPlaying(false);
  }, []);

  const goBack = useCallback(() => {
    if (!vizRef.current || vizRef.current.currentStep === 0) return;
    jumpToStep(vizRef.current.currentStep - 1);
  }, [jumpToStep]);

  // ── Auto-play ────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) { clearInterval(playRef.current); return; }
    playRef.current = setInterval(() => {
      if (!vizRef.current) return;
      const viz = vizRef.current;
      if (viz.currentStep >= viz.totalSteps - 1) { setIsPlaying(false); return; }
      triggerNext();
    }, 2800 / speed);
    return () => clearInterval(playRef.current);
  }, [isPlaying, triggerNext, speed]);

  const handleKeyChange = useCallback((newKey) => {
    setKeyBytes(newKey);
    reset();
  }, [reset]);

  // ── Hotkeys ───────────────────────────────────────────────
  useEffect(() => {
    const isTyping = (e) => {
      const tag = e.target?.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable;
    };
    const handle = (e) => {
      if ((e.key === '?' || (e.code === 'Slash' && e.shiftKey) || e.code === 'KeyH') && !isTyping(e)) {
        e.preventDefault(); setHelpOpen(o => !o); return;
      }
      if (e.code === 'Escape' && helpOpen) { setHelpOpen(false); return; }
      if (isTyping(e) || helpOpen) return;

      if (e.code === 'KeyD') { e.preventDefault(); setTab(0); setIsPlaying(false); return; }
      if (e.code === 'KeyE') { e.preventDefault(); setTab(1); setIsPlaying(false); return; }
      if (e.code === 'KeyK') { e.preventDefault(); setTab(2); setIsPlaying(false); return; }
      if (e.code === 'KeyA') { e.preventDefault(); setTab(3); setIsPlaying(false); return; }
      if (e.code === 'KeyT') { e.preventDefault(); setTheme(t => t === 'dark' ? 'light' : 'dark'); return; }
      if (e.code === 'Digit1') { setMode(128); return; }
      if (e.code === 'Digit2') { setMode(256); return; }
      if (e.code === 'KeyS') { setSpeed(3.5); return; }
      if (e.code === 'KeyN') { setSpeed(2.0); return; }
      if (e.code === 'KeyF') { setSpeed(0.5); return; }
      if (e.code === 'KeyM') { setManualMode(m => !m); return; }
      if (e.code === 'KeyR') { e.preventDefault(); reset(); return; }

      if (!started) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(p => !p);
        return;
      }
      if (e.code === 'ArrowRight' || e.code === 'Enter') {
        e.preventDefault();
        if (!isPlaying) advance();
        return;
      }
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (!isPlaying) goBack();
        return;
      }
      if (e.code === 'Home') {
        e.preventDefault();
        if (!isPlaying) jumpToStep(0);
        return;
      }
      if (e.code === 'End') {
        e.preventDefault();
        if (!isPlaying && vizRef.current) jumpToStep(vizRef.current.totalSteps - 1);
        return;
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [started, isPlaying, advance, goBack, jumpToStep, reset, helpOpen, keyBytes]);

  const totalSteps = vizRef.current?.totalSteps ?? 0;
  const plain = step?.op === 'final' ? step.state : null;

  return (
    <div data-theme={theme} style={{ minHeight:'100vh', display:'flex', flexDirection:'column', paddingBottom:140 }}>

      {/* ─────────────  TOP HEADER  ───────────── */}
      <header style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        padding: '20px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 24,
        position: 'sticky', top: 0, zIndex: 50,
        boxShadow: 'var(--shadow)',
        flexWrap: 'wrap',
      }}>
        {/* Title block */}
        <div style={{ display:'flex', alignItems:'center', gap: 16 }}>
          <div style={{
            width: 38, height: 38,
            background: 'var(--accent)',
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Crimson Pro, serif',
            fontSize: 22, fontWeight: 700,
            borderRadius: 6,
            flexShrink: 0,
          }}>α</div>
          <div>
            <h1 style={{
              fontFamily: 'Crimson Pro, Georgia, serif',
              fontSize: 26, fontWeight: 700,
              color: 'var(--text)',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}>
              AES Decryption, Visualised
            </h1>
            <p style={{
              fontFamily: 'Crimson Pro, Georgia, serif',
              fontStyle: 'italic',
              fontSize: 14,
              color: 'var(--text-3)',
              marginTop: 2,
            }}>
              An interactive walkthrough of the Advanced Encryption Standard
            </p>
          </div>
        </div>

        {/* Right: tabs + help + theme + verify */}
        <div style={{ display:'flex', alignItems:'center', gap: 22, flexWrap: 'wrap' }}>
          <nav style={{ display:'flex', gap: 22 }}>
            {TABS.map((t, i) => (
              <button
                key={t.label}
                onClick={() => { setTab(i); setIsPlaying(false); }}
                title={`${t.label} (${t.hotkey})`}
                className={`tab ${tab === i ? 'active' : ''}`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div style={{ width:1, height:22, background:'var(--border)' }} />

          <button
            onClick={() => setVerifyOpen(true)}
            className="theme-toggle"
            style={{ padding: '6px 12px', background: 'var(--accent-soft)' }}
          >
            <span>✓ Verify with standard library</span>
          </button>

          <button
            onClick={() => setHelpOpen(true)}
            title="Show keyboard shortcuts (?)"
            className="theme-toggle"
            style={{ padding: '6px 12px' }}
          >
            <span style={{ fontSize: 13 }}>⌨</span>
            <span>Shortcuts</span>
            <kbd style={{ fontSize: 10, padding: '0 5px' }}>?</kbd>
          </button>

          <ThemeToggle theme={theme} onToggle={() => setTheme(t => t==='dark'?'light':'dark')} />
        </div>
      </header>

      {/* ─────────────  MODE BANNER  ───────────── */}
      <section style={{
        padding: '20px 32px',
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border-2)',
        display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap',
        justifyContent: 'space-between',
      }}>
        <div style={{ flex: '1 1 auto', minWidth: 220 }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Choose a variant</div>
          <h2 style={{
            fontFamily: 'Crimson Pro, Georgia, serif',
            fontSize: 22, fontWeight: 600,
            color: 'var(--text)', lineHeight: 1.15,
          }}>
            Which AES are we decrypting today?
          </h2>
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 13.5, color: 'var(--text-3)',
            marginTop: 4, maxWidth: 560,
          }}>
            AES-128 uses a 16-byte key and 10 rounds; AES-256 uses a 32-byte key and 14 rounds.
            Both encrypt 128-bit blocks. Pick one below — the visualiser adapts.
          </p>
        </div>
        <AesModeSelector keyBits={keyBits} onChange={setMode} />
      </section>

      {/* ─────────────  TAB CONTENT  ───────────── */}
      <AnimatePresence mode="wait">

        {tab === 0 && (
          <motion.div key="decrypt" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            transition={{ duration: 0.25 }}
            style={{ flex:1, display:'grid', gridTemplateColumns:'340px 1fr 340px', minHeight:0, gap: 0 }}>

            {/* LEFT — config */}
            <aside style={{
              background:'var(--bg)',
              borderRight:'1px solid var(--border-2)',
              display:'flex', flexDirection:'column',
              overflowY:'auto',
              padding: 20, gap: 16,
            }}>
              <SectionCard label={`Secret key · ${keyBits}-bit`}>
                <SegmentedKeyInput keyBytes={keyBytes} onChange={handleKeyChange} />
                <button className="btn" onClick={() => { handleKeyChange(randomBytes(keyBytes.length)); }}
                  style={{ marginTop: 12, width: '100%' }}>
                  Generate new key
                </button>
              </SectionCard>

              <SectionCard label="Plaintext (16 chars max)">
                <input value={plaintextInputRaw} onChange={e => setPlaintextInputRaw(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    color: 'var(--text)',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 14, fontWeight: 500,
                    padding: '9px 12px', outline: 'none',
                  }}
                  onFocus={e => e.target.style.borderColor='var(--accent)'}
                  onBlur={e => e.target.style.borderColor='var(--border)'}
                />
                {plaintextInputRaw.length !== 16 && (
                  <p style={{ fontFamily:'Inter', fontSize: 12, color: 'var(--accent-warn)', marginTop: 6 }}>
                    ⚠️ AES works with 16-byte blocks. Your text will be {plaintextInputRaw.length > 16 ? 'truncated' : 'padded with spaces'} to exactly 16 bytes.
                  </p>
                )}
                <p style={{ fontFamily:'Inter', fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                  Normalized block: “{normalizePlaintext(plaintextInputRaw)}” (16 bytes)
                </p>
              </SectionCard>

              <SectionCard label="Ciphertext source">
                <div style={{ display: 'flex', gap: 0, marginBottom: 12 }}>
                  {['auto', 'custom'].map((m, i) => (
                    <button
                      key={m}
                      onClick={() => setCiphertextMode(m)}
                      style={{
                        flex: 1,
                        fontFamily: 'Inter', fontSize: 12, fontWeight: 600,
                        padding: '8px 10px',
                        border: '1px solid var(--border)',
                        borderRight: i === 0 ? 'none' : '1px solid var(--border)',
                        borderRadius: i === 0 ? '6px 0 0 6px' : '0 6px 6px 0',
                        background: ciphertextMode === m ? 'var(--accent)' : 'transparent',
                        color: ciphertextMode === m ? '#fff' : 'var(--text-3)',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {m === 'auto' ? 'From plaintext' : 'Paste hex'}
                    </button>
                  ))}
                </div>

                {ciphertextMode === 'custom' && (
                  <>
                    <input
                      value={customCiphertextHex}
                      onChange={e => setCustomCiphertextHex(e.target.value.toUpperCase())}
                      placeholder="32 hex chars, e.g. 00112233…"
                      maxLength={32}
                      style={{
                        width: '100%',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        color: 'var(--text)',
                        fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                        padding: '9px 12px', outline: 'none', marginBottom: 8,
                      }}
                    />
                    {ciphertextError && (
                      <p style={{ fontFamily: 'Inter', fontSize: 11, color: 'var(--accent-red)', marginBottom: 8 }}>
                        {ciphertextError}
                      </p>
                    )}
                    <button
                      className="btn btn-filled"
                      onClick={startWithCustomCiphertext}
                      disabled={!!ciphertextError || customCiphertextHex.length !== 32}
                      style={{ width: '100%' }}
                    >
                      Decrypt this ciphertext
                    </button>
                  </>
                )}
              </SectionCard>

              {/* Ciphertext readout */}
              <div style={{
                background: 'var(--bg-card2)',
                border: '1px solid var(--border-2)',
                borderRadius: 6,
                padding: '12px 14px',
              }}>
                <div className="eyebrow" style={{ marginBottom: 6 }}>Ciphertext (hex)</div>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                  color: 'var(--text-2)', wordBreak: 'break-all', lineHeight: 1.7,
                  marginBottom: 8,
                }}>
                  {currentCiphertext.map(toHex2).join('')}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(currentCiphertext.map(toHex2).join(''));
                    showToast('Ciphertext copied');
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--text-3)',
                    fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 500,
                    padding: '5px 10px', borderRadius: 4, cursor: 'pointer',
                  }}
                >
                  Copy
                </button>
              </div>

              {!started && ciphertextMode === 'auto' && (
                <button className="btn btn-filled" onClick={() => initViz()}
                  style={{ padding: '14px', fontSize: 14, fontWeight: 700 }}>
                  Start decryption →
                </button>
              )}

              {started && (
                <div style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${plain ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 6,
                  padding: '14px 16px',
                  transition: 'border-color 0.3s',
                }}>
                  <div className="eyebrow" style={{ marginBottom: 6 }}>Recovered plaintext</div>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 600,
                    color: plain ? 'var(--accent)' : 'var(--text-dim)',
                  }}>
                    {plain ? `“${toAscii(plain)}”` : '—'}
                  </div>
                </div>
              )}
            </aside>

            {/* CENTER — viz */}
            <main style={{
              background:'var(--bg)',
              borderRight:'1px solid var(--border-2)',
              display:'flex', flexDirection:'column',
            }}>
              <div className="panel-label" style={{ justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
                  <div className="panel-label-dot" />
                  State &amp; process
                </div>
                {started && step && (
                  <motion.span key={step.label}
                    initial={{ opacity:0, y: -4 }} animate={{ opacity:1, y: 0 }}
                    style={{
                      fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: 'var(--accent)',
                    }}>
                    {step.label}
                  </motion.span>
                )}
              </div>

              <div style={{ padding:'12px 24px', borderBottom:'1px solid var(--border-2)', overflowX:'auto' }}>
                <RoundFlow step={step} totalRounds={totalRounds} />
              </div>

              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '32px 24px', gap: 20, overflowY: 'auto',
              }}>
                {!started ? (
                  <div style={{ textAlign:'center', maxWidth: 380 }}>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,52px)', gap:5, marginBottom: 20, justifyContent: 'center' }}>
                      {Array(16).fill(0).map((_,i) => (
                        <div key={i} style={{
                          width: 52, height: 52,
                          border: '1px dashed var(--border)',
                          borderRadius: 6,
                          background: 'transparent',
                        }} />
                      ))}
                    </div>
                    <h3 style={{
                      fontFamily: 'Crimson Pro, serif', fontSize: 20, fontWeight: 600,
                      color: 'var(--text-2)', marginBottom: 6,
                    }}>
                      Awaiting your ciphertext
                    </h3>
                    <p style={{
                      fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'var(--text-3)',
                      lineHeight: 1.6,
                    }}>
                      Configure the key and plaintext on the left, then press
                      &nbsp;<strong style={{ color: 'var(--text-2)' }}>Start decryption</strong>.
                      Press <kbd>?</kbd> any time for keyboard shortcuts.
                    </p>
                  </div>
                ) : (
                  <>
                    {step && (
                      <motion.div
                        key={`${step.op}-${step.round}-${stepIndex}-${animBusy ? 'anim' : 'still'}`}
                        initial={{ opacity: 0, y: 10, scale: 0.99 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.25 }}
                        style={{
                          width: 'min(900px, 100%)',
                          textAlign: 'center',
                          padding: '14px 18px',
                          borderRadius: 10,
                          border: '1px solid color-mix(in srgb, var(--accent) 35%, var(--border))',
                          background: 'color-mix(in srgb, var(--accent) 6%, var(--bg-card))',
                          boxShadow: animBusy ? '0 0 0 3px var(--accent-soft)' : 'none',
                        }}
                      >
                        <div style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: 12,
                          fontWeight: 700,
                          letterSpacing: '0.14em',
                          color: 'var(--text-3)',
                          textTransform: 'uppercase',
                          marginBottom: 4,
                        }}>
                          ROUND {step.round ?? 0} / {totalRounds}
                        </div>
                        <div style={{
                          fontFamily: 'Crimson Pro, serif',
                          fontSize: 42,
                          lineHeight: 1,
                          fontWeight: 700,
                          color: 'var(--accent)',
                          letterSpacing: '-0.015em',
                        }}>
                          {opHeadline(step.op)}
                        </div>
                        <div style={{
                          marginTop: 6,
                          fontFamily: 'Inter, sans-serif',
                          fontSize: 15,
                          color: 'var(--text-2)',
                        }}>
                          {opExplanation(step.op)}
                        </div>
                      </motion.div>
                    )}

                    <AnimCenter
                      previousState={previousState}
                      displayedState={displayedState}
                      statePulseTick={statePulseTick}
                      currentOp={step?.op}
                      manualMode={manualMode}
                    />

                    <StepInsight
                      step={step}
                      previousState={previousState}
                      currentState={displayedState}
                    />

                    <StudentStepInput
                      currentStep={step}
                      nextStep={vizRef.current?.steps?.[stepIndex + 1]}
                      onCorrect={advance}
                    />

                    <AnimatePresence mode="wait">
                      <motion.div key={stepIndex}
                        initial={{ opacity:0, y: 4 }} animate={{ opacity:1, y: 0 }} exit={{ opacity:0 }}
                        transition={{ duration: 0.2 }}
                        style={{ textAlign:'center' }}>
                        {plain && (
                          <div style={{
                            fontFamily: 'Crimson Pro, serif', fontSize: 18, fontWeight: 700,
                            color: 'var(--accent)', marginBottom: 4,
                          }}>
                            ✓ Decryption complete
                          </div>
                        )}
                        <div style={{
                          fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'var(--text-3)',
                        }}>
                          Step {stepIndex + 1} of {totalSteps}
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </>
                )}
              </div>
            </main>

            {/* RIGHT — explanation */}
            <aside style={{ background:'var(--bg)', display:'flex', flexDirection:'column', overflowY:'auto' }}>
              <AlgorithmPanel
                step={step}
                roundKey={step?.roundKey}
                animActive={animBusy}
                animType={anim?.type}
              />
            </aside>
          </motion.div>
        )}

        {tab === 1 && (
          <motion.div key="encrypt" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ flex:1, padding:'28px 32px' }}>
            <EncryptionDemo keyBytes={keyBytes} keyBits={keyBits} />
          </motion.div>
        )}

        {tab === 2 && (
          <motion.div key="keysched" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ flex:1, padding:'28px 32px' }}>
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 8, boxShadow: 'var(--shadow)',
            }}>
              <div className="panel-label">
                <div className="panel-label-dot" />
                Key expansion — {totalRounds + 1} round keys
              </div>
              <div style={{ padding:'24px', overflowX:'auto' }}>
                <p style={{
                  fontFamily: 'Crimson Pro, Georgia, serif', fontSize: 16,
                  color: 'var(--text)', lineHeight: 1.6, marginBottom: 20,
                  maxWidth: 720,
                }}>
                  AES-{keyBits} expands the {keyBits}-bit key into {totalRounds + 1} round keys
                  ({16 * (totalRounds + 1)} bytes total) using <em>RotWord</em>, <em>SubWord</em>, and
                  RCON XOR operations.{keyBits === 256 && ' AES-256 additionally applies SubWord every fourth word.'}
                </p>
                <KeySchedule keyBytes={keyBytes} activeRound={step?.round ?? 0} />
              </div>
            </div>
          </motion.div>
        )}

        {tab === 3 && (
          <motion.div key="avalanche" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ flex:1, padding:'28px 32px' }}>
            <AvalancheDemo />
          </motion.div>
        )}
      </AnimatePresence>

      {tab === 0 && (
  <ControlBar
    started={started}
    stepIndex={stepIndex}
    totalSteps={totalSteps}
    totalRounds={totalRounds}
    step={step}
    isPlaying={isPlaying}
    animBusy={animBusy}
    animNeedsConfirm={animNeedsConfirm}
    onBack={goBack}
    onPlayPause={() => !animBusy && !animNeedsConfirm && setIsPlaying(p => !p)}
    onAdvance={advance}
    onReset={reset}
    onJumpToStep={jumpToStep}
    speed={speed}
    onSpeedChange={setSpeed}
    manualMode={manualMode}
    onManualToggle={() => setManualMode(m => !m)}
    onShowHotkeys={() => setHelpOpen(true)}
  />
)}
      <HotkeysModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <VerificationBadge open={verifyOpen} onClose={() => setVerifyOpen(false)} keyBytes={keyBytes} plainBytes={plainBytes} />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed', bottom: 152, left: '50%', transform: 'translateX(-50%)',
              background: 'var(--bg-card)', border: '1px solid var(--accent)',
              borderRadius: 6,
              padding: '10px 22px', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500,
              color: 'var(--text)',
              zIndex: 200, boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
            }}>
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}