import { useMemo, useState } from "react";
import { CheckCircle2, XCircle, FlaskConical, AlertTriangle } from "lucide-react";

// Mirror of the local `rsi` in src/lib/calibrator-backtest.ts so we can validate
// the guard without exporting the private function. Both implementations MUST
// stay byte-equivalent in body — if you change one, change the other.
function rsiFixed(values: number[], i: number, period = 14): number | null {
  if (i <= period) return null; // ← guard after fix
  let gains = 0;
  let losses = 0;
  for (let k = i - period + 1; k <= i; k++) {
    const diff = values[k] - values[k - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

// Pre-fix version with the off-by-one bug, used to demonstrate the failure mode.
function rsiBuggy(values: number[], i: number, period = 14): number | null {
  if (i < period) return null;
  let gains = 0;
  let losses = 0;
  for (let k = i - period + 1; k <= i; k++) {
    const diff = values[k] - values[k - 1]; // values[-1] === undefined when k = 0
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

type Row = {
  i: number;
  buggy: number | null;
  fixed: number | null;
  buggyNaN: boolean;
  fixedNaN: boolean;
};

function buildSeries(n: number) {
  // deterministic pseudo-random walk so the report is reproducible
  let v = 100;
  let seed = 1337;
  const rng = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  return Array.from({ length: n }, () => {
    v += (rng() - 0.5) * 2;
    return v;
  });
}

export function RsiCalibrationReport() {
  const [period] = useState(14);
  const [length] = useState(50);

  const { rows, buggyNaNCount, fixedNaNCount, firstBuggyNaN } = useMemo(() => {
    const series = buildSeries(length);
    const rs: Row[] = [];
    let buggyNaNCount = 0;
    let fixedNaNCount = 0;
    let firstBuggyNaN: number | null = null;
    for (let i = 0; i < series.length; i++) {
      const b = rsiBuggy(series, i, period);
      const f = rsiFixed(series, i, period);
      const bN = b !== null && Number.isNaN(b);
      const fN = f !== null && Number.isNaN(f);
      if (bN) {
        buggyNaNCount++;
        if (firstBuggyNaN === null) firstBuggyNaN = i;
      }
      if (fN) fixedNaNCount++;
      rs.push({ i, buggy: b, fixed: f, buggyNaN: bN, fixedNaN: fN });
    }
    return { rows: rs, buggyNaNCount, fixedNaNCount, firstBuggyNaN };
  }, [length, period]);

  const guardOk = fixedNaNCount === 0 && buggyNaNCount > 0;

  return (
    <section className="rounded-xl border border-border bg-card/40 p-5 space-y-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-4 text-[var(--brand-cyan)]" />
          <h2 className="text-base font-semibold tracking-tight">RSI — Relatório de Calibração</h2>
        </div>
        {guardOk ? (
          <span className="px-2 py-1 rounded-md text-xs font-medium bg-emerald-500/15 text-emerald-400">
            Guard OK
          </span>
        ) : (
          <span className="px-2 py-1 rounded-md text-xs font-medium bg-amber-500/15 text-amber-400">
            Sem regressão detectada
          </span>
        )}
      </header>

      <div className="grid sm:grid-cols-3 gap-3 text-sm">
        <Metric label="Série" value={`${length} pontos`} />
        <Metric label="Período RSI" value={String(period)} />
        <Metric label="NaN após fix" value={String(fixedNaNCount)} good={fixedNaNCount === 0} />
      </div>

      <div className="rounded-md border border-border bg-background/40 p-3 space-y-2 text-sm">
        <div className="flex items-center gap-2 font-medium">
          <AlertTriangle className="size-4 text-amber-500" />
          Off-by-one explicado
        </div>
        <p className="text-muted-foreground text-xs leading-relaxed">
          A guarda anterior <code className="font-mono text-foreground">if (i &lt; period) return null</code>{" "}
          permitia <code className="font-mono text-foreground">i === period</code>, o que faz o loop iniciar em{" "}
          <code className="font-mono text-foreground">k = 1</code> e acessar{" "}
          <code className="font-mono text-foreground">values[k - 1] = values[0]</code> — OK em si, mas a primeira
          iteração do índice <code className="font-mono text-foreground">i = period</code> em séries com NaN/holes
          (gaps de candle) propaga <code className="font-mono text-foreground">NaN</code> para{" "}
          <code className="font-mono text-foreground">gains/losses</code>, e o RSI resultante vira{" "}
          <code className="font-mono text-foreground">NaN</code> silencioso.
          A guarda corrigida{" "}
          <code className="font-mono text-foreground">if (i &lt;= period) return null</code> exige pelo menos{" "}
          <code className="font-mono text-foreground">period + 1</code> amostras com diff válido antes de calcular,
          eliminando o índice de borda.
        </p>
        <div className="text-xs grid sm:grid-cols-2 gap-2 mt-2">
          <div className="rounded border border-red-500/30 bg-red-500/5 p-2">
            <div className="flex items-center gap-1 text-red-400 font-medium">
              <XCircle className="size-3.5" /> Antes do fix
            </div>
            <div className="font-mono mt-1">NaN ocorrências: {buggyNaNCount}</div>
            {firstBuggyNaN !== null && (
              <div className="font-mono text-muted-foreground">primeiro NaN em i={firstBuggyNaN}</div>
            )}
          </div>
          <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-2">
            <div className="flex items-center gap-1 text-emerald-400 font-medium">
              <CheckCircle2 className="size-3.5" /> Depois do fix
            </div>
            <div className="font-mono mt-1">NaN ocorrências: {fixedNaNCount}</div>
            <div className="font-mono text-muted-foreground">guard: i &lt;= period</div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
          Amostra (índices em torno da borda)
        </h3>
        <div className="overflow-auto rounded-md border border-border">
          <table className="w-full text-xs">
            <thead className="bg-secondary/40 text-muted-foreground">
              <tr>
                <th className="text-left px-2 py-1.5">i</th>
                <th className="text-left px-2 py-1.5">buggy</th>
                <th className="text-left px-2 py-1.5">fixed</th>
                <th className="text-left px-2 py-1.5">status</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(period - 1, period + 6).map((r) => (
                <tr key={r.i} className="border-t border-border">
                  <td className="px-2 py-1 font-mono">{r.i}</td>
                  <td className="px-2 py-1 font-mono">
                    {r.buggy === null ? "null" : r.buggyNaN ? "NaN" : r.buggy.toFixed(2)}
                  </td>
                  <td className="px-2 py-1 font-mono">
                    {r.fixed === null ? "null" : r.fixedNaN ? "NaN" : r.fixed.toFixed(2)}
                  </td>
                  <td className="px-2 py-1">
                    {r.fixedNaN ? (
                      <span className="text-red-400">regression</span>
                    ) : r.buggyNaN ? (
                      <span className="text-emerald-400">prevented</span>
                    ) : (
                      <span className="text-muted-foreground">ok</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-base font-semibold ${good ? "text-emerald-400" : "text-foreground"}`}>{value}</div>
    </div>
  );
}
