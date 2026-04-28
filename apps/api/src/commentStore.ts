import fs from "fs";
import path from "path";
import { config } from "./config";

export interface Comment {
  id:        string;
  mint:      string;
  wallet:    string;
  text:      string;
  timestamp: number;
  likes:     number;
}

const MAX_PER_MINT = 500;
const MAX_TEXT_LEN = 500;

function dir(): string {
  return path.join(config.dataDir, "comments");
}

function filePath(mint: string): string {
  return path.join(dir(), `${mint}.json`);
}

function readComments(mint: string): Comment[] {
  try {
    return JSON.parse(fs.readFileSync(filePath(mint), "utf-8"));
  } catch {
    return [];
  }
}

function writeComments(mint: string, comments: Comment[]): void {
  fs.mkdirSync(dir(), { recursive: true });
  fs.writeFileSync(filePath(mint), JSON.stringify(comments));
}

export function getComments(mint: string, limit = 100): Comment[] {
  return readComments(mint).slice(0, Math.min(limit, MAX_PER_MINT));
}

export function addComment(mint: string, wallet: string, text: string): Comment {
  const trimmed = text.trim().slice(0, MAX_TEXT_LEN);
  if (!trimmed) throw new Error("Comment cannot be empty");

  const comment: Comment = {
    id:        `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    mint,
    wallet,
    text:      trimmed,
    timestamp: Date.now(),
    likes:     0,
  };

  const list = readComments(mint);
  list.unshift(comment); // newest first
  if (list.length > MAX_PER_MINT) list.length = MAX_PER_MINT;
  writeComments(mint, list);
  return comment;
}

export function likeComment(mint: string, commentId: string): boolean {
  const list = readComments(mint);
  const c = list.find((x) => x.id === commentId);
  if (!c) return false;
  c.likes++;
  writeComments(mint, list);
  return true;
}
