# AES Visualizer — Interactive Cryptography Project

This project is an educational AES visualization application. It demonstrates AES key generation, encryption, decryption, round transformations, key schedule, avalanche effect, and interactive student calculation.

## Main features

- AES-128 and AES-256 support
- AES decryption visualization step by step
- AES encryption visualization step by step
- Key generation and key schedule view
- SubBytes / InvSubBytes, ShiftRows / InvShiftRows, MixColumns / InvMixColumns, AddRoundKey explanations
- Before → After byte comparison
- Changed bytes and changed bits counter
- Mini quiz mode
- Student calculation mode: the user manually types the next AES state and the app checks each byte
- Incorrect bytes are highlighted in red
- Correct answer automatically moves to the next AES step
- Normal calculation buttons are still available: Back, Next step, Auto-play, Timeline

## How to run

```powershell
cd "C:\Users\nimde\OneDrive\Desktop\aes-visualizer-master"
npm.cmd install
npm.cmd run dev
```

Then open:

```text
http://localhost:5173/
```

## Student calculation mode

1. Start AES decryption or encryption.
2. Look at the current AES state matrix.
3. Calculate the next AES operation manually.
4. Type the 16 resulting bytes into the Student calculation mode grid.
5. Click **Check my state**.
6. If some bytes are incorrect, they become red.
7. If all bytes are correct, the visualizer moves to the next step.

The normal AES calculation engine remains inside the application, so the project still supports automatic demonstration and step-by-step verification.
