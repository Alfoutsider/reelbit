"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Upload, Check, Move } from "lucide-react";

interface Props {
  onCrop: (base64: string, ext: string) => void;
  size?: number;
}

const PREVIEW = 200;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif"
};

export function AvatarCropper({ onCrop, size = 256 }: Props) {
  const fileRef   = useRef<HTMLInputElement>(null);
  const imgRef    = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [src,   setSrc]   = useState<string | null>(null);
  const [ext,   setExt]   = useState("jpg");
  const [nat,   setNat]   = useState({ w: 0, h: 0 }); // natural image size
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [drag, setDrag]   = useState<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function loadImage(file: File) {
    if (!ACCEPTED.includes(file.type)) { setError("JPG, PNG, WEBP or GIF only."); return; }
    setError(null);
    setExt(EXT_MAP[file.type] ?? "jpg");
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.max(PREVIEW / img.naturalWidth, PREVIEW / img.naturalHeight);
      const w = img.naturalWidth  * s;
      const h = img.naturalHeight * s;
      setNat({ w: img.naturalWidth, h: img.naturalHeight });
      setScale(s);
      setOffset({ x: (PREVIEW - w) / 2, y: (PREVIEW - h) / 2 });
      setSrc(url);
    };
    img.src = url;
  }

  const clamp = useCallback((ox: number, oy: number, s: number) => {
    if (!nat.w) return { x: ox, y: oy };
    const iw = nat.w * s;
    const ih = nat.h * s;
    return {
      x: Math.min(0, Math.max(PREVIEW - iw, ox)),
      y: Math.min(0, Math.max(PREVIEW - ih, oy)),
    };
  }, [nat]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDrag({ sx: e.clientX, sy: e.clientY, ox: offset.x, oy: offset.y });
  }, [offset]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    setDrag({ sx: t.clientX, sy: t.clientY, ox: offset.x, oy: offset.y });
  }, [offset]);

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: MouseEvent | TouchEvent) => {
      const [cx, cy] = "touches" in e
        ? [e.touches[0].clientX, e.touches[0].clientY]
        : [(e as MouseEvent).clientX, (e as MouseEvent).clientY];
      setOffset(clamp(drag.ox + cx - drag.sx, drag.oy + cy - drag.sy, scale));
    };
    const onUp = () => setDrag(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend",  onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend",  onUp);
    };
  }, [drag, scale, clamp]);

  function confirm() {
    if (!src || !nat.w) return;
    const canvas = canvasRef.current!;
    canvas.width  = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const img = imgRef.current!;
    const sx = -offset.x / scale;
    const sy = -offset.y / scale;
    const sw = PREVIEW   / scale;
    const sh = PREVIEW   / scale;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
    const mime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
    const b64  = canvas.toDataURL(mime).split(",")[1];
    onCrop(b64, ext);
  }

  const iw = nat.w * scale;
  const ih = nat.h * scale;

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas ref={canvasRef} className="hidden" />

      {!src ? (
        <button type="button" onClick={() => fileRef.current?.click()}
          className="w-[200px] h-[200px] rounded-full border-2 border-dashed border-white/15 bg-white/[0.02] hover:border-red-500/40 hover:bg-red-500/5 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer">
          <Upload size={28} className="text-white/25" />
          <span className="text-xs font-rajdhani text-white/30">Upload photo</span>
        </button>
      ) : (
        <div className="relative" style={{ userSelect: "none" }}>
          <div className="overflow-hidden rounded-full cursor-grab active:cursor-grabbing"
            style={{ width: PREVIEW, height: PREVIEW, background: "#0a0a14", position: "relative" }}
            onMouseDown={onMouseDown} onTouchStart={onTouchStart}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={imgRef} src={src} alt="crop" draggable={false}
              style={{ position: "absolute", width: iw || "auto", height: ih || "auto",
                left: offset.x, top: offset.y, pointerEvents: "none" }} />
          </div>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/60 px-2 py-1 rounded-full pointer-events-none">
            <Move size={10} className="text-white/50" />
            <span className="text-[10px] font-rajdhani text-white/40">Drag to reposition</span>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-400 font-rajdhani">{error}</p>}

      <div className="flex gap-2">
        <button type="button" onClick={() => fileRef.current?.click()} className="btn-ghost text-xs px-4 py-2 font-orbitron">
          {src ? "CHANGE" : "BROWSE"}
        </button>
        {src && (
          <button type="button" onClick={confirm} className="btn-launch flex items-center gap-1.5 px-4 py-2 text-xs">
            <Check size={13} /> USE THIS
          </button>
        )}
      </div>

      <input ref={fileRef} type="file" accept={ACCEPTED.join(",")} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) loadImage(f); e.target.value = ""; }} />
    </div>
  );
}
