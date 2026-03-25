# private-voting-mxe — Anonymous Governance on Arcium

> Sealed ballots tallied inside Arcium MXE. Individual votes are never decrypted on-chain — only the aggregate result is revealed.

[![Solana Devnet](https://img.shields.io/badge/Solana-devnet-9945FF)](https://explorer.solana.com/address/S43YKqU6x229PdY5oUssPoD2UgH4EDUvugYos6WxvDY?cluster=devnet)
[![Arcium MXE](https://img.shields.io/badge/Arcium-MXE%20cluster%20456-00D4FF)](https://arcium.com)
[![Anchor](https://img.shields.io/badge/Anchor-0.32.1-orange)](https://anchor-lang.com)
[![arcium-client](https://img.shields.io/badge/arcium--client-0.9.3-blue)](https://www.npmjs.com/package/@arcium-hq/client)

---

## Deployed Program

| Network | Program ID |
|---|---|
| **Solana Devnet** | [`S43YKqU6x229PdY5oUssPoD2UgH4EDUvugYos6WxvDY`](https://explorer.solana.com/address/S43YKqU6x229PdY5oUssPoD2UgH4EDUvugYos6WxvDY?cluster=devnet) |
| MXE Cluster | offset `456` (Arcium devnet) |

---

## What It Does

`add_together` (used as vote tallying) takes two encrypted ballot values (0=No, 1=Yes), tallies them inside the MXE, and emits an encrypted `SumEvent`. Neither vote is visible on-chain before or after the tally.

```
Voter A: encrypt(1) = Yes vote — encrypted with MXE pubkey
Voter B: encrypt(1) = Yes vote — encrypted with MXE pubkey
        │
        ▼
Solana: add_together instruction
        │  encrypted ballots queued for MXE computation
        ▼
Arcium MXE cluster 456
        │  tallies votes privately: vote_a + vote_b
        │  result encrypted for governance contract
        ▼
Solana: add_together_callback
        │  emits SumEvent { sum: encrypted_tally, nonce }
        ▼
Governance contract decrypts tally → proposal passes/fails
```

---

## Quick Start

```bash
git clone https://github.com/gnoesy/private-voting-mxe
cd private-voting-mxe
yarn install

ANCHOR_WALLET=~/.config/solana/devnet.json \
npx ts-node --transpile-only scripts/run_demo.ts
```

Expected output:
```json
{"event":"demo_start","description":"Anonymous governance vote"}
{"event":"votes_cast","vote1":"encrypted (1=Yes)","vote2":"encrypted (1=Yes)"}
{"event":"vote_queued","sig":"...","explorer":"https://explorer.solana.com/tx/...?cluster=devnet"}
```

---

## On-chain Instructions

| Instruction | Description |
|---|---|
| `init_add_together_comp_def` | Register computation definition (run once) |
| `add_together` | Queue encrypted vote tally with two ballot ciphertexts |
| `add_together_callback` | MXE callback — emits `SumEvent { sum, nonce }` |

---

## Project Structure

```
private-voting-mxe/
├── programs/private_voting/src/lib.rs   # Solana program
├── encrypted-ixs/src/lib.rs             # ARCIS vote tallying circuit
├── scripts/
│   └── run_demo.ts                      # Demo: cast encrypted votes
├── build/
│   └── add_together.arcis               # Compiled ARCIS circuit
├── Anchor.toml
└── Arcium.toml                          # cluster offset: 456
```

---

## Related MXE Programs

| Program | Program ID |
|---|---|
| [hello-world-mxe](https://github.com/gnoesy/hello-world-mxe) | `3TysCyYXyWpqNXDnQiwA4C2KiMSxGmBbTJADtGwFVeLr` |
| [encrypted-defi-mxe](https://github.com/gnoesy/encrypted-defi-mxe) | `AmzMmGcKUqMWf57WPXhHBkE9QzrbXCc1emFK6hsVJTj7` |
| [encrypted-voting-mxe](https://github.com/gnoesy/encrypted-voting-mxe) | `FoCgMmXj37JaMcbYrAnBDCWaaQE6FYzEBzMuAkXBZ7XF` |
| [encrypted-identity-mxe](https://github.com/gnoesy/encrypted-identity-mxe) | `3zYA4ykzGofqeH6m6aET46AQNgBVtEa2XotAVX6TXgBV` |

---

## Devnet Explorer

- [Program](https://explorer.solana.com/address/S43YKqU6x229PdY5oUssPoD2UgH4EDUvugYos6WxvDY?cluster=devnet)
- [Deployer](https://explorer.solana.com/address/4Y8R73V9QpmL2oUtS4LrwdZk3LrPRCLp7KGg2npPkB1u?cluster=devnet)
