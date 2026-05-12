import { useMemo, useState } from 'react';
import { INV_SBOX, SBOX } from '../aes';

function hex2(b) { return (b ?? 0).toString(16).padStart(2, '0').toUpperCase(); }
function bitDiff(a, b) {
  let x = (a ^ b) & 0xff, c = 0;
  while (x) { c += x & 1; x >>= 1; }
  return c;
}

const QUIZ = {
  init: { q: 'What should happen first in AES decryption?', a: 'AddRoundKey', opts: ['InvMixColumns', 'AddRoundKey', 'ShiftRows'] },
  addRoundKey: { q: 'Which operation is used with the round key?', a: 'XOR', opts: ['XOR', 'Division', 'Sorting'] },
  invSubBytes: { q: 'Which table is used here?', a: 'Inverse S-Box', opts: ['RCON only', 'Inverse S-Box', 'ASCII table'] },
  invShiftRows: { q: 'Which direction do rows move in decryption?', a: 'Right', opts: ['Left', 'Right', 'Random'] },
  invMixColumns: { q: 'What does InvMixColumns restore?', a: 'Column mixing', opts: ['Key length', 'Column mixing', 'Plain text font'] },
  final: { q: 'What is recovered at the final step?', a: 'Plaintext', opts: ['Plaintext', 'Public key', 'Hash value'] },
  subBytes: { q: 'Which table is used in encryption SubBytes?', a: 'S-Box', opts: ['S-Box', 'Inverse S-Box', 'ASCII table'] },
  shiftRows: { q: 'Which direction do rows move in encryption?', a: 'Left', opts: ['Right', 'Left', 'Up'] },
  mixColumns: { q: 'What does MixColumns create?', a: 'Diffusion', opts: ['Diffusion', 'Key generation only', 'Compression'] },
  finalCipher: { q: 'What is produced at the final encryption step?', a: 'Ciphertext', opts: ['Ciphertext', 'Private key', 'Hash digest'] },
};

export default function StepInsight({ step, previousState, currentState }) {
  const [answer, setAnswer] = useState(null);
  const changed = useMemo(() => {
    if (!previousState || !currentState) return [];
    return currentState.map((b, i) => ({ index: i, before: previousState[i], after: b, bits: bitDiff(previousState[i], b) }))
      .filter(x => x.before !== x.after);
  }, [previousState, currentState]);
  const totalBitChanges = changed.reduce((s, x) => s + x.bits, 0);
  const op = step?.op || 'init';
  const quiz = QUIZ[op] || QUIZ.init;

  const sboxByte = changed[0]?.before ?? currentState?.[0] ?? 0;
  const isSub = op === 'invSubBytes' || op === 'subBytes';
  const tableValue = op === 'invSubBytes' ? INV_SBOX[sboxByte] : SBOX[sboxByte];

  return (
    <div className="upgrade-grid">
      <section className="upgrade-card">
        <div className="upgrade-title">Before → After comparison</div>
        <p className="upgrade-muted">Changed bytes are counted for this exact AES operation.</p>
        <div className="metric-row">
          <div className="metric-box"><b>{changed.length}</b><span>changed bytes</span></div>
          <div className="metric-box"><b>{totalBitChanges}</b><span>changed bits</span></div>
          <div className="metric-box"><b>{step?.round ?? 0}</b><span>round</span></div>
        </div>
        <div className="diff-strip">
          {changed.slice(0, 8).map(x => (
            <span key={x.index} className="diff-pill">{hex2(x.before)} → {hex2(x.after)}</span>
          ))}
          {changed.length > 8 && <span className="diff-pill">+{changed.length - 8} more</span>}
          {changed.length === 0 && <span className="diff-pill">No byte change yet</span>}
        </div>
      </section>

      <section className="upgrade-card">
        <div className="upgrade-title">Mini quiz mode</div>
        <p className="upgrade-muted">Use this during defense to prove the app is interactive, not only animated.</p>
        <div className="quiz-question">{quiz.q}</div>
        <div className="quiz-options">
          {quiz.opts.map(opt => (
            <button key={opt} className={`quiz-btn ${answer === opt ? (opt === quiz.a ? 'ok' : 'bad') : ''}`} onClick={() => setAnswer(opt)}>{opt}</button>
          ))}
        </div>
        {answer && <div className="quiz-feedback">{answer === quiz.a ? 'Correct ✅' : `Not correct. Correct answer: ${quiz.a}`}</div>}
      </section>

      <section className="upgrade-card">
        <div className="upgrade-title">S-Box lookup assistant</div>
        {isSub ? (
          <p className="upgrade-muted">Example byte: 0x{hex2(sboxByte)} → 0x{hex2(tableValue)} using {op === 'invSubBytes' ? 'Inverse S-Box' : 'S-Box'}.</p>
        ) : (
          <p className="upgrade-muted">S-Box explanation appears automatically during SubBytes / InvSubBytes steps.</p>
        )}
      </section>
    </div>
  );
}
