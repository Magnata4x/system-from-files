import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useTourStore } from "@/lib/tour-store";
import { TOUR_MAP } from "@/lib/tour-content";
import { Link } from "@tanstack/react-router";

type Rect = { top: number; left: number; width: number; height: number };
const TT_W = 300;
const TT_H = 200;
const PAD = 8;
const OFFSET = 16;
const MARGIN = 12;

function measure(sel: string): Rect | null {
  if (typeof document === "undefined") return null;
  const el = document.querySelector(sel) as HTMLElement | null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function position(rect: Rect, vw: number, vh: number) {
  const above = rect.top;
  const below = vh - (rect.top + rect.height);
  const right = vw - (rect.left + rect.width);
  const left = rect.left;
  const best = Math.max(above, below, right, left);
  let top = 0, leftPos = 0, arrow: "up" | "down" | "left" | "right" = "down";
  if (best === below) {
    top = rect.top + rect.height + OFFSET;
    leftPos = rect.left + rect.width / 2 - TT_W / 2;
    arrow = "up";
  } else if (best === above) {
    top = rect.top - TT_H - OFFSET;
    leftPos = rect.left + rect.width / 2 - TT_W / 2;
    arrow = "down";
  } else if (best === right) {
    leftPos = rect.left + rect.width + OFFSET;
    top = rect.top + rect.height / 2 - TT_H / 2;
    arrow = "left";
  } else {
    leftPos = rect.left - TT_W - OFFSET;
    top = rect.top + rect.height / 2 - TT_H / 2;
    arrow = "right";
  }
  top = Math.min(Math.max(MARGIN, top), vh - TT_H - MARGIN);
  leftPos = Math.min(Math.max(MARGIN, leftPos), vw - TT_W - MARGIN);
  return { top, left: leftPos, arrow };
}

export function TourOverlay() {
  const activeTour = useTourStore((s) => s.activeTour);
  const activeStep = useTourStore((s) => s.activeStep);
  const paused = useTourStore((s) => s.paused);
  const nextStep = useTourStore((s) => s.nextStep);
  const prevStep = useTourStore((s) => s.prevStep);
  const goToStep = useTourStore((s) => s.goToStep);
  const pauseTour = useTourStore((s) => s.pauseTour);
  const resumeTour = useTourStore((s) => s.resumeTour);
  const closeTour = useTourStore((s) => s.closeTour);
  const completeTour = useTourStore((s) => s.completeTour);
  const setSkipAll = useTourStore((s) => s.setSkipAll);

  const tour = activeTour ? TOUR_MAP[activeTour] : null;
  const step = tour?.steps[activeStep];

  const [rect, setRect] = useState<Rect | null>(null);
  const [done, setDone] = useState(false);
  const [vp, setVp] = useState({ w: 1200, h: 800 });
  const rafRef = useRef<number | undefined>(undefined);

  useLayoutEffect(() => {
    setVp({ w: window.innerWidth, h: window.innerHeight });
  }, []);

  useEffect(() => {
    if (!step) return;
    setDone(false);
    let attempts = 0;
    const tick = () => {
      const r = measure(step.selector);
      if (r) {
        setRect(r);
        const el = document.querySelector(step.selector) as HTMLElement | null;
        if (el) {
          const top = r.top;
          if (top < 0 || top + r.height > vp.h) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            setTimeout(() => {
              const nr = measure(step.selector);
              if (nr) setRect(nr);
            }, 350);
          }
        }
      } else if (attempts++ < 30) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        // target missing — skip forward
        if (tour && activeStep < tour.steps.length - 1) nextStep();
        else if (tour) { completeTour(tour.id); setDone(true); }
      }
    };
    tick();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [step, activeStep, tour, vp.h, completeTour, nextStep]);

  useEffect(() => {
    function onResize() {
      setVp({ w: window.innerWidth, h: window.innerHeight });
      if (step) {
        const r = measure(step.selector);
        if (r) setRect(r);
      }
    }
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [step]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!activeTour) return;
      if (e.key === "Escape") pauseTour();
      else if (e.key === "ArrowRight") nextStep();
      else if (e.key === "ArrowLeft") prevStep();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [activeTour, pauseTour, nextStep, prevStep]);

  if (typeof document === "undefined") return null;
  if (!tour || !step) return null;

  const lastStep = activeStep >= tour.steps.length - 1;
  const Icon = step.icon;
  const pos = rect ? position(rect, vp.w, vp.h) : null;

  const overlay = (
    <AnimatePresence>
      <motion.div
        key="tour"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[200] pointer-events-none"
        role="dialog"
        aria-label={`Tour passo ${activeStep + 1} de ${tour.steps.length}`}
      >
        {/* SVG mask backdrop */}
        <svg className="absolute inset-0 w-full h-full pointer-events-auto" onClick={() => pauseTour()}>
          <defs>
            <mask id="tour-mask">
              <rect width="100%" height="100%" fill="white" />
              {rect && (
                <motion.rect
                  initial={false}
                  animate={{
                    x: rect.left - PAD,
                    y: rect.top - PAD,
                    width: rect.width + PAD * 2,
                    height: rect.height + PAD * 2,
                  }}
                  transition={{ type: "spring", stiffness: 220, damping: 28 }}
                  rx={10}
                  ry={10}
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="#0A0B0E" fillOpacity={0.66} mask="url(#tour-mask)" />
          {rect && (
            <motion.rect
              initial={false}
              animate={{
                x: rect.left - PAD,
                y: rect.top - PAD,
                width: rect.width + PAD * 2,
                height: rect.height + PAD * 2,
              }}
              transition={{ type: "spring", stiffness: 220, damping: 28 }}
              rx={10}
              ry={10}
              fill="transparent"
              stroke="#185FA5"
              strokeWidth={1.5}
              style={{ filter: "drop-shadow(0 0 12px rgba(24,95,165,0.55))" }}
            />
          )}
        </svg>

        {/* Tooltip card */}
        {pos && !done && !paused && (
          <motion.div
            key={`${tour.id}-${activeStep}`}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="absolute pointer-events-auto rounded-xl border-[1.5px] bg-[#111318] text-foreground"
            style={{
              top: pos.top,
              left: pos.left,
              width: TT_W,
              borderColor: "#185FA5",
              boxShadow: "0 8px 28px -8px rgba(24,95,165,0.45)",
            }}
          >
            <div className="p-4">
              {/* progress dots row + close */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  {tour.steps.map((_, i) => (
                    <span
                      key={i}
                      className={`block rounded-full transition-all ${
                        i === activeStep ? "size-2 ring-2 ring-[#378ADD] ring-offset-1 ring-offset-[#111318] bg-[#378ADD]" :
                        i < activeStep ? "size-1.5 bg-[#378ADD]" :
                        "size-1.5 border border-muted-foreground/50"
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {activeStep + 1} de {tour.steps.length}
                  </span>
                  <button
                    onClick={pauseTour}
                    className="size-5 rounded hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
                    aria-label="Pausar tour"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2 mb-1.5">
                <span className="size-7 rounded-md flex items-center justify-center shrink-0"
                  style={{ background: "color-mix(in oklab, #378ADD 18%, transparent)", color: "#378ADD" }}>
                  <Icon className="size-3.5" />
                </span>
                <h4 className="text-[13px] font-medium leading-tight pt-1">{step.title}</h4>
              </div>
              <p className="text-[12px] text-muted-foreground leading-[1.6] mb-3">{step.text}</p>

              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={prevStep}
                  disabled={activeStep === 0}
                  className="flex items-center gap-1 px-2.5 h-7 rounded-md border border-border text-[11px] hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="size-3" /> Anterior
                </button>
                <div className="flex items-center gap-1">
                  {tour.steps.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goToStep(i)}
                      className={`size-1.5 rounded-full transition-colors ${
                        i === activeStep ? "bg-[#378ADD]" : "bg-muted-foreground/40 hover:bg-muted-foreground/70"
                      }`}
                      aria-label={`Ir para passo ${i + 1}`}
                    />
                  ))}
                </div>
                {lastStep ? (
                  <button
                    onClick={() => { completeTour(tour.id); setDone(true); }}
                    className="flex items-center gap-1 px-2.5 h-7 rounded-md bg-[#185FA5] hover:bg-[#1E73C8] text-white text-[11px] font-medium"
                  >
                    Concluir <Check className="size-3" />
                  </button>
                ) : (
                  <button
                    onClick={nextStep}
                    className="flex items-center gap-1 px-2.5 h-7 rounded-md bg-[#185FA5] hover:bg-[#1E73C8] text-white text-[11px] font-medium"
                  >
                    Próximo <ChevronRight className="size-3" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* paused prompt */}
        {paused && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-[#111318] p-5 w-[320px] text-center"
            >
              <h4 className="text-sm font-medium mb-2">Tour pausado</h4>
              <p className="text-[12px] text-muted-foreground mb-4">Deseja retomar de onde parou?</p>
              <div className="flex items-center gap-2 justify-center">
                <button
                  onClick={resumeTour}
                  className="px-3 h-8 rounded-md bg-[#185FA5] hover:bg-[#1E73C8] text-white text-[12px] font-medium"
                >
                  Sim, retomar
                </button>
                <button
                  onClick={closeTour}
                  className="px-3 h-8 rounded-md border border-border text-[12px] hover:bg-secondary"
                >
                  Fechar
                </button>
                <button
                  onClick={() => { setSkipAll(true); closeTour(); }}
                  className="px-3 h-8 rounded-md text-[12px] text-muted-foreground hover:text-foreground"
                >
                  Pular todos
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* completion card */}
        {done && tour && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto rounded-xl border border-[#1D9E75]/50 bg-[#111318] p-4 w-[360px]"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#1D9E75]/20 text-[#1D9E75] border border-[#1D9E75]/40">
                ✓ Tour concluído
              </span>
              <span className="text-[12px] text-foreground">{tour.label}</span>
              <button
                onClick={() => setDone(false)}
                className="ml-auto text-muted-foreground hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="size-3.5" />
              </button>
            </div>
            {tour.next && (
              <Link
                to={tour.next.route}
                onClick={() => setDone(false)}
                className="block text-[12px] text-[#378ADD] hover:text-[#5BA4E6] mt-1"
              >
                Próximo: {tour.next.label} →
              </Link>
            )}
            <Link
              to="/settings"
              onClick={() => setDone(false)}
              className="block text-[11px] text-muted-foreground hover:text-foreground mt-1"
            >
              Ver todos os tours →
            </Link>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
}
