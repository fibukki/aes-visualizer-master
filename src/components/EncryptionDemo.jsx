import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { AESEncryptionVisualizer } from '../aes';
import StepInsight from './StepInsight';
import StudentStepInput from './StudentStepInput';
import RoundFlow from './RoundFlow';
import AlgorithmPanel from './AlgorithmPanel';
import ControlBar from './ControlBar';

function hex2(b) { return b.toString(16).padStart(2, '0').toUpperCase(); }

function toBytes16(text) {
  const enc = new TextEncoder().encode(text.padEnd(16, ' ').slice(0, 16));
  return Array.from(enc);
}

function toRowMajor(state) {
  const out = [];
  for (let row = 0; row < 4; row++) 
    for (let col = 0; col < 4; col++) 
      out.push({ value: state[col * 4 + row], idx: col * 4 + row, row, col });
  return out;
}

function headline(op) {
  const map = {
    init: 'INITIAL PLAINTEXT',
    addRoundKey: 'ADDROUNDKEY',
    subBytes: 'SUBBYTES',
    shiftRows: 'SHIFTROWS',
    mixColumns: 'MIXCOLUMNS',
    finalCipher: 'FINAL CIPHERTEXT'
  };
  return map[op] || op?.toUpperCase();
}

function explain(op) {
  const map = {
    init: 'The 16-byte plaintext block is loaded into a 4×4 AES state matrix.',
    addRoundKey: 'XOR each byte with the current round key.',
    subBytes: 'Replace each byte using the AES S-Box to add non-linearity.',
    shiftRows: 'Shift rows to the left: Row1 +1, Row2 +2, Row3 +3.',
    mixColumns: 'Mix each column using multiplication in GF(2^8) to create diffusion.',
    finalCipher: 'All rounds complete; ciphertext is ready.'
  };
  return map[op] || 'AES encryption step in progress.';
}

function clientFriendlyFor(op) {
  if (op === 'addRoundKey') {
    return {
      what: 'Secret key bytes are mixed with plaintext bytes.',
      why: 'This makes the data dependent on the encryption key.',
      next: 'Next the bytes will be substituted using the AES S-Box.',
    };
  }

  if (op === 'subBytes') {
    return {
      what: 'Each byte is replaced using the AES substitution table.',
      why: 'This removes visible patterns and adds non-linearity.',
      next: 'Then rows are shifted to rearrange byte positions.',
    };
  }

  if (op === 'shiftRows') {
    return {
      what: 'Rows are shifted left by different offsets.',
      why: 'Bytes move into new positions to improve diffusion.',
      next: 'Columns will now be mathematically mixed together.',
    };
  }

  if (op === 'mixColumns') {
    return {
      what: 'Each column is recalculated from all four bytes.',
      why: 'A small change spreads across the entire state.',
      next: 'The next round repeats similar transformations.',
    };
  }

  if (op === 'finalCipher') {
    return {
      what: 'Encryption is complete.',
      why: 'The plaintext has been transformed into ciphertext.',
      next: 'You can reset and encrypt another block.',
    };
  }

  return {
    what: 'Plaintext is loaded into the AES state matrix.',
    why: 'AES operates on a 4×4 byte state.',
    next: 'The first AddRoundKey step begins encryption.',
  };
}

function Matrix({ state, prev, currentOp, onSelect, pinnedTooltip, setPinnedTooltip }) {
  const cells = toRowMajor(state || Array(16).fill(0));
  const [hovered, setHovered] = useState(null);
  
  const getTooltipPosition = useCallback((element, cell) => {
    const rect = element.getBoundingClientRect();
    return {
      ...cell,
      x: rect.right + 12,
      y: rect.top - 10,
    };
  }, []);
  
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(4, 64px)', 
      gap: 6, 
      padding: 20, 
      background: 'var(--bg-card2)', 
      border: '2px solid var(--border)', 
      borderRadius: 12,
      boxShadow: 'var(--shadow)'
    }}>
      {cells.map(c => {
        const changed = prev && prev[c.idx] !== c.value;
        const pinned = pinnedTooltip?.idx === c.idx;
        const isHovered = hovered === c.idx;
        
        return (
          <motion.div
            key={`${c.idx}-${c.value}`}
            data-cell-idx={c.idx}
            onMouseEnter={(e) => {
              setHovered(c.idx);
              if (pinnedTooltip) return;
              onSelect?.(getTooltipPosition(e.currentTarget, c));
            }}
            onMouseLeave={() => {
              setHovered(null);
              if (!pinnedTooltip) {
                onSelect?.(null);
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              const data = getTooltipPosition(e.currentTarget, c);
              setPinnedTooltip((prev) =>
                prev?.idx === c.idx ? null : data
              );
              onSelect?.(data);
            }}
            initial={changed ? { scale: 0.82, opacity: 0.4, backgroundColor: 'var(--accent-soft)' } : { opacity: 0.9 }}
            animate={
              changed
                ? {
                    scale: [0.82, 1.12, pinned ? 1.04 : 1],
                    opacity: 1,
                    backgroundColor: [
                      'color-mix(in srgb, var(--accent) 28%, var(--bg-card))',
                      'color-mix(in srgb, var(--accent) 14%, var(--bg-card))',
                      'var(--bg-card)',
                    ],
                  }
                : {
                    opacity: 1,
                    scale: pinned ? 1.04 : isHovered ? 1.05 : 1,
                  }
            }
            transition={{ duration: 0.35, times: [0, 0.5, 1] }}
            style={{
              width: 64, 
              height: 64,
              fontFamily: 'JetBrains Mono, monospace', 
              fontSize: 20, 
              fontWeight: 800,
              color: pinned || isHovered || changed ? 'var(--accent)' : 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: pinned ? '2px solid var(--accent)' : isHovered ? '1px solid var(--accent)' : '1px solid var(--border-2)',
              borderRadius: 8,
              background: pinned
                ? 'color-mix(in srgb, var(--accent) 12%, var(--bg-card))'
                : isHovered
                  ? 'color-mix(in srgb, var(--accent) 8%, var(--bg-card))'
                  : changed
                    ? undefined
                    : 'var(--bg-card)',
              transition: 'background-color 0.18s, border-color 0.18s',
              cursor: 'pointer',
            }}
          >
            {hex2(c.value)}
          </motion.div>
        );
      })}
    </div>
  );
}

function MiniKeyDisplay({ roundKey }) {
  if (!roundKey) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div className="eyebrow" style={{ marginBottom: 4 }}>Round key</div>
      <div style={{ 
        fontFamily: 'JetBrains Mono, monospace', 
        fontSize: 11, 
        color: 'var(--text-3)',
        wordBreak: 'break-all',
        lineHeight: 1.5
      }}>
        {roundKey.map(hex2).join(' ')}
      </div>
    </div>
  );
}

function RoundBadge({ round, totalRounds, op }) {
  if (op === 'init') return null;
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '4px 12px',
      background: 'var(--accent-soft)',
      borderRadius: 20,
      fontFamily: 'Inter, sans-serif',
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--accent)',
      marginBottom: 8
    }}>
      <span>🔐</span>
      <span>Round {round} / {totalRounds}</span>
    </div>
  );
}

export default function EncryptionDemo({ keyBytes, keyBits }) {
  const [text, setText] = useState('AES Encrypt Demo');
  const [started, setStarted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);
  const playRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [pinnedTooltip, setPinnedTooltip] = useState(null);
  const [clientView, setClientView] = useState(true);
  
  const normalizedText = useMemo(() => {
    if (text.length > 16) return text.slice(0, 16);
    return text.padEnd(16, ' ');
  }, [text]);
  
  const plain = useMemo(() => toBytes16(text), [text]);
  const viz = useMemo(() => {
    if (!started) return null;
    return new AESEncryptionVisualizer(plain, keyBytes);
  }, [started, plain, keyBytes]);
  
  const step = viz?.steps[stepIndex];
  const prev = stepIndex > 0 ? viz?.steps[stepIndex - 1]?.state : null;
  const nextStep = viz && stepIndex < viz.totalSteps - 1 ? viz.steps[stepIndex + 1] : null;
  const changedLinear = useMemo(() => {
    if (!prev || !step?.state) return [];
    const out = [];
    for (let i = 0; i < step.state.length; i++) {
      if (prev[i] !== step.state[i]) {
        out.push(i);
      }
    }
    return out;
  }, [prev, step]);

  const changedCount = changedLinear.length;
  const clientExplain = clientFriendlyFor(step?.op);
  
  const startEncryption = useCallback(() => {
    setStarted(true);
    setStepIndex(0);
    setIsPlaying(false);
  }, []);
  
  const reset = useCallback(() => {
    setStarted(false);
    setStepIndex(0);
    setIsPlaying(false);
    setTooltip(null);
    setPinnedTooltip(null);
    if (playRef.current) {
      clearInterval(playRef.current);
      playRef.current = null;
    }
  }, []);
  
  const handleTextChange = useCallback((e) => {
    setText(e.target.value);
    reset();
  }, [reset]);
  
  // Auto-play logic
  useEffect(() => {
    if (!isPlaying || !viz) {
      if (playRef.current) {
        clearInterval(playRef.current);
        playRef.current = null;
      }
      return;
    }
    
    playRef.current = setInterval(() => {
      setStepIndex(i => {
        if (i >= viz.totalSteps - 1) {
          setIsPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 2800 / speed);
    
    return () => {
      if (playRef.current) {
        clearInterval(playRef.current);
        playRef.current = null;
      }
    };
  }, [isPlaying, speed, viz]);

  // Update tooltip value when step changes
  useEffect(() => {
    if (!tooltip || !step?.state) return;
    const idx = tooltip.idx;
    const newValue = step.state[idx];
    setTooltip((prev) => prev ? ({
      ...prev,
      value: newValue,
    }) : null);
  }, [stepIndex, step]);

  // Update pinned tooltip position on scroll and resize
  useEffect(() => {
    if (!pinnedTooltip) return;
    
    const updatePosition = () => {
      const cells = document.querySelectorAll('[data-cell-idx]');
      const targetCell = Array.from(cells).find(
        cell => cell.getAttribute('data-cell-idx') === String(pinnedTooltip.idx)
      );
      
      if (targetCell) {
        const rect = targetCell.getBoundingClientRect();
        const updatedData = {
          ...pinnedTooltip,
          x: rect.right + 12,
          y: rect.top - 10,
        };
        
        setTooltip(updatedData);
        setPinnedTooltip(updatedData);
      }
    };
    
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);
    
    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [pinnedTooltip]);
  
  // Close tooltip on outside click
  useEffect(() => {
    const close = () => {
      if (!pinnedTooltip) {
        setTooltip(null);
      }
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [pinnedTooltip]);
  
  const goToStep = useCallback((idx) => {
    if (!viz) return;
    setStepIndex(Math.max(0, Math.min(viz.totalSteps - 1, idx)));
    setTooltip(null);
  }, [viz]);
  
  const advance = useCallback(() => {
    if (!viz) return;
    setStepIndex(i => Math.min(viz.totalSteps - 1, i + 1));
  }, [viz]);
  
  const goBack = useCallback(() => {
    setStepIndex(i => Math.max(0, i - 1));
  }, []);
  
  const togglePlay = useCallback(() => {
    if (!viz) return;
    setIsPlaying(p => !p);
  }, [viz]);
  
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr 340px', gap: 0, minHeight: 0, flex: 1 }}>
      
      {/* LEFT PANEL — Configuration */}
      <aside style={{
        background: 'var(--bg)',
        borderRight: '1px solid var(--border-2)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        padding: 20,
        gap: 16
      }}>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          boxShadow: 'var(--shadow)',
          padding: 16
        }}>
          <div style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text-3)',
            marginBottom: 12
          }}>
            Plaintext · 16 bytes max
          </div>
          
          <input 
            value={text} 
            onChange={handleTextChange}
            maxLength={16}
            placeholder="Enter up to 16 characters..."
            style={{ 
              width: '100%', 
              background: 'var(--bg-input)', 
              border: '1px solid var(--border)', 
              borderRadius: 6, 
              color: 'var(--text)', 
              fontFamily: 'JetBrains Mono, monospace', 
              padding: '10px 12px',
              fontSize: 14,
              outline: 'none',
              marginBottom: 8
            }} 
          />
          
          <p style={{ 
            fontFamily: 'Inter, sans-serif', 
            fontSize: 11, 
            color: 'var(--text-3)', 
            marginBottom: 12 
          }}>
            {text.length < 16 ? 
              `Will be padded with spaces to 16 bytes` : 
              text.length > 16 ? 
                `Text will be truncated to 16 bytes` : 
                `Exactly 16 bytes — perfect!`}
          </p>
          
          <p style={{ 
            fontFamily: 'Inter, sans-serif', 
            fontSize: 12, 
            color: 'var(--text-2)',
            background: 'var(--bg-card2)',
            padding: '8px 10px',
            borderRadius: 4
          }}>
            <strong>Normalized:</strong> "{normalizedText}"
          </p>
        </div>
        
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          boxShadow: 'var(--shadow)',
          padding: 16
        }}>
          <div style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text-3)',
            marginBottom: 12
          }}>
            Encryption stats
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ 
              background: 'var(--bg-card2)', 
              padding: '10px', 
              borderRadius: 6,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>{keyBits}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>key bits</div>
            </div>
            <div style={{ 
              background: 'var(--bg-card2)', 
              padding: '10px', 
              borderRadius: 6,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>{keyBits === 256 ? 14 : 10}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>rounds</div>
            </div>
            <div style={{ 
              background: 'var(--bg-card2)', 
              padding: '10px', 
              borderRadius: 6,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>128</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>block bits</div>
            </div>
            <div style={{ 
              background: 'var(--bg-card2)', 
              padding: '10px', 
              borderRadius: 6,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>{viz ? viz.totalSteps : '—'}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>steps</div>
            </div>
          </div>
        </div>
        
        {!started ? (
          <button 
            className="btn btn-filled" 
            onClick={startEncryption}
            style={{ padding: '14px', fontSize: 14, fontWeight: 700 }}
          >
            Start encryption →
          </button>
        ) : (
          <div>
            <div style={{
              background: 'var(--bg-card)',
              border: `1px solid ${step?.op === 'finalCipher' ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 8,
              padding: 16,
              transition: 'border-color 0.3s'
            }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Final ciphertext</div>
              <div style={{ 
                fontFamily: 'JetBrains Mono, monospace', 
                fontSize: 12, 
                color: step?.op === 'finalCipher' ? 'var(--accent)' : 'var(--text-2)', 
                lineHeight: 1.5, 
                wordBreak: 'break-all',
                marginBottom: 8
              }}>
                {viz?.steps[viz.totalSteps - 1].state.map(hex2).join('')}
              </div>
              {step?.op === 'finalCipher' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    fontFamily: 'Crimson Pro, serif',
                    fontSize: 16,
                    fontWeight: 600,
                    color: 'var(--accent)'
                  }}
                >
                  ✓ Encryption complete
                </motion.div>
              )}
            </div>
            
            <button 
              className="btn" 
              onClick={reset}
              style={{ padding: '14px', fontSize: 14, fontWeight: 600 }}
            >
              Reset encryption ↺
            </button>
          </div>
        )}
      </aside>
      
      {/* CENTER — Visualization */}
      <main style={{
        background: 'var(--bg)',
        borderRight: '1px solid var(--border-2)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div className="panel-label" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="panel-label-dot" />
            State &amp; process
          </div>
          {started && step && (
            <motion.span 
              key={step.op + step.round}
              initial={{ opacity: 0, y: -4 }} 
              animate={{ opacity: 1, y: 0 }}
              style={{
                fontFamily: 'Inter, sans-serif', 
                fontSize: 11, 
                fontWeight: 600,
                letterSpacing: '0.1em', 
                textTransform: 'uppercase',
                color: 'var(--accent)'
              }}
            >
              Encryption · {step.op}
            </motion.span>
          )}
        </div>
        
        {started && (
          <div style={{ 
            padding: '12px 24px', 
            borderBottom: '1px solid var(--border-2)', 
            overflowX: 'auto' 
          }}>
            <RoundFlow step={step} totalRounds={keyBits === 256 ? 14 : 10} />
          </div>
        )}
        
        <div style={{
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '32px 24px', 
          gap: 20, 
          overflowY: 'auto'
        }}>
          {!started ? (
            <div style={{ textAlign: 'center', maxWidth: 380 }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 52px)', 
                gap: 5, 
                marginBottom: 20, 
                justifyContent: 'center' 
              }}>
                {Array(16).fill(0).map((_, i) => (
                  <div key={i} style={{
                    width: 52, 
                    height: 52,
                    border: '1px dashed var(--border)',
                    borderRadius: 6,
                    background: 'transparent',
                  }} />
                ))}
              </div>
              <h3 style={{
                fontFamily: 'Crimson Pro, serif', 
                fontSize: 20, 
                fontWeight: 600,
                color: 'var(--text-2)', 
                marginBottom: 6,
              }}>
                Ready to encrypt
              </h3>
              <p style={{
                fontFamily: 'Inter, sans-serif', 
                fontSize: 13, 
                color: 'var(--text-3)',
                lineHeight: 1.6,
              }}>
                Configure your plaintext on the left, then press
                &nbsp;<strong style={{ color: 'var(--text-2)' }}>Start encryption</strong>
                &nbsp;to begin the AES encryption walkthrough.
              </p>
            </div>
          ) : (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
              {step && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${step.op}-${step.round}-${stepIndex}`}
                    initial={{ opacity: 0, y: 10, scale: 0.99 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.99 }}
                    transition={{ duration: 0.25 }}
                    style={{
                      width: 'min(900px, 100%)',
                      textAlign: 'center',
                      padding: '14px 18px',
                      borderRadius: 10,
                      border: '1px solid color-mix(in srgb, var(--accent) 35%, var(--border))',
                      background: 'color-mix(in srgb, var(--accent) 6%, var(--bg-card))',
                    }}
                  >
                    <RoundBadge round={step.round ?? 0} totalRounds={keyBits === 256 ? 14 : 10} op={step.op} />
                    
                    <div style={{
                      fontFamily: 'Crimson Pro, serif',
                      fontSize: 42,
                      lineHeight: 1,
                      fontWeight: 700,
                      color: 'var(--accent)',
                      letterSpacing: '-0.015em',
                    }}>
                      {headline(step.op)}
                    </div>
                    
                    <div style={{
                      marginTop: 6,
                      fontFamily: 'Inter, sans-serif',
                      fontSize: 15,
                      color: 'var(--text-2)',
                    }}>
                      {explain(step.op)}
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
              
              <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: 'min(860px, 100%)', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',  gap: 16 }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--text-3)' }}>
                    Changed bytes: <strong style={{ color: 'var(--accent)' }}>{changedCount}</strong>/16
                  </span>

                  <button
                    className={`btn-control ${clientView ? 'active' : ''}`}
                    onClick={() => setClientView((v) => !v)}
                    style={{ padding: '7px 12px', fontSize: 12 }}
                  >
                    {clientView ? 'Inspect mode ON' : 'Inspect mode OFF'}
                  </button>
                </div>
              </div>
              
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <Matrix
                  state={step?.state} 
                  prev={prev} 
                  currentOp={step?.op} 
                  onSelect={setTooltip} 
                  pinnedTooltip={pinnedTooltip}
                  setPinnedTooltip={setPinnedTooltip}
                />

                {typeof document !== 'undefined' && tooltip && createPortal(
                  <div
                    style={{
                      position: 'fixed',
                      left: tooltip.x,
                      top: tooltip.y,
                      width: 220,
                      background: 'var(--bg-card)',
                      border: '2px solid var(--accent)',
                      padding: 16,
                      zIndex: 49,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
                      fontFamily: 'JetBrains Mono, monospace',
                      borderRadius: 8,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: 'var(--accent)',
                        marginBottom: 10,
                      }}
                    >
                      BYTE [{tooltip.row}:{tooltip.col}]
                    </div>

                    <div style={{ fontSize: 13, lineHeight: 1.9 }}>
                      <div>
                        HEX&nbsp;&nbsp;&nbsp;
                        {hex2(tooltip.value)}
                      </div>
                      <div>
                        DEC&nbsp;&nbsp;&nbsp;
                        {tooltip.value}
                      </div>
                      <div>
                        BIN&nbsp;&nbsp;&nbsp;
                        {tooltip.value.toString(2).padStart(8, '0')}
                      </div>
                      <div>
                        ASCII&nbsp;
                        {tooltip.value >= 32 && tooltip.value < 127
                          ? `'${String.fromCharCode(tooltip.value)}'`
                          : '·'}
                      </div>
                      <div style={{ marginTop: 8, opacity: 0.7 }}>
                        Row {tooltip.row} · Col {tooltip.col}
                      </div>
                    </div>
                  </div>,
                  document.body
                )}
              </div>
              
              <MiniKeyDisplay roundKey={step?.roundKey} />

              {clientView && (
                <div style={{
                  width: 'min(860px, 100%)',
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: '1px solid color-mix(in srgb, var(--accent-green) 35%, var(--border))',
                  background: 'color-mix(in srgb, var(--accent-green) 6%, var(--bg-card))',
                }}>
                  <div style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 15,
                    fontWeight: 800,
                    color: 'var(--accent-green)',
                    marginBottom: 8,
                  }}>
                    Client-friendly explanation
                  </div>

                  <div style={{ display: 'grid', gap: 5 }}>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--text-2)' }}>
                      <strong>What happened:</strong> {clientExplain.what}
                    </div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--text-2)' }}>
                      <strong>Why it matters:</strong> {clientExplain.why}
                    </div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--text-2)' }}>
                      <strong>What is next:</strong> {clientExplain.next}
                    </div>
                  </div>
                </div>
              )}
              
              <StepInsight 
                step={step} 
                previousState={prev} 
                currentState={step?.state} 
              />
              
              <StudentStepInput 
                currentStep={step} 
                nextStep={nextStep} 
                onCorrect={advance} 
              />
              
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'Inter, sans-serif', 
                  fontSize: 13, 
                  color: 'var(--text-3)'
                }}>
                  Step {stepIndex + 1} of {viz?.totalSteps || 0}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* RIGHT PANEL — Algorithm details */}
      <aside style={{ 
        background: 'var(--bg)', 
        display: 'flex', 
        flexDirection: 'column', 
        overflowY: 'auto' 
      }}>
        <AlgorithmPanel
          step={step}
          roundKey={step?.roundKey}
          animActive={false}
          animType={null}
        />
      </aside>

      <ControlBar
        started={started}
        stepIndex={stepIndex}
        totalSteps={viz?.totalSteps || 0}
        totalRounds={keyBits === 256 ? 14 : 10}
        step={step}
        isPlaying={isPlaying}
        onBack={goBack}
        onPlayPause={togglePlay}
        onAdvance={advance}
        onReset={reset}
        onJumpToStep={goToStep}
        speed={speed}
        onSpeedChange={setSpeed}
        manualMode={false}
        onManualToggle={() => {}}
        animNeedsConfirm={false}
        animBusy={false}
      />
    </div>
  );
}