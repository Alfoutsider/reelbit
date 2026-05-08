/**
 * Merkle tree builder for dividend rounds.
 *
 * Encoding MUST match the on-chain verifier in token-launch::lib.rs:
 *   leaf = sha256(round LE u64 || leaf_index u8 || holder 32 bytes || amount LE u64)
 *   internal = sha256(min(left, right) || max(left, right))   ← sorted siblings
 *
 * Sorted siblings means proofs don't carry position bits; both verifier
 * and builder must lexicographically order each pair.
 */

import { createHash } from "crypto";
import { PublicKey } from "@solana/web3.js";

const sha = (...parts: Buffer[]): Buffer => {
  const h = createHash("sha256");
  for (const p of parts) h.update(p);
  return h.digest();
};

/** Same encoding as build_dividend_leaf in lib.rs. */
export function buildLeaf(
  round:     bigint,
  leafIndex: number,
  holder:    PublicKey,
  amount:    bigint,
): Buffer {
  if (leafIndex < 0 || leafIndex > 99) throw new Error("leafIndex out of range");
  const buf = Buffer.alloc(8 + 1 + 32 + 8);
  buf.writeBigUInt64LE(round, 0);
  buf.writeUInt8(leafIndex, 8);
  holder.toBuffer().copy(buf, 9);
  buf.writeBigUInt64LE(amount, 41);
  return sha(buf);
}

export interface DividendLeaf {
  leafIndex: number;
  holder:    PublicKey;
  amount:    bigint;
}

export interface MerkleTree {
  root:   Buffer;
  leaves: Buffer[];           // hashed leaves, in input order
  proofs: Buffer[][];          // proofs[i] is the proof for leaves[i]
}

/**
 * Build a Merkle tree of the given hashed leaves and emit per-leaf proofs.
 * Uses the sorted-siblings rule (OpenZeppelin compatible).
 *
 * If the leaf count is odd at any level, the last node is duplicated.
 */
export function buildTree(leaves: Buffer[]): MerkleTree {
  if (leaves.length === 0) throw new Error("Cannot build tree with 0 leaves");

  // Each level: an array of nodes; we record per-input-leaf the sibling at
  // each level that the proof needs. We track the index of each leaf as it
  // moves up the tree.
  const levels: Buffer[][] = [leaves.slice()];
  while (levels[levels.length - 1].length > 1) {
    const cur = levels[levels.length - 1];
    const next: Buffer[] = [];
    for (let i = 0; i < cur.length; i += 2) {
      const left  = cur[i];
      const right = i + 1 < cur.length ? cur[i + 1] : cur[i];
      next.push(hashPair(left, right));
    }
    levels.push(next);
  }

  const root = levels[levels.length - 1][0];

  // Build per-leaf proofs
  const proofs: Buffer[][] = leaves.map((_, idx) => {
    const proof: Buffer[] = [];
    let cur = idx;
    for (let depth = 0; depth < levels.length - 1; depth++) {
      const layer = levels[depth];
      const sibIdx = cur ^ 1;            // toggle last bit → sibling
      const sibling = sibIdx < layer.length ? layer[sibIdx] : layer[cur];
      proof.push(sibling);
      cur >>= 1;
    }
    return proof;
  });

  return { root, leaves, proofs };
}

/** Verify a proof — used in tests / debugging. */
export function verifyProof(leaf: Buffer, proof: Buffer[], root: Buffer): boolean {
  let current = leaf;
  for (const sibling of proof) {
    current = hashPair(current, sibling);
  }
  return current.equals(root);
}

function hashPair(a: Buffer, b: Buffer): Buffer {
  return Buffer.compare(a, b) <= 0 ? sha(a, b) : sha(b, a);
}

/** Convenience: build the full {root, proofs[]} for a holder list. */
export function buildDividendTree(
  round:   bigint,
  holders: DividendLeaf[],
): { root: Buffer; entries: Array<DividendLeaf & { proof: Buffer[] }> } {
  const hashedLeaves = holders.map((h) => buildLeaf(round, h.leafIndex, h.holder, h.amount));
  const tree = buildTree(hashedLeaves);
  const entries = holders.map((h, i) => ({ ...h, proof: tree.proofs[i] }));
  return { root: tree.root, entries };
}
