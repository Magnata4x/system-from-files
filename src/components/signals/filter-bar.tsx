import { Search, LayoutGrid, Table as TableIcon, Radar, SlidersHorizontal, ChevronDown, Play, Pause, Rss, Cpu } from "lucide-react";
import { useSignalsStore } from "@/lib/signals-store";

const assetClasses = ["All", "Crypto", "Forex", "Indices", "Stocks"] as const;
const timeframes = ["All", "1m", "5m", "15m", "1H", "4H", "1D"] as const;
const directions = ["All", "BUY", "SELL"] as const;
const scoreOptions = [
  { label: "All", value: 0 },
  { label: "≥60", value: 60 },
  { label: "≥75", value: 75 },
  { label: "≥90", value: 90 },
] as const;
const exchanges = ["Binance", "Bybit", "OKX", "Coinbase"];

export function FilterBar() {
  const { filters, view, sort, live, streamOpen, setView, setSort, setLive, setFilter, toggleAdv, toggleStream, toggleExchange } = useSignalsStore();
  const bot4xOnly = filters.bot4xOnly;

  return (
    <div className="sticky top-12 z-30 bg-background/95 backdrop-blur border-b border-border">
      {/* Row 1 */}
      <div className="flex items-center gap-2 px-5 py-2.5 flex-wrap">
        <div className="relative">
          <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            placeholder="Search asset, setup…"
            className="w-60 h-8 pl-8 pr-3 rounded-md bg-card border border-border text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[var(--brand-cyan)] transition-colors"
          />
        </div>

        <Pills
          options={[...assetClasses]}
          value={filters.assetClass}
          onChange={(v) => setFilter("assetClass", v as typeof filters.assetClass)}
        />

        <div className="flex items-center rounded-md border border-border bg-card overflow-hidden">
          {[
            { v: "cards" as const, icon: LayoutGrid },
            { v: "table" as const, icon: TableIcon },
            { v: "radar" as const, icon: Radar },
          ].map(({ v, icon: Icon }) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-2.5 h-8 flex items-center justify-center transition-colors ${
                view === v ? "bg-[var(--brand-blue-deep)] text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              title={v}
            >
              <Icon className="size-3.5" />
            </button>
          ))}
        </div>

        <div className="relative">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "score" | "rr" | "age" | "volDelta")}
            className="h-8 pl-3 pr-8 rounded-md bg-card border border-border text-[12px] text-foreground appearance-none focus:outline-none focus:border-[var(--brand-cyan)]"
          >
            <option value="score">Sort: Score</option>
            <option value="rr">Sort: R/R</option>
            <option value="age">Sort: Newest</option>
            <option value="volDelta">Sort: Volume</option>
          </select>
          <ChevronDown className="size-3 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>

        <button
          onClick={toggleAdv}
          className="h-8 px-3 rounded-md border border-border bg-card text-[12px] text-foreground hover:border-[var(--brand-cyan)] transition-colors inline-flex items-center gap-1.5"
        >
          <SlidersHorizontal className="size-3.5" /> Advanced
        </button>

        <div className="flex-1" />

        <button
          onClick={() => setFilter("bot4xOnly", !bot4xOnly)}
          title="Mostrar apenas sinais viáveis no Bot4x"
          className={`h-8 px-3 rounded-md border text-[12px] inline-flex items-center gap-1.5 transition-colors ${
            bot4xOnly
              ? "border-[#1D9E75] bg-[color-mix(in_oklab,#1D9E75_18%,transparent)] text-foreground"
              : "border-border bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          <Cpu className="size-3.5" /> Bot4x viáveis
          <span className={`ml-1 inline-block w-7 h-3.5 rounded-full relative transition-colors ${bot4xOnly ? "bg-[#1D9E75]" : "bg-muted"}`}>
            <span className={`absolute top-0.5 size-2.5 rounded-full bg-background transition-all ${bot4xOnly ? "left-3.5" : "left-0.5"}`} />
          </span>
        </button>

        <button
          onClick={toggleStream}
          title="Signal stream (Bloomberg-style ticker)"
          className={`h-8 px-3 rounded-md border text-[12px] inline-flex items-center gap-1.5 transition-colors ${
            streamOpen
              ? "border-[var(--brand-cyan)] bg-[color-mix(in_oklab,var(--brand-cyan)_18%,transparent)] text-foreground"
              : "border-border bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          <Rss className="size-3.5" /> Stream
        </button>

        <button
          onClick={() => setLive(!live)}
          className="h-8 px-3 rounded-md border border-border bg-card text-[12px] text-foreground hover:border-[var(--brand-cyan)] inline-flex items-center gap-2 transition-colors"
        >
          {live ? (
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#1D9E75] opacity-75 animate-ping" />
              <span className="relative inline-flex size-2 rounded-full bg-[#1D9E75]" />
            </span>
          ) : (
            <span className="size-2 rounded-full bg-muted-foreground" />
          )}
          {live ? <Pause className="size-3" /> : <Play className="size-3" />}
          {live ? "Live" : "Paused"}
        </button>
      </div>

      {/* Row 2 */}
      <div className="flex items-center gap-2 px-5 pb-2.5 flex-wrap">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground mr-1">TF</span>
        <Pills
          options={[...timeframes]}
          value={filters.timeframe}
          onChange={(v) => setFilter("timeframe", v as typeof filters.timeframe)}
        />
        <Divider />
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground mr-1">Dir</span>
        <Pills
          options={[...directions]}
          value={filters.direction}
          onChange={(v) => setFilter("direction", v as typeof filters.direction)}
          colorMap={{ BUY: "#1D9E75", SELL: "#E24B4A" }}
        />
        <Divider />
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground mr-1">Score</span>
        <Pills
          options={scoreOptions.map((o) => o.label)}
          value={scoreOptions.find((o) => o.value === filters.scoreMin)?.label ?? "All"}
          onChange={(v) => {
            const opt = scoreOptions.find((o) => o.label === v);
            if (opt) setFilter("scoreMin", opt.value);
          }}
        />
        <Divider />
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground mr-1">Exch</span>
        {exchanges.map((e) => {
          const active = filters.exchanges.includes(e);
          return (
            <button
              key={e}
              onClick={() => toggleExchange(e)}
              className={`h-7 px-2.5 rounded-md text-[12px] border transition-colors ${
                active
                  ? "border-[var(--brand-cyan)] bg-[color-mix(in_oklab,var(--brand-cyan)_18%,transparent)] text-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {e}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Divider() {
  return <span className="h-5 w-px bg-border mx-1" />;
}

function Pills({
  options,
  value,
  onChange,
  colorMap,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  colorMap?: Record<string, string>;
}) {
  return (
    <div className="flex items-center rounded-md border border-border bg-card overflow-hidden">
      {options.map((o) => {
        const active = value === o;
        const color = colorMap?.[o];
        return (
          <button
            key={o}
            onClick={() => onChange(o)}
            className="h-8 px-2.5 text-[12px] transition-colors"
            style={{
              color: active ? (color ?? "var(--foreground)") : "var(--muted-foreground)",
              background: active
                ? color
                  ? `color-mix(in oklab, ${color} 18%, transparent)`
                  : "var(--brand-blue-deep)"
                : "transparent",
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
