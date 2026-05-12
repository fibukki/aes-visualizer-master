import { motion } from 'framer-motion';

const OP_CLASS = {
  addRoundKey:   'op-ark',
  invSubBytes:   'op-sub',
  invShiftRows:  'op-shr',
  invMixColumns: 'op-mix',
  final:         'op-done',
};

function toRowMajor(state) {
  const out = [];
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 4; col++)
      out.push({ value: state[col * 4 + row], row, col, displayIdx: row * 4 + col });
  return out;
}

export default function StateGrid({
  state, op, prevState,
  highlightCellIdx,       
  interactiveWait,
  clickedRows,
  onRowClick,
}) {
  const cells = toRowMajor(state);
  const prevCells = prevState ? toRowMajor(prevState) : null;
  const opClass = OP_CLASS[op] || '';
  const isShift = op === 'invShiftRows';

  return (
    <div style={{
      display: 'inline-grid',
      gridTemplateColumns: 'repeat(4, 72px)',
      gap: 5,
      padding: 14,
      background: 'var(--bg-card2)',
      border: '2px solid var(--border)',
      position: 'relative',
    }}>
      {cells.map(({ value, row, col, displayIdx }) => {
        const changed = prevCells && prevCells[displayIdx].value !== value;
        const isHl = highlightCellIdx === displayIdx;
        const isClicked = clickedRows?.includes(row);
        const canClick = interactiveWait && !!onRowClick;

        const initX = isShift && changed ? -(row * 72) : 0;
        const initScale = changed && !isShift ? 0.85 : 1;
        const initOpacity = changed ? 0.4 : 1;

        return (
          <motion.div
            key={`r${row}c${col}`}
            className={`state-cell ${opClass} ${isHl ? 'highlighted' : ''} ${isClicked ? 'highlighted' : ''}`}
            initial={{ x: initX, scale: initScale, opacity: initOpacity }}
            animate={{ x: 0, scale: 1, opacity: 1 }}
            transition={{
              duration: 0.38,
              delay: isShift ? row * 0.04 + col * 0.015 : displayIdx * 0.02,
              type: 'spring',
              stiffness: 240,
              damping: 24,
            }}
            onClick={canClick ? () => onRowClick(row) : undefined}
            style={{ cursor: canClick ? 'pointer' : 'default' }}
          >
            {value.toString(16).padStart(2, '0').toUpperCase()}
            {interactiveWait && (
              <span style={{
                position: 'absolute', bottom: 3,
                fontFamily: 'Orbitron, monospace',
                fontSize: 7, letterSpacing: 1,
                color: isClicked ? 'var(--accent-green)' : 'var(--text-dim)',
              }}>
                R{row}
              </span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
