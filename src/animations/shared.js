export const CELL = 72;   
export const GAP  = 5;    
export const STEP = CELL + GAP; 

export function toRowMajor(state) {
  const out = [];
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 4; col++)
      out.push({
        value:      state[col * 4 + row],
        row, col,
        linearIdx:  col * 4 + row,   
        displayIdx: row * 4 + col,   
      });
  return out;
}

export function hex2(v) {
  return (v ?? 0).toString(16).padStart(2, '0').toUpperCase();
}

export function getShiftTargetCol(row, col) {
  return (col + row) % 4;
}

export function getShiftDeltaX(row, col) {
  const targetCol = getShiftTargetCol(row, col);
  let delta = (targetCol - col) * STEP;
  
  if (delta > 2 * STEP)  delta -= 4 * STEP;
  if (delta < -2 * STEP) delta += 4 * STEP;
  return delta;
}
