// AES core — supports both AES-128 (Nk=4, Nr=10) and AES-256 (Nk=8, Nr=14).
// All public APIs accept either a 16-byte or 32-byte key.

const SBOX = [
  0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
  0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
  0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
  0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
  0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
  0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
  0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
  0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
  0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
  0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
  0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
  0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
  0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
  0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
  0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
  0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16,
];

const INV_SBOX = new Array(256);
for (let i = 0; i < 256; i++) INV_SBOX[SBOX[i]] = i;
export { SBOX, INV_SBOX };

// Round constants — extended enough for AES-256 (need indices 1..7).
const RCON = [0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36];

function gmul(a, b) {
  let p = 0;
  for (let i = 0; i < 8; i++) {
    if (b & 1) p ^= a;
    const hiBit = a & 0x80;
    a = (a << 1) & 0xff;
    if (hiBit) a ^= 0x1b;
    b >>= 1;
  }
  return p;
}

// ─────────────────────────────────────────────────────────────
// Mode helpers
// ─────────────────────────────────────────────────────────────

/** Derive (Nk, Nr) from a key. Accepts 16-byte (AES-128) or 32-byte (AES-256). */
export function modeFromKey(keyBytes) {
  if (keyBytes.length === 16) return { Nk: 4,  Nr: 10, bits: 128 };
  if (keyBytes.length === 32) return { Nk: 8,  Nr: 14, bits: 256 };
  if (keyBytes.length === 24) return { Nk: 6,  Nr: 12, bits: 192 };
  throw new Error(`Unsupported AES key length: ${keyBytes.length} bytes`);
}

// ─────────────────────────────────────────────────────────────
// Key expansion (parameterized for AES-128 / 192 / 256)
// ─────────────────────────────────────────────────────────────

export function expandKey(keyBytes) {
  const { Nk, Nr } = modeFromKey(keyBytes);
  const totalWords = 4 * (Nr + 1);
  const w = [];

  for (let i = 0; i < Nk; i++) {
    w.push([keyBytes[4*i], keyBytes[4*i+1], keyBytes[4*i+2], keyBytes[4*i+3]]);
  }

  for (let i = Nk; i < totalWords; i++) {
    let temp = [...w[i-1]];

    if (i % Nk === 0) {
      // RotWord + SubWord + RCON XOR
      temp = [temp[1], temp[2], temp[3], temp[0]];
      temp = temp.map(b => SBOX[b]);
      temp[0] ^= RCON[i / Nk - 1];
    } else if (Nk > 6 && i % Nk === 4) {
      // AES-256-only extra SubWord
      temp = temp.map(b => SBOX[b]);
    }

    w.push(w[i - Nk].map((b, j) => b ^ temp[j]));
  }

  const roundKeys = [];
  for (let r = 0; r <= Nr; r++) {
    const rk = [];
    for (let c = 0; c < 4; c++) rk.push(...w[r * 4 + c]);
    roundKeys.push(rk);
  }
  return roundKeys;
}

// ─────────────────────────────────────────────────────────────
// Round operations
// ─────────────────────────────────────────────────────────────

export function addRoundKey(state, roundKey) {
  return state.map((b, i) => b ^ roundKey[i]);
}

export function invSubBytes(state) {
  return state.map(b => INV_SBOX[b]);
}

export function invShiftRows(state) {
  const s = [...state];
  [s[1],s[5],s[9],s[13]]   = [s[13],s[1],s[5],s[9]];
  [s[2],s[6],s[10],s[14]]  = [s[10],s[14],s[2],s[6]];
  [s[3],s[7],s[11],s[15]]  = [s[7],s[11],s[15],s[3]];
  return s;
}

export function invMixColumns(state) {
  const s = [...state];
  for (let c = 0; c < 4; c++) {
    const i = c * 4;
    const [a,b,d,e] = [s[i],s[i+1],s[i+2],s[i+3]];
    s[i]   = gmul(a,0x0e)^gmul(b,0x0b)^gmul(d,0x0d)^gmul(e,0x09);
    s[i+1] = gmul(a,0x09)^gmul(b,0x0e)^gmul(d,0x0b)^gmul(e,0x0d);
    s[i+2] = gmul(a,0x0d)^gmul(b,0x09)^gmul(d,0x0e)^gmul(e,0x0b);
    s[i+3] = gmul(a,0x0b)^gmul(b,0x0d)^gmul(d,0x09)^gmul(e,0x0e);
  }
  return s;
}

function subBytes(state) { return state.map(b => SBOX[b]); }

function shiftRows(state) {
  const s = [...state];
  [s[1],s[5],s[9],s[13]]  = [s[5],s[9],s[13],s[1]];
  [s[2],s[6],s[10],s[14]] = [s[10],s[14],s[2],s[6]];
  [s[3],s[7],s[11],s[15]] = [s[15],s[3],s[7],s[11]];
  return s;
}

function xtime(a) { return ((a << 1) ^ (a & 0x80 ? 0x1b : 0x00)) & 0xff; }

function mixColumns(state) {
  const s = [...state];
  for (let c = 0; c < 4; c++) {
    const i = c * 4;
    const [a,b,d,e] = [s[i],s[i+1],s[i+2],s[i+3]];
    s[i]   = xtime(a)^xtime(b)^b^d^e;
    s[i+1] = a^xtime(b)^xtime(d)^d^e;
    s[i+2] = a^b^xtime(d)^xtime(e)^e;
    s[i+3] = xtime(a)^a^b^d^xtime(e);
  }
  return s;
}

// ─────────────────────────────────────────────────────────────
// Full encrypt — works for any supported key size
// ─────────────────────────────────────────────────────────────

export function encrypt(plaintext, keyBytes) {
  const { Nr } = modeFromKey(keyBytes);
  const roundKeys = expandKey(keyBytes);

  let state = addRoundKey([...plaintext], roundKeys[0]);
  for (let r = 1; r < Nr; r++) {
    state = subBytes(state);
    state = shiftRows(state);
    state = mixColumns(state);
    state = addRoundKey(state, roundKeys[r]);
  }
  state = subBytes(state);
  state = shiftRows(state);
  state = addRoundKey(state, roundKeys[Nr]);
  return state;
}

// ─────────────────────────────────────────────────────────────
// Step-by-step decryption visualizer
// ─────────────────────────────────────────────────────────────

export class AESVisualizer {
  constructor(ciphertext, keyBytes) {
    const { Nr, Nk, bits } = modeFromKey(keyBytes);
    this.Nr = Nr;
    this.Nk = Nk;
    this.bits = bits;
    this.roundKeys = expandKey(keyBytes);
    this.keyBytes  = keyBytes;
    this.steps     = this._buildSteps(ciphertext);
    this.currentStep = 0;
  }

  _buildSteps(ct) {
    const { Nr } = this;
    const steps = [];
    let state = [...ct];

    steps.push({ label: 'Initial Ciphertext', state: [...state], op: 'init', round: 0 });

    state = addRoundKey(state, this.roundKeys[Nr]);
    steps.push({
      label: `AddRoundKey (Round ${Nr})`,
      state: [...state], op: 'addRoundKey', round: Nr,
      roundKey: [...this.roundKeys[Nr]],
    });

    for (let r = Nr - 1; r >= 1; r--) {
      state = invShiftRows(state);
      steps.push({ label: `InvShiftRows (Round ${r})`, state: [...state], op: 'invShiftRows', round: r });

      state = invSubBytes(state);
      steps.push({ label: `InvSubBytes (Round ${r})`, state: [...state], op: 'invSubBytes', round: r });

      state = addRoundKey(state, this.roundKeys[r]);
      steps.push({
        label: `AddRoundKey (Round ${r})`, state: [...state], op: 'addRoundKey',
        round: r, roundKey: [...this.roundKeys[r]],
      });

      state = invMixColumns(state);
      steps.push({ label: `InvMixColumns (Round ${r})`, state: [...state], op: 'invMixColumns', round: r });
    }

    state = invShiftRows(state);
    steps.push({ label: 'InvShiftRows (Round 0)', state: [...state], op: 'invShiftRows', round: 0 });

    state = invSubBytes(state);
    steps.push({ label: 'InvSubBytes (Round 0)', state: [...state], op: 'invSubBytes', round: 0 });

    state = addRoundKey(state, this.roundKeys[0]);
    steps.push({
      label: 'AddRoundKey (Round 0) — Plaintext!', state: [...state], op: 'final',
      round: 0, roundKey: [...this.roundKeys[0]],
    });

    return steps;
  }

  get totalSteps() { return this.steps.length; }
  get current()    { return this.steps[this.currentStep]; }

  executeNextStep() {
    if (this.currentStep < this.steps.length - 1) this.currentStep++;
    return this.current;
  }

  reset() { this.currentStep = 0; }
  goToStep(n) {
    this.currentStep = Math.max(0, Math.min(n, this.steps.length - 1));
  }
}

// ─────────────────────────────────────────────────────────────
// Step-by-step encryption visualizer (added for full project demo)
// ─────────────────────────────────────────────────────────────
export class AESEncryptionVisualizer {
  constructor(plaintext, keyBytes) {
    const { Nr, Nk, bits } = modeFromKey(keyBytes);
    this.Nr = Nr;
    this.Nk = Nk;
    this.bits = bits;
    this.roundKeys = expandKey(keyBytes);
    this.keyBytes = keyBytes;
    this.steps = this._buildSteps(plaintext);
    this.currentStep = 0;
  }

  _buildSteps(pt) {
    const { Nr } = this;
    const steps = [];
    let state = [...pt];

    steps.push({ label: 'Initial Plaintext', state: [...state], op: 'init', round: 0 });

    state = addRoundKey(state, this.roundKeys[0]);
    steps.push({ label: 'AddRoundKey (Round 0)', state: [...state], op: 'addRoundKey', round: 0, roundKey: [...this.roundKeys[0]] });

    for (let r = 1; r < Nr; r++) {
      state = subBytes(state);
      steps.push({ label: `SubBytes (Round ${r})`, state: [...state], op: 'subBytes', round: r });

      state = shiftRows(state);
      steps.push({ label: `ShiftRows (Round ${r})`, state: [...state], op: 'shiftRows', round: r });

      state = mixColumns(state);
      steps.push({ label: `MixColumns (Round ${r})`, state: [...state], op: 'mixColumns', round: r });

      state = addRoundKey(state, this.roundKeys[r]);
      steps.push({ label: `AddRoundKey (Round ${r})`, state: [...state], op: 'addRoundKey', round: r, roundKey: [...this.roundKeys[r]] });
    }

    state = subBytes(state);
    steps.push({ label: `SubBytes (Round ${Nr})`, state: [...state], op: 'subBytes', round: Nr });

    state = shiftRows(state);
    steps.push({ label: `ShiftRows (Round ${Nr})`, state: [...state], op: 'shiftRows', round: Nr });

    state = addRoundKey(state, this.roundKeys[Nr]);
    steps.push({ label: `AddRoundKey (Round ${Nr}) — Ciphertext!`, state: [...state], op: 'finalCipher', round: Nr, roundKey: [...this.roundKeys[Nr]] });

    return steps;
  }

  get totalSteps() { return this.steps.length; }
  get current() { return this.steps[this.currentStep]; }
  executeNextStep() {
    if (this.currentStep < this.steps.length - 1) this.currentStep++;
    return this.current;
  }
  goToStep(n) {
    this.currentStep = Math.max(0, Math.min(n, this.steps.length - 1));
  }
}
