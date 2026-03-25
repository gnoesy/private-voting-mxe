/**
 * private-voting-mxe demo
 * Two voters cast encrypted ballots — MXE tallies without seeing individual votes
 *
 * Usage:
 *   ANCHOR_WALLET=~/.config/solana/devnet.json npx ts-node --transpile-only scripts/run_demo.ts
 */
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { randomBytes } from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  getArciumEnv,
  getCompDefAccOffset,
  RescueCipher,
  getMXEPublicKey,
  getMXEAccAddress,
  getMempoolAccAddress,
  getCompDefAccAddress,
  getExecutingPoolAccAddress,
  getComputationAccAddress,
  getClusterAccAddress,
  x25519,
} from "@arcium-hq/client";

const PROGRAM_ID = new PublicKey("S43YKqU6x229PdY5oUssPoD2UgH4EDUvugYos6WxvDY");

function log(event: string, data: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ event, ...data, ts: new Date().toISOString() }));
}

async function main() {
  process.env.ARCIUM_CLUSTER_OFFSET = "456";

  const walletPath = process.env.ANCHOR_WALLET || `${os.homedir()}/.config/solana/devnet.json`;
  const conn = new anchor.web3.Connection(
    process.env.ANCHOR_PROVIDER_URL || "https://api.devnet.solana.com",
    "confirmed"
  );
  const owner = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath).toString()))
  );
  const provider = new anchor.AnchorProvider(conn, new anchor.Wallet(owner), {
    commitment: "confirmed", skipPreflight: true,
  });
  anchor.setProvider(provider);

  const idl = JSON.parse(fs.readFileSync(path.join(__dirname, "../target/idl/private_voting.json"), "utf-8"));
  const program = new anchor.Program(idl, provider) as anchor.Program<any>;
  const arciumEnv = getArciumEnv();

  log("demo_start", {
    program: PROGRAM_ID.toString(),
    wallet: owner.publicKey.toString(),
    description: "Anonymous governance vote — MXE tallies without revealing individual ballots",
  });

  // x25519 keypair for this session
  const privKey = x25519.utils.randomPrivateKey();
  const pubKey = x25519.getPublicKey(privKey);
  const mxePubKey = await getMXEPublicKey(conn, arciumEnv.arciumClusterOffset);

  // Simulate votes: 1=Yes, 0=No
  const vote1 = 1;
  const vote2 = 1;
  log("votes_cast", {
    vote1: "encrypted (1=Yes)",
    vote2: "encrypted (1=Yes)",
    expected_tally: (vote1 + vote2).toString(),
    privacy: "individual votes never leave encrypted form",
  });

  const nonce = BigInt("0x" + randomBytes(16).toString("hex"));
  const sharedSecret = x25519.getSharedSecret(privKey, mxePubKey);
  const cipher = new RescueCipher(sharedSecret);
  const enc_vote1 = cipher.encrypt([BigInt(vote1)], nonce);
  const enc_vote2 = cipher.encrypt([BigInt(vote2)], nonce + 1n);

  const computationOffset = BigInt("0x" + randomBytes(8).toString("hex"));
  const clusterOffset = arciumEnv.arciumClusterOffset;

  try {
    const sig = await program.methods
      .addTogether(
        computationOffset,
        Array.from(enc_vote1[0]),
        Array.from(enc_vote2[0]),
        Array.from(pubKey),
        nonce
      )
      .accountsPartial({
        payer: owner.publicKey,
        mxeAccount: getMXEAccAddress(PROGRAM_ID),
        mempoolAccount: getMempoolAccAddress(clusterOffset),
        executingPool: getExecutingPoolAccAddress(clusterOffset),
        computationAccount: getComputationAccAddress(clusterOffset, computationOffset),
        compDefAccount: getCompDefAccAddress(
          PROGRAM_ID,
          Buffer.from(getCompDefAccOffset("add_together")).readUInt32LE()
        ),
        clusterAccount: getClusterAccAddress(clusterOffset),
      })
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    log("vote_queued", {
      sig,
      explorer: `https://explorer.solana.com/tx/${sig}?cluster=devnet`,
      note: "Vote tally queued in MXE cluster 456",
    });
  } catch (e: any) {
    log("vote_fail", {
      message: e.message || String(e),
      raw: JSON.stringify(e),
    });
    process.exit(1);
  }
}

main().catch(e => {
  console.error(JSON.stringify({ event: "fatal", message: e.message }));
  process.exit(1);
});
