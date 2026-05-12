import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { INV_SBOX, SBOX } from '../aes';

function hex2(b) { return (b ?? 0).toString(16).padStart(2, '0').toUpperCase(); }
function bin2(v) { return (v ?? 0).toString(2).padStart(8, '0'); }

function opName(op) {
  if (op === 'addRoundKey') return 'AddRoundKey';
  if (op === 'invSubBytes') return 'InvSubBytes';
  if (op === 'invShiftRows') return 'InvShiftRows';
  if (op === 'invMixColumns') return 'InvMixColumns';
  if (op === 'subBytes') return 'SubBytes';
  if (op === 'shiftRows') return 'ShiftRows';
  if (op === 'mixColumns') return 'MixColumns';
  if (op === 'final' || op === 'finalCipher') return 'Final AddRoundKey';
  return 'Next AES step';
}

// AddRoundKey steps carry a `roundKey`; treat 'final' (decrypt) and
// 'finalCipher' (encrypt) the same — they are AddRoundKey under the hood.
function isAddRoundKeyOp(op) {
  return op === 'addRoundKey' || op === 'final' || op === 'finalCipher';
}

// Render the round key as a 4×4 grid that lines up with the state matrix
// (column-major, just like the state). Cells are labeled with their byte
// index so the student can match position-for-position when XORing.
function RoundKeyGrid({ roundKey, round, currentState }) {
  if (!Array.isArray(roundKey) || roundKey.length !== 16) return null;
  return (
    <div className="student-roundkey-card">
      <div className="student-roundkey-head">
        <span className="student-roundkey-title">Round key {typeof round === 'number' ? `· Round ${round}` : ''}</span>
        <span className="student-roundkey-formula">
          new<sub>i</sub> = state<sub>i</sub> ⊕ key<sub>i</sub>
        </span>
      </div>
      <div className="student-roundkey-grid">
        {Array.from({ length: 16 }, (_, i) => {
          const stateByte = currentState?.[i];
          const keyByte = roundKey[i];
          const xorByte = (stateByte ?? 0) ^ (keyByte ?? 0);
          return (
            <div key={i} className="student-roundkey-cell" title={`byte ${i}: ${hex2(stateByte)} ⊕ ${hex2(keyByte)} = ${hex2(xorByte)}`}>
              <span className="student-roundkey-idx">{i.toString(16).toUpperCase()}</span>
              <span className="student-roundkey-byte">{hex2(keyByte)}</span>
            </div>
          );
        })}
      </div>
      <div className="student-roundkey-hex">
        {roundKey.map((b, i) => (
          <span key={i}>{hex2(b)}{i % 4 === 3 && i < 15 ? '  ' : ' '}</span>
        ))}
      </div>
    </div>
  );
}

// Generate step-by-step explanation for a specific operation on a given byte
function explainWrong(stepOp, beforeByte, afterByte) {
  if (stepOp === 'addRoundKey') {
    return `In AddRoundKey, each state byte is XORed with the round key byte. Expected result: ${beforeByte} ⊕ key = ${afterByte}. Your input differs.`;
  }
  if (stepOp === 'invSubBytes') {
    return `InvSubBytes uses the inverse S-Box. 0x${hex2(beforeByte)} maps to 0x${hex2(afterByte)}. Check the S-Box table.`;
  }
  if (stepOp === 'invShiftRows') {
    return `InvShiftRows rotates bytes within each row. The byte moved from column to column. Check row shift amounts.`;
  }
  if (stepOp === 'invMixColumns') {
    return `InvMixColumns multiplies the column by the inverse MDS matrix in GF(2⁸). The correct value is 0x${hex2(afterByte)}.`;
  }
  return `The expected value is 0x${hex2(afterByte)}. Recalculate the operation.`;
}

export default function StudentStepInput({ currentStep, nextStep, onCorrect }) {
  const [values, setValues] = useState(() => Array(16).fill(''));
  const [wrong, setWrong] = useState(() => Array(16).fill(false));
  const [checked, setChecked] = useState(false);
  const [message, setMessage] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const [autoFillTriggered, setAutoFillTriggered] = useState(false);
  const refs = useRef([]);

  useEffect(() => {
    setValues(Array(16).fill(''));
    setWrong(Array(16).fill(false));
    setChecked(false);
    setMessage('');
    setCorrectCount(0);
    setAutoFillTriggered(false);
  }, [currentStep?.label, nextStep?.label]);

  const expected = nextStep?.state || null;
  const complete = values.every(v => /^[0-9A-Fa-f]{2}$/.test(v));
  const nextLabel = nextStep?.label || 'No next step';

  const wrongCount = useMemo(() => wrong.filter(Boolean).length, [wrong]);

  // Auto-fill remaining after 3 correct answers (but only once per step)
  function autoFillRemaining() {
    if (!expected || autoFillTriggered) return;
    const newValues = [...values];
    for (let i = 0; i < 16; i++) {
      if (!newValues[i] || newValues[i].length !== 2) {
        newValues[i] = hex2(expected[i]);
      }
    }
    setValues(newValues);
    setAutoFillTriggered(true);
    setMessage('Auto-filled remaining bytes. Click "Check my state" to proceed.');
  }

  function updateCell(i, raw) {
    const clean = raw.replace(/[^0-9a-fA-F]/g, '').slice(0, 2).toUpperCase();
    const copy = [...values];
    copy[i] = clean;
    setValues(copy);
    // Recompute wrong if already checked
    if (checked) {
      const wrongCopy = [...wrong];
      wrongCopy[i] = expected ? clean !== hex2(expected[i]) : false;
      setWrong(wrongCopy);
      // Update correct count
      const newCorrect = wrongCopy.filter(w => !w).length;
      setCorrectCount(newCorrect);
      if (newCorrect >= 3 && !autoFillTriggered) {
        setMessage('🎉 You got 3 bytes correct! You can now auto-fill the rest.');
      }
    }
    if (clean.length === 2 && i < 15) refs.current[i + 1]?.focus();
  }

  function checkAnswer() {
    if (!expected) return;
    const nextWrong = values.map((v, i) => v.toUpperCase() !== hex2(expected[i]));
    const ok = nextWrong.every(x => !x);
    setWrong(nextWrong);
    setChecked(true);
    const correct = nextWrong.filter(w => !w).length;
    setCorrectCount(correct);
    if (ok) {
      setMessage('Correct ✅ Moving to the next AES step...');
      setTimeout(() => onCorrect?.(), 450);
    } else {
      // Find first wrong byte and give detailed explanation
      const firstWrongIdx = nextWrong.findIndex(w => w);
      const beforeVal = currentStep?.state?.[firstWrongIdx] ?? 0;
      const afterVal = expected[firstWrongIdx];
      const explanation = explainWrong(nextStep.op, beforeVal, afterVal);
      setMessage(`❌ ${nextWrong.filter(Boolean).length} byte(s) wrong. ${explanation} (byte index ${firstWrongIdx})`);
    }
  }

  function hint() {
    if (!expected) return;
    const idx = values.findIndex((v, i) => v.toUpperCase() !== hex2(expected[i]));
    if (idx >= 0) {
      const before = currentStep?.state?.[idx] ?? 0;
      const after = expected[idx];
      let hintText = '';
      if (nextStep.op === 'addRoundKey') {
        const roundKey = nextStep.roundKey || [];
        const keyByte = roundKey[idx] ?? 0;
        hintText = `Byte ${idx}: ${hex2(before)} ⊕ ${hex2(keyByte)} = ${hex2(after)}. XOR binary: ${bin2(before)} ⊕ ${bin2(keyByte)} = ${bin2(after)}.`;
      } else if (nextStep.op === 'invSubBytes') {
        hintText = `Byte ${idx}: InvSBox(0x${hex2(before)}) = 0x${hex2(after)}. Check row ${(before >> 4) & 0xf}, col ${before & 0xf}.`;
      } else {
        hintText = `Byte ${idx}: Expected 0x${hex2(after)}. Re-apply ${opName(nextStep.op)} to the current state.`;
      }
      setMessage(`🔍 Hint: ${hintText}`);
    }
  }

  function clearGrid() {
    setValues(Array(16).fill(''));
    setWrong(Array(16).fill(false));
    setChecked(false);
    setMessage('');
    setCorrectCount(0);
    setAutoFillTriggered(false);
  }

  if (!currentStep || !nextStep || !expected) {
    return (
      <section className="student-step-card">
        <div className="student-step-title">Student calculation mode</div>
        <p className="upgrade-muted">Start the visualizer to enter the next AES state manually.</p>
      </section>
    );
  }

  return (
    <section className="student-step-card">
      <div className="student-step-head">
        <div>
          <div className="student-step-title">Student calculation mode</div>
          <p className="upgrade-muted">
            Calculate the next state for <b>{opName(nextStep.op)}</b>, then type all 16 hex bytes. Correct answer advances automatically.
          </p>
        </div>
        <div className={`student-score ${checked ? (wrongCount === 0 ? 'ok' : 'bad') : ''}`}>
          {checked ? (wrongCount === 0 ? '16/16' : `${16 - wrongCount}/16`) : 'unchecked'}
        </div>
      </div>

      <div className="next-target-label">Target step: {nextLabel}</div>

      {isAddRoundKeyOp(nextStep.op) && (
        <RoundKeyGrid
          roundKey={nextStep.roundKey}
          round={nextStep.round}
          currentState={currentStep?.state}
        />
      )}

      <div className="student-grid-wrap">
        <div className="student-grid">
          {values.map((v, i) => (
            <motion.input
              key={i}
              ref={el => refs.current[i] = el}
              value={v}
              onChange={e => updateCell(i, e.target.value)}
              onFocus={e => e.target.select()}
              className={`student-byte ${wrong[i] ? 'wrong' : checked && v ? 'right' : ''}`}
              maxLength={2}
              placeholder="00"
              spellCheck={false}
              animate={wrong[i] ? { boxShadow: ['0 0 0 0 rgba(220,38,38,0)', '0 0 0 5px rgba(220,38,38,.22)', '0 0 0 0 rgba(220,38,38,0)'] } : {}}
              transition={{ duration: 0.8 }}
            />
          ))}
        </div>
        <div className="student-guide">
          <b>How to use:</b><br />
          1) Look at the current matrix above.<br />
          2) Apply the next AES operation yourself.<br />
          3) Type the resulting 16 bytes here.<br />
          4) Red cells mean incorrect bytes.
        </div>
      </div>

      {message && <div className={`student-message ${wrongCount === 0 && checked ? 'ok' : 'bad'}`}>{message}</div>}

      <div className="student-actions">
        <button className="btn-control" onClick={clearGrid}>Clear</button>
        <button className="btn-control" onClick={hint}>💡 Hint</button>
        {correctCount >= 3 && !autoFillTriggered && (
          <button className="btn-control active" onClick={autoFillRemaining}>⚡ Auto‑fill rest (3+ correct)</button>
        )}
        <button className="btn-control active" onClick={checkAnswer} disabled={!complete}>Check my state</button>
      </div>
    </section>
  );
}