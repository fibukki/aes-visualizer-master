import { motion } from 'framer-motion';

const STATUS = {
  idle:          'Ready. Choose data, then press Start decryption.',
  init:          'Start point loaded. Press Next to begin round reversal.',
  addRoundKey:   'Step: AddRoundKey. XOR state bytes with the current round key.',
  invSubBytes:   'Step: InvSubBytes. Replace each byte via inverse S-Box lookup.',
  invShiftRows:  'Step: InvShiftRows. Shift rows right (1, 2, and 3 positions).',
  invMixColumns: 'Step: InvMixColumns. Rebuild each column using inverse matrix.',
  final:         'Done. Original plaintext is recovered.',
};

const SPEEDS = [
  { label: 'Slow', value: 3.5 },
  { label: 'Normal', value: 2.0 },
  { label: 'Fast', value: 0.5 },
];

const CONFIRM_LABEL = {
  addRoundKey:   'Confirm XOR →',
  invSubBytes:   'Confirm byte →',
  invShiftRows:  'Begin shift →',
  invMixColumns: 'Confirm column →',
};

export default function ControlBar({
  started, stepIndex, totalSteps, step, isPlaying, totalRounds,
  onBack, onPlayPause, onAdvance, onReset, onJumpToStep,
  speed = 2.0, onSpeedChange,
  manualMode = false, onManualToggle,
  animNeedsConfirm = false,
  animBusy = false,
}) {
  const op          = step?.op || 'idle';
  const statusMsg   = STATUS[started ? op : 'idle'];
  const round       = step?.round;
  const progress    = totalSteps > 1 ? (stepIndex / (totalSteps - 1)) * 100 : 0;

  const isLastStep      = stepIndex >= totalSteps - 1 && started;
  const advanceDisabled = !started || isLastStep;

  let primaryLabel = 'Next step →';
  let primaryStyle = 'normal';
  if (animNeedsConfirm) { primaryLabel = CONFIRM_LABEL[op] || 'Confirm →'; primaryStyle = 'confirm'; }
  else if (animBusy)    { primaryLabel = 'Skip animation ⏭'; primaryStyle = 'skip'; }

  return (
  started && (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border)',
        padding: '12px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        zIndex: 100,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
      }}
    >
      <button
        className="btn-control"
        disabled={stepIndex === 0 || animBusy}
        onClick={onBack}
        title="Previous step (←)"
      >
        ← Back
      </button>

      <button
        className={`btn ${isPlaying ? '' : 'btn-filled'}`}
        onClick={onPlayPause}
        disabled={animNeedsConfirm}
        title="Play/Pause (Space)"
      >
        {isPlaying ? '⏸ Pause' : '▶ Play'}
      </button>

      <button
        className="btn-control"
        disabled={advanceDisabled}
        onClick={onAdvance}
        title="Next step (→)"
      >
        Next →
      </button>

      <button
        className="btn-control"
        onClick={() => onJumpToStep?.(0)}
        disabled={stepIndex === 0}
        title="Jump to start (Home)"
      >
        ⟪ First
      </button>

      <button
        className="btn-control"
        onClick={() => onJumpToStep?.(totalSteps - 1)}
        disabled={isLastStep}
        title="Jump to end (End)"
      >
        Last ⟫
      </button>

      <div
        style={{
          width: 1,
          height: 24,
          background: 'var(--border)',
        }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-3)',
            fontFamily: 'Inter',
          }}
        >
          Speed
        </span>

        {[0.5, 1, 2, 3.5].map((s) => (
          <button
            key={s}
            onClick={() => onSpeedChange?.(s)}
            style={{
              padding: '4px 10px',
              background: speed === s ? 'var(--accent)' : 'transparent',
              color: speed === s ? '#fff' : 'var(--text-3)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              fontFamily: 'Inter, sans-serif',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            {s}×
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flex: 1,
          maxWidth: 300,
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: 'var(--text-3)',
            minWidth: 20,
          }}
        >
          {stepIndex + 1}
        </span>

        <input
          type="range"
          min={0}
          max={Math.max(totalSteps - 1, 0)}
          value={stepIndex}
          onChange={(e) =>
            onJumpToStep?.(Number(e.target.value))
          }
          style={{ flex: 1 }}
        />

        <span
          style={{
            fontSize: 10,
            color: 'var(--text-3)',
            minWidth: 20,
          }}
        >
          {totalSteps}
        </span>
      </div>

      {started && (
        <button
          className="btn-control"
          onClick={onReset}
          title="Reset (R)"
          style={{
            borderColor:
              'color-mix(in srgb, var(--accent-red) 50%, var(--border))',
            color: 'var(--accent-red)',
          }}
        >
          Reset
        </button>
      )}
    </div>
  )
);
}