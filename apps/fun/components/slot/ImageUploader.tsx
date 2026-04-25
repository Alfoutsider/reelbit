"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, Link, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const ACCEPTED = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png":  "png",
  "image/gif":  "gif",
  "image/webp": "webp",
};

interface Props {
  value: string;
  onChange: (url: string) => void;
}

type Mode = "drop" | "url";

export function ImageUploader({ value, onChange }: Props) {
  const [mode, setMode]       = useState<Mode>("drop");
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      setError("Only JPG, PNG, GIF, or WEBP allowed.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("Max file size is 4 MB.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const base64 = await toBase64(file);
      const ext    = EXT_MAP[file.type] ?? "jpg";
      const res    = await fetch(`${API}/upload/slot-image`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ base64, ext }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setPreview(data.url);
      onChange(data.url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  function clearImage() {
    setPreview(null);
    onChange("");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      {/* Mode tabs */}
      <div className="flex gap-1 bg-white/[0.04] rounded-lg p-0.5 w-fit">
        {(["drop", "url"] as Mode[]).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={cn(
              "px-3 py-1 rounded-md text-[11px] font-orbitron font-bold tracking-wide transition-all",
              mode === m ? "bg-purple-500/20 text-purple-300" : "text-white/30 hover:text-white/50"
            )}>
            {m === "drop" ? "UPLOAD" : "URL"}
          </button>
        ))}
      </div>

      {mode === "drop" ? (
        <div>
          {preview ? (
            <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Slot preview" className="w-full h-48 object-cover" />
              <button type="button" onClick={clearImage}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-red-500/40 text-white/70 hover:text-white transition-all">
                <X size={14} />
              </button>
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="w-8 h-8 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
                </div>
              )}
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "relative flex flex-col items-center justify-center gap-3 h-40 rounded-xl border-2 border-dashed cursor-pointer transition-all",
                dragging
                  ? "border-purple-400/70 bg-purple-500/10"
                  : "border-white/10 bg-white/[0.02] hover:border-purple-500/40 hover:bg-purple-500/5"
              )}>
              {uploading ? (
                <div className="w-8 h-8 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
              ) : (
                <>
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                    dragging ? "bg-purple-500/20" : "bg-white/5"
                  )}>
                    {dragging ? <ImageIcon size={22} className="text-purple-400" /> : <Upload size={22} className="text-white/30" />}
                  </div>
                  <div className="text-center">
                    <p className="font-rajdhani font-bold text-white/50 text-sm">
                      {dragging ? "Drop to upload" : "Drag & drop or click to browse"}
                    </p>
                    <p className="text-[11px] text-white/25 font-rajdhani mt-0.5">PNG, JPG, GIF, WEBP — max 4 MB</p>
                  </div>
                </>
              )}
              <input ref={inputRef} type="file" accept={ACCEPTED.join(",")}
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} />
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          <Link size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
          <input
            value={value}
            onChange={(e) => { onChange(e.target.value); setPreview(e.target.value || null); }}
            placeholder="https://…"
            className="input-casino pl-9"
          />
        </div>
      )}

      {error && <p className="text-xs text-red-400 font-rajdhani">{error}</p>}

      <p className="flex items-center gap-1.5 text-[11px] text-white/25 font-rajdhani">
        <ImageIcon size={10} className="text-gold/50" />
        Leave blank — AI generates slot art at graduation
      </p>
    </div>
  );
}
