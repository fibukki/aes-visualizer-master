import { useEffect, useRef, useState } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { toRowMajor, hex2, CELL, GAP, STEP, getShiftTargetCol, getShiftDeltaX } from './shared';

const SNAP_TOLERANCE = 28; 

function DraggableCell({ value, row, col, onPlaced, placed, feedbackKey }) {
  const targetCol = getShiftTargetCol(row, col);
  const targetDx  = getShiftDeltaX(row, col);
  const [x, setX] = useState(0);
  const [fb, setFb] = useState(null); 

  useEffect(() => { if (feedbackKey) { setFb('err'); setTimeout(() => setFb(null), 700); } }, [feedbackKey]);

  if (placed) {
    return (
      <motion.div
        initial={{ x: targetDx * 0 }}
        animate={{ x: targetDx }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="state-cell"
        style={{
          position: 'absolute',
          left: col * STEP,
          color: 'var(--accent-green)',
          borderColor: 'var(--accent-green)',
          background: 'color-mix(in srgb, var(--accent-green) 10%, var(--bg-card2))',
          zIndex: 5,
          fontSize: 22, fontWeight: 700,
          fontFamily: 'Share Tech Mono, monospace',
        }}
      >
        {hex2(value)}
        <span style={{ position: 'absolute', top: 3, right: 4, fontSize: 12, color: 'var(--accent-green)', fontWeight: 900 }}>✓</span>
      </motion.div>
    );
  }

  return (
    <>
      
      <div style={{
        position: 'absolute',
        left: col * STEP + targetDx,
        width: CELL, height: CELL,
        border: '2px dashed color-mix(in srgb, var(--accent) 40%, transparent)',
        background: 'color-mix(in srgb, var(--accent) 5%, transparent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Share Tech Mono, monospace',
        fontSize: 14, color: 'color-mix(in srgb, var(--accent) 30%, transparent)',
        fontWeight: 700, letterSpacing: 1,
        boxSizing: 'border-box',
        pointerEvents: 'none',
      }}>
        {targetCol}
      </div>

      <motion.div
        drag="x"
        dragMomentum={false}
        dragElastic={0.08}
        dragConstraints={{ left: -col * STEP - 4, right: (3 - col) * STEP + 4 }}
        style={{
          position: 'absolute',
          left: col * STEP,
          x,
          cursor: 'grab',
          zIndex: 10,
          width: CELL, height: CELL,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `2px solid ${fb === 'err' ? 'var(--accent-red)' : 'var(--border)'}`,
          background: fb === 'err'
            ? 'color-mix(in srgb, var(--accent-red) 12%, var(--bg-card2))'
            : 'var(--bg-card2)',
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: 22, fontWeight: 700,
          color: 'var(--text)',
          userSelect: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.2s, background 0.2s',
        }}
        whileDrag={{ scale: 1.08, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', cursor: 'grabbing', zIndex: 20 }}
        onDragEnd={(_, info) => {
          const draggedX = info.offset.x;
          if (Math.abs(draggedX - targetDx) < SNAP_TOLERANCE) {
            onPlaced(col, true);
          } else {
            setFb('err');
            setTimeout(() => setFb(null), 700);
          }
        }}
      >
        {hex2(value)}
        {fb === 'err' && (
          <motion.span
            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            style={{ position: 'absolute', top: 3, right: 4, fontSize: 14, color: 'var(--accent-red)', fontWeight: 900 }}
          >
            ✕
          </motion.span>
        )}
      </motion.div>
    </>
  );
}

function StaticCell({ value, col }) {
  return (
    <div className="state-cell" style={{
      position: 'absolute', left: col * STEP,
      fontSize: 22, fontWeight: 700, fontFamily: 'Share Tech Mono, monospace',
      color: 'var(--text-3)',
    }}>
      {hex2(value)}
    </div>
  );
}

export default function ShiftDrag({ fromState, toState, onDone }) {
  const cells = toRowMajor(fromState);

  const [placed, setPlaced] = useState({ 1: [false,false,false,false], 2: [false,false,false,false], 3: [false,false,false,false] });
  const [feedbackKeys, setFbKeys] = useState({});
  const [allDone, setAllDone] = useState(false);

  function handlePlaced(row, col, correct) {
    if (!correct) {
      setFbKeys(prev => ({ ...prev, [`${row}-${col}`]: Date.now() }));
      return;
    }
    setPlaced(prev => {
      const next = { ...prev, [row]: [...prev[row]] };
      next[row][col] = true;
      return next;
    });
  }

  useEffect(() => {
    const allRowsDone = [1,2,3].every(r => placed[r].every(Boolean));
    if (allRowsDone && !allDone) {
      setAllDone(true);
      setTimeout(() => onDone?.(), 600);
    }
  }, [placed]);

  const rowCells = (row) => cells.filter(c => c.row === row);

  const completedRows = [1,2,3].filter(r => placed[r].every(Boolean));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
      
      <div style={{
        fontFamily: 'Orbitron, monospace', fontSize: 9, fontWeight: 700,
        color: 'var(--accent)', letterSpacing: 2, marginBottom: 4,
        textAlign: 'center',
      }}>
        DRAG EACH BYTE TO ITS NEW COLUMN
      </div>

      <div style={{ display: 'flex', gap: GAP, paddingLeft: 2 }}>
        {['Col 0','Col 1','Col 2','Col 3'].map(l => (
          <div key={l} style={{
            width: CELL, textAlign: 'center',
            fontFamily: 'Orbitron, monospace', fontSize: 7, color: 'var(--text-dim)', letterSpacing: 1,
          }}>{l}</div>
        ))}
      </div>

      <div style={{ position: 'relative', height: CELL, width: 4 * STEP - GAP }}>
        {rowCells(0).map(({ value, col }) => (
          <StaticCell key={col} value={value} col={col} />
        ))}
        <div style={{
          position: 'absolute', right: -44, top: '50%', transform: 'translateY(-50%)',
          fontFamily: 'Orbitron, monospace', fontSize: 8, color: 'var(--text-dim)', letterSpacing: 1,
        }}>
          +0
        </div>
      </div>

      {[1,2,3].map(row => {
        const rowComplete = placed[row].every(Boolean);
        return (
          <div key={row} style={{
            position: 'relative', height: CELL, width: 4 * STEP - GAP,
            outline: rowComplete ? '1px solid var(--accent-green)' : '1px solid transparent',
            transition: 'outline-color 0.3s',
          }}>
            {rowCells(row).map(({ value, col }) => (
              <DraggableCell
                key={`${row}-${col}`}
                value={value} row={row} col={col}
                placed={placed[row][col]}
                feedbackKey={feedbackKeys[`${row}-${col}`]}
                onPlaced={(c, ok) => handlePlaced(row, c, ok)}
              />
            ))}
            <div style={{
              position: 'absolute', right: -44, top: '50%', transform: 'translateY(-50%)',
              fontFamily: 'Orbitron, monospace', fontSize: 8,
              color: rowComplete ? 'var(--accent-green)' : 'var(--accent)', letterSpacing: 1,
            }}>
              {rowComplete ? '✓' : `+${row}`}
            </div>
          </div>
        );
      })}

      <div style={{
        marginTop: 8, display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap',
      }}>
        {[1,2,3].map(r => {
          const done = placed[r].every(Boolean);
          return (
            <div key={r} style={{
              fontFamily: 'Orbitron, monospace', fontSize: 8, letterSpacing: 1,
              padding: '4px 10px',
              border: `1px solid ${done ? 'var(--accent-green)' : 'var(--border)'}`,
              color: done ? 'var(--accent-green)' : 'var(--text-3)',
              background: done ? 'color-mix(in srgb, var(--accent-green) 8%, transparent)' : 'transparent',
              transition: 'all 0.3s',
            }}>
              ROW {r}: {placed[r].filter(Boolean).length}/4 {done ? '✓' : ''}
            </div>
          );
        })}
      </div>

      {completedRows.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{
            marginTop: 6, padding: '10px 12px',
            background: 'color-mix(in srgb, var(--accent-green) 6%, var(--bg-card))',
            border: '1px solid color-mix(in srgb, var(--accent-green) 30%, transparent)',
            fontFamily: 'Exo 2, sans-serif', fontSize: 12, color: 'var(--text)',
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: 'var(--accent-green)', fontFamily: 'Orbitron, monospace', fontSize: 9, letterSpacing: 1 }}>
            WHY THIS MOVE IS CORRECT:
          </strong>
          <br />
          InvShiftRows undoes encryption's ShiftRows, which cyclic-shifted rows LEFT.
          Row {completedRows[0]} was shifted left by {completedRows[0]}, so it shifts RIGHT
          by {completedRows[0]} to recover the original column order.
        </motion.div>
      )}
    </div>
  );
}
