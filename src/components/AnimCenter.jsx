import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toRowMajor, CELL, GAP } from '../animations/shared';
import InteractiveCell from './InteractiveCell';

function explanationFor(op, isAnimating, manualMode) {
  const modeHint = manualMode
    ? 'Manual mode: press Confirm/Next to continue.'
    : 'Auto mode: watch the full motion, then continue.';

  if (op === 'addRoundKey') {
    return {
      title: 'AddRoundKey (XOR)',
      lines: [
        'Each state byte is XOR-ed with the round key byte.',
        'This is done cell-by-cell from the matrix.',
        modeHint,
      ],
    };
  }
  if (op === 'SubBytes') {
    return {
      title: 'SubBytes',
      lines: [
        'Take one byte from state.',
        'Find replacement from inverse S-Box.',
        modeHint,
      ],
    };
  }
  if (op === 'ShiftRows') {
    return {
      title: 'ShiftRows',
      lines: [
        'Row 0 stays the same.',
        'Rows 1, 2, 3 shift right by 1, 2, 3 positions.',
        modeHint,
      ],
    };
  }
  if (op === 'MixColumns') {
    return {
      title: 'MixColumns',
      lines: [
        'Process one column at a time.',
        'Apply inverse AES matrix in GF(2^8).',
        modeHint,
      ],
    };
  }
  if (op === 'final') {
    return {
      title: 'Done',
      lines: [
        'All reverse rounds are complete.',
        'The plaintext is recovered.',
        'You can go back or reset and try another input.',
      ],
    };
  }
  return {
    title: isAnimating ? 'Processing step' : 'State preview',
    lines: [
      'Current AES state is shown in the 4x4 matrix.',
      'Use Next to move to the next operation.',
      modeHint,
    ],
  };
}

function clientFriendlyFor(op) {
  if (op === 'addRoundKey') {
    return {
      what: 'System mixes secret key with data bytes.',
      why: 'This makes bytes look random and hard to guess.',
      next: 'After this, bytes go through substitution.',
    };
  }
  if (op === 'SubBytes') {
    return {
      what: 'Each byte is replaced using a fixed lookup table.',
      why: 'This removes obvious patterns in data.',
      next: 'Then rows are shifted to change positions.',
    };
  }
  if (op === 'ShiftRows') {
    return {
      what: 'Rows move right by different steps.',
      why: 'Same bytes end up in different places.',
      next: 'Then columns are mathematically restored.',
    };
  }
  if (op === 'MixColumns') {
    return {
      what: 'Each column is recalculated from all four bytes.',
      why: 'One byte affects the whole column for strong diffusion.',
      next: 'Next round repeats similar reverse operations.',
    };
  }
  if (op === 'final') {
    return {
      what: 'All reverse steps are done.',
      why: 'Original plaintext is recovered correctly.',
      next: 'You can reset and test another input.',
    };
  }
  return {
    what: 'Initial ciphertext block is loaded.',
    why: 'This is the encrypted data we need to decode.',
    next: 'Press Next to start the reverse process.',
  };
}

function StaticGrid({ state, prevState, op, replayTick, pulseTick, activeLinearIdx, inspectMode }) {
  const [pinned, setPinned] = useState(null);

  if (!state) return null;
  const cells = toRowMajor(state);
  const changed = new Set();
  if (prevState && prevState.length === state.length) {
    for (let i = 0; i < state.length; i += 1) {
      if (prevState[i] !== state[i]) changed.add(i);
    }
  }
  const opClass = {
    addRoundKey:   'op-ark',
    invSubBytes:   'op-sub',
    invShiftRows:  'op-shr',
    invMixColumns: 'op-mix',
    final:         'op-done',
  }[op] || '';

  function togglePin(row, col) {
    setPinned(p => (p && p.row === row && p.col === col) ? null : { row, col });
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(4, ${CELL}px)`,
      gap: GAP, padding: 14,
      background: 'var(--bg-card2)',
      border: '2px solid var(--border)',
      position: 'relative',
    }}>
      {cells.map(({ value, row, col, displayIdx, linearIdx }) => {
        const isChanged = changed.has(linearIdx);
        const isTourActive = linearIdx === activeLinearIdx;
        return (
          <motion.div
            key={`${displayIdx}-${replayTick}-${pulseTick}`}
            initial={isChanged ? { scale: 0.88, opacity: 0.55 } : { opacity: 0.92 }}
            animate={
              isTourActive
                ? { scale: [1, 1.22, 1.06], opacity: [1, 1, 1], y: [0, -4, 0] }
                : isChanged
                  ? { scale: [0.88, 1.1, 1], opacity: 1, y: 0 }
                  : { opacity: 1, y: 0 }
            }
            transition={{ duration: isTourActive ? 0.5 : isChanged ? 0.42 : 0.2, ease: 'easeOut' }}
          >
            <InteractiveCell
              value={value} row={row} col={col}
              opClass={isTourActive ? `${opClass} highlighted` : isChanged ? `${opClass} highlighted` : opClass}
              pinned={pinned?.row === row && pinned?.col === col}
              onPin={togglePin}
              pulseKey={`${replayTick}-${pulseTick}`}
            />
          </motion.div>
        );
      })}
    </div>
  );
}

export default function AnimCenter({
  previousState,
  displayedState, statePulseTick = 0, currentOp,
  manualMode = false,
}) {
  const [replayTick, setReplayTick] = useState(0);
  const [clientView, setClientView] = useState(true);
  const [tourActive, setTourActive] = useState(false);
  const [tourPos, setTourPos] = useState(0);
  const explain = explanationFor(currentOp, false, manualMode);
  const clientExplain = clientFriendlyFor(currentOp);
  const changedLinear = useMemo(() => {
    if (!previousState || !displayedState || previousState.length !== displayedState.length) return [];
    const out = [];
    for (let i = 0; i < displayedState.length; i += 1) {
      if (previousState[i] !== displayedState[i]) out.push(i);
    }
    return out;
  }, [previousState, displayedState]);
  const changedCount = useMemo(() => {
    return changedLinear.length;
  }, [changedLinear]);

  useEffect(() => {
    setTourActive(false);
    setTourPos(0);
  }, [statePulseTick, displayedState, currentOp]);

  useEffect(() => {
    if (!tourActive || changedLinear.length === 0) return undefined;
    const t = setInterval(() => {
      setTourPos((p) => {
        if (p >= changedLinear.length - 1) {
          setTourActive(false);
          return p;
        }
        return p + 1;
      });
    }, 430);
    return () => clearInterval(t);
  }, [tourActive, changedLinear]);

  const activeLinearIdx = tourActive && changedLinear.length > 0 ? changedLinear[tourPos] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--text-3)' }}>
          Changed bytes: <strong style={{ color: 'var(--accent)' }}>{changedCount}</strong>/16
        </span>
        <button
          className="btn-control"
          onClick={() => { setTourActive(true); setTourPos(0); }}
          disabled={changedLinear.length === 0}
          style={{ padding: '7px 12px', fontSize: 12 }}
          title="Highlight changed bytes one by one"
        >
          ▶ Byte tour
        </button>
        {tourActive && changedLinear.length > 0 && (
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--accent)' }}>
            {tourPos + 1}/{changedLinear.length}
          </span>
        )}
        <button
          className={`btn-control ${clientView ? 'active' : ''}`}
          onClick={() => setClientView((v) => !v)}
          style={{ padding: '7px 12px', fontSize: 12 }}
        >
          {clientView ? 'Inspect mode ON' : 'Inspect mode OFF'}
        </button>
      </div>

      <StaticGrid
        state={displayedState}
        prevState={previousState}
        op={currentOp}
        replayTick={replayTick}
        pulseTick={statePulseTick}
        activeLinearIdx={activeLinearIdx}
        inspectMode={clientView}
      />

      <div style={{
        width: 'min(860px, 100%)',
        padding: '12px 14px',
        borderRadius: 8,
        border: '1px solid color-mix(in srgb, var(--accent) 30%, var(--border))',
        background: 'color-mix(in srgb, var(--accent) 6%, var(--bg-card))',
      }}>
        <div style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 16,
          fontWeight: 800,
          color: 'var(--accent)',
          marginBottom: 6,
        }}>
          {explain.title}
        </div>
        <div style={{ display: 'grid', gap: 3 }}>
          {explain.lines.map((line) => (
            <div key={line} style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 14,
              color: 'var(--text-2)',
            }}>
              • {line}
            </div>
          ))}
        </div>
      </div>

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
    </div>
  );
}
