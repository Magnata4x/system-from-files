import { ENDPOINTS, type Method } from "@/lib/api-data";
import { cn } from "@/lib/utils";

const METHOD_STYLES: Record<Method, string> = {
  GET: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  POST: "bg-[#378ADD]/15 text-[#5fa8ff] border-[#378ADD]/30",
  WS: "bg-violet-500/15 text-violet-300 border-violet-500/30",
};

export function EndpointCards() {
  return (
    <section className="space-y-4">
      <header className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Endpoints</h2>
        <span className="text-xs text-muted-foreground">Base URL: <span className="font-mono text-foreground/80">https://api.aisignalradar.io</span></span>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ENDPOINTS.map((e) => (
          <div
            key={e.method + e.path}
            className="rounded-lg border border-border bg-card/40 hover:bg-card/70 transition-colors p-3.5 flex items-center gap-3"
          >
            <span className={cn("inline-flex items-center justify-center text-[10.5px] font-semibold tracking-wide px-2 py-1 rounded border w-14", METHOD_STYLES[e.method])}>
              {e.method}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[13px] text-foreground truncate">{e.path}</div>
              <div className="text-xs text-muted-foreground truncate">{e.desc}</div>
            </div>
            <span className="text-[10.5px] tabular-nums text-muted-foreground bg-secondary/60 border border-border rounded px-1.5 py-0.5 shrink-0">
              ~{e.responseMs}ms
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
