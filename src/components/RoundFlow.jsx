import { motion } from 'framer-motion';

/**
 * Build a compact pipeline representation of the inverse cipher for `Nr` rounds.
 * Always shows: ARK_Nr → InvShr_(Nr-1) → InvSub_(Nr-1) → ARK_(Nr-1) → InvMix_(Nr-1)
 *               → … → InvShr_1 → InvSub_1 → ARK_1 → InvMix_1
 *               → InvShr_0 → InvSub_0 → ARK_0 → Plain
 */
function buildPipeline(Nr) {
  const pipe = [];
  pipe.push({ id: `ark${Nr}`, label: `ARK${sub(Nr)}`, op: 'addRoundKey', round: Nr });

  // First inverse round (Nr-1) explicit
  const top = Nr - 1;
  pipe.push({ id: `isr${top}`,  label: `InvShr${sub(top)}`, op: 'invShiftRows', round: top });
  pipe.push({ id: `isub${top}`, label: `InvSub${sub(top)}`, op: 'invSubBytes', round: top });
  pipe.push({ id: `ark${top}`,  label: `ARK${sub(top)}`,    op: 'addRoundKey', round: top });
  pipe.push({ id: `imc${top}`,  label: `InvMix${sub(top)}`, op: 'invMixColumns', round: top });

  if (Nr > 2) pipe.push({ id: 'dots', label: '···', op: null, round: null });

  // Last inverse round (1) explicit
  pipe.push({ id: 'isr1',  label: 'InvShr₁', op: 'invShiftRows', round: 1 });
  pipe.push({ id: 'isub1', label: 'InvSub₁', op: 'invSubBytes',  round: 1 });
  pipe.push({ id: 'ark1',  label: 'ARK₁',    op: 'addRoundKey',  round: 1 });
  pipe.push({ id: 'imc1',  label: 'InvMix₁', op: 'invMixColumns', round: 1 });

  // Final round (0)
  pipe.push({ id: 'isr0',  label: 'InvShr₀', op: 'invShiftRows', round: 0 });
  pipe.push({ id: 'isub0', label: 'InvSub₀', op: 'invSubBytes',  round: 0 });
  pipe.push({ id: 'ark0',  label: 'ARK₀',    op: 'addRoundKey',  round: 0 });
  pipe.push({ id: 'done',  label: 'Plain',   op: 'final',        round: 0 });
  return pipe;
}

const SUB = ['₀','₁','₂','₃','₄','₅','₆','₇','₈','₉'];
function sub(n) {
  return n.toString().split('').map(c => SUB[+c] || c).join('');
}

function isActive(pill, step) {
  if (!step) return false;
  if (pill.op === null) return false;
  return pill.op === step.op && pill.round === step.round;
}

export default function RoundFlow({ step, totalRounds = 10 }) {
  const PIPELINE = buildPipeline(totalRounds);
  return (
    <div className="w-full overflow-x-auto pb-1">
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, minWidth: 'max-content', padding: '4px 0' }}>
        {PIPELINE.map((pill, i) => {
          const active = isActive(pill, step);
          return (
            <div key={pill.id} style={{ display: 'flex', alignItems: 'center' }}>
              <motion.div
                className={`flow-pill ${active ? 'active' : ''}`}
                animate={{
                  scale: active ? 1.08 : 1,
                  opacity: pill.op === null ? 0.4 : active ? 1 : 0.45,
                }}
                transition={{ duration: 0.25 }}
                style={{
                  color: active ? 'var(--accent)' : 'var(--text-3)',
                  fontFamily: 'Orbitron, monospace',
                  fontSize: 8,
                  letterSpacing: 1,
                }}
              >
                {pill.label}
              </motion.div>
              {i < PIPELINE.length - 1 && (
                <div style={{
                  width: 12, height: 1,
                  background: active ? 'var(--accent)' : 'var(--border-2)',
                  flexShrink: 0,
                  transition: 'background 0.3s',
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
