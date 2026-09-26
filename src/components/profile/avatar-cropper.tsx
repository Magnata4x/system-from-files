import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { UploadCloud, ImageIcon } from "lucide-react";

const SIZE = 240; // preview circle diameter (px)

export function AvatarCropper({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (dataUrl: string) => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [over, setOver] = useState(false);

  useEffect(() => {
    if (!open) {
      setSrc(null);
      setImg(null);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [open]);

  // Load image
  useEffect(() => {
    if (!src) return;
    const i = new Image();
    i.onload = () => {
      setImg(i);
      // Fit short side to SIZE
      const scale = SIZE / Math.min(i.width, i.height);
      setZoom(scale);
      setOffset({ x: 0, y: 0 });
    };
    i.src = src;
  }, [src]);

  const readFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = () => setSrc(r.result as string);
    r.readAsDataURL(f);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) readFile(f);
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) readFile(f);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!img) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !dragStart.current) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: dragStart.current.oy + (e.clientY - dragStart.current.y),
    });
  };
  const onPointerUp = () => {
    setDragging(false);
    dragStart.current = null;
  };

  const save = () => {
    if (!img) return;
    const out = document.createElement("canvas");
    const OUT = 320;
    out.width = OUT;
    out.height = OUT;
    const ctx = out.getContext("2d")!;
    ctx.save();
    ctx.beginPath();
    ctx.arc(OUT / 2, OUT / 2, OUT / 2, 0, Math.PI * 2);
    ctx.clip();
    // Map preview (SIZE) → output (OUT)
    const scale = OUT / SIZE;
    const w = img.width * zoom * scale;
    const h = img.height * zoom * scale;
    const cx = OUT / 2 + offset.x * scale;
    const cy = OUT / 2 + offset.y * scale;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
    ctx.restore();
    onSave(out.toDataURL("image/png"));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload avatar</DialogTitle>
        </DialogHeader>

        {!src ? (
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={onDrop}
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-10 px-6 cursor-pointer transition-colors ${
              over
                ? "border-[var(--brand-cyan)] bg-[var(--brand-cyan)]/5"
                : "border-border bg-secondary/30 hover:bg-secondary/50"
            }`}
          >
            <div className="size-12 rounded-full bg-[var(--brand-blue-deep)] flex items-center justify-center">
              <UploadCloud className="size-5 text-[var(--brand-cyan)]" />
            </div>
            <div className="text-sm font-medium">Drop image here</div>
            <div className="text-xs text-muted-foreground">
              or click to browse · PNG, JPG up to 5MB
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={onPickFile} />
          </label>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col items-center">
              <div
                className="relative overflow-hidden bg-[#0e1621] border border-border"
                style={{
                  width: SIZE,
                  height: SIZE,
                  borderRadius: "50%",
                  cursor: dragging ? "grabbing" : "grab",
                  touchAction: "none",
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                {img && (
                  <img
                    src={img.src}
                    alt=""
                    draggable={false}
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      width: img.width * zoom,
                      height: img.height * zoom,
                      transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                      pointerEvents: "none",
                      maxWidth: "none",
                    }}
                  />
                )}
                {/* circular guide ring */}
                <div className="absolute inset-0 rounded-full ring-1 ring-white/10 pointer-events-none" />
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">Drag to reposition</p>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>Zoom</span>
                <span className="font-mono">{zoom.toFixed(2)}×</span>
              </div>
              <Slider
                value={[zoom * 100]}
                min={20}
                max={400}
                step={1}
                onValueChange={(v) => setZoom(v[0] / 100)}
              />
            </div>

            <button
              onClick={() => setSrc(null)}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
            >
              <ImageIcon className="size-3" /> Choose a different image
            </button>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!img}>
            Save avatar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
