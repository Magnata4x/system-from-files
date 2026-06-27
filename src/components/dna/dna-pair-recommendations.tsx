import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, TrendingDown, Minus, Sparkles, ShieldAlert, RefreshCcw, Check, Info } from "lucide-react";
import { toast } from "sonner";
import { useBot4xStore } from "@/lib/bot4x-store";
import {
  analyzePairs,
  DNA_MIN_SAMPLE_BOUNDS,
  type PairAnalysisResult,
  type PairAnalysis,
} from "@/lib/dna-pair-analyzer";

export function DnaPairRecommendations() {
  const history = useBot4xStore((s) => s.history);
  const preferredPairs = useBot4xStore((s) => s.preferredPairs);
  const avoidPairs = useBot4xStore((s) => s.avoidPairs);
  const setPreferredPairs = useBot4xStore((s) => s.setPreferredPairs);
  const setAvoidPairs = useBot4xStore((s) => s.setAvoidPairs);
  const dnaMinSample = useBot4xStore((s) => s.dnaMinSample);
  const setDnaMinSample = useBot4xStore((s) => s.setDnaMinSample);

  const MIN_SAMPLE = dnaMinSample;

  const [result, setResult] = useState<PairAnalysisResult>(() =>
    analyzePairs(history, { minSample: MIN_SAMPLE }),
  );

  useEffect(() => {
    setResult(analyzePairs(history, { minSample: MIN_SAMPLE }));
    const id = setInterval(
      () => setResult(analyzePairs(useBot4xStore.getState().history, { minSample: MIN_SAMPLE })),
      10_000,
    );
    return () => clearInterval(id);
  }, [history, MIN_SAMPLE]);

  const applied = useMemo(
    () => preferredPairs.join(",") === result.preferred.join(",") && avoidPairs.join(",") === result.avoid.join(","),
    [preferredPairs, avoidPairs, result],
  );

  const apply = () => {
    setPreferredPairs(result.preferred);
    setAvoidPairs(result.avoid);
    toast.success("Bot4x atualizado com recomendações do DNA", {
      description: `${result.preferred.length} preferidos · ${result.avoid.length} evitados`,
    });
  };

  const clear = () => {
    setPreferredPairs([]);
    setAvoidPairs([]);
    toast("Recomendações limpas — Bot4x volta a operar todos os pares");
  };

  // Verifica se todos os pares têm amostra insuficiente
  const allInsufficient = result.analyses.length > 0 && result.analyses.every((a) => a.total < MIN_SAMPLE);

  // Total de trades fechados disponíveis
  const totalClosed = result.analyses.reduce((s, a) => s + a.total, 0);

  return (
    <div className="space-y-5">
      <Card className="rounded-xl border border-border bg-card/40 p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-[var(--brand-cyan)]" />
              <h2 className="text-sm font-semibold">Recomendações de Pares (DNA)</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">
              Classificação estatística via intervalo de confiança de Wilson com correção de Bonferroni. Veredito
              (PREFER/AVOID) só é liberado a partir de{" "}
              <span className="font-semibold text-foreground" title={`Configurável (${DNA_MIN_SAMPLE_BOUNDS.min}–${DNA_MIN_SAMPLE_BOUNDS.max})`}>
                {MIN_SAMPLE} trades fechados
              </span>{" "}
              por par (padrão 10). Pares PREFER são priorizados pelo Bot4x; pares AVOID têm execução bloqueada.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-end">
            <div className="flex flex-col gap-1">
              <Label
                htmlFor="dna-min-sample"
                className="text-[10px] uppercase tracking-wide text-muted-foreground"
                title={`Mínimo de trades fechados por par para liberar PREFER/AVOID (${DNA_MIN_SAMPLE_BOUNDS.min}–${DNA_MIN_SAMPLE_BOUNDS.max}).`}
              >
                Mín. trades
              </Label>
              <Input
                id="dna-min-sample"
                type="number"
                min={DNA_MIN_SAMPLE_BOUNDS.min}
                max={DNA_MIN_SAMPLE_BOUNDS.max}
                step={1}
                value={MIN_SAMPLE}
                onChange={(e) => setDnaMinSample(Number(e.target.value))}
                className="h-8 w-20 text-xs tabular-nums"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const next = analyzePairs(useBot4xStore.getState().history, { minSample: MIN_SAMPLE });
                setResult(next);
                const closed = next.analyses.reduce((s, a) => s + a.total, 0);
                toast.success("DNA recalculado", {
                  description: `${next.analyses.length} par(es) · ${closed} trade(s) fechado(s) · ${next.preferred.length} PREFER · ${next.avoid.length} AVOID`,
                });
              }}
              className="h-8 gap-1.5 text-xs"
            >
              <RefreshCcw className="size-3.5" /> Atualizar
            </Button>
            <Button
              size="sm"
              onClick={apply}
              disabled={applied || result.preferred.length + result.avoid.length === 0}
              className="h-8 gap-1.5 text-xs"
            >
              <Check className="size-3.5" /> {applied ? "Aplicado" : "Aplicar ao Bot4x"}
            </Button>
            {(preferredPairs.length > 0 || avoidPairs.length > 0) && (
              <Button variant="ghost" size="sm" onClick={clear} className="h-8 text-xs">
                Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Aviso global — amostra insuficiente */}
        {allInsufficient && (
          <div className="mb-4 flex items-start gap-2.5 rounded-md border border-amber-500/30 bg-amber-500/8 px-3 py-2.5">
            <Info className="size-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-300 leading-relaxed">
              <span className="font-semibold">Amostra insuficiente em todos os pares.</span> São necessários ao menos{" "}
              {MIN_SAMPLE} trades fechados (WIN ou LOSS) por par para emitir veredito estatístico. Histórico atual:{" "}
              {totalClosed} trade{totalClosed !== 1 ? "s" : ""} fechados distribuídos entre {result.analyses.length} par
              {result.analyses.length !== 1 ? "es" : ""}. Continue operando — as recomendações aparecerão
              automaticamente quando a amostra for suficiente.
            </div>
          </div>
        )}

        {/* Summary boxes */}
        <div className="grid sm:grid-cols-2 gap-3 mb-5">
          <SummaryBox
            title="Operar mais (PREFER)"
            pairs={result.preferred}
            color="emerald"
            icon={<TrendingUp className="size-4" />}
            empty={`Nenhum par com IC de Wilson estatisticamente acima da média do sistema (mínimo ${MIN_SAMPLE} trades)`}
          />
          <SummaryBox
            title="Evitar (AVOID)"
            pairs={result.avoid}
            color="red"
            icon={<ShieldAlert className="size-4" />}
            empty={`Nenhum par com IC de Wilson estatisticamente abaixo da média do sistema (mínimo ${MIN_SAMPLE} trades)`}
          />
        </div>

        {/* Legenda do método */}
        <div className="mb-3 rounded-md border border-border bg-background/50 px-3 py-2 text-[10.5px] text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground">Como funciona:</span> Cada par é comparado contra a taxa de
          acerto global do sistema usando o intervalo de confiança de Wilson (IC95%). Um par recebe{" "}
          <span className="text-emerald-400 font-medium">PREFER</span> somente se o limite inferior do IC estiver acima
          da média — e <span className="text-red-400 font-medium">AVOID</span> somente se o limite superior estiver
          abaixo. A correção de Bonferroni evita falsos positivos ao testar múltiplos pares simultaneamente. A coluna{" "}
          <span className="font-medium text-foreground">streak</span> é apenas informativa e não afeta a classificação.
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground border-b border-border">
              <tr className="text-left">
                <th className="py-2 pr-3">Par</th>
                <th className="py-2 pr-3">Trades</th>
                <th className="py-2 pr-3">WR</th>
                <th className="py-2 pr-3">PnL%</th>
                <th className="py-2 pr-3 text-muted-foreground/60">
                  Streak
                  <span className="ml-1 text-[9px] font-normal opacity-50">(display)</span>
                </th>
                <th className="py-2 pr-3">Tendência</th>
                <th className="py-2 pr-3">Volume</th>
                <th className="py-2 pr-3">Confiança</th>
                <th className="py-2 pr-3">Veredito</th>
                <th className="py-2">Motivo estatístico</th>
              </tr>
            </thead>
            <tbody>
              {result.analyses.map((a) => (
                <tr key={a.pair} className="border-b border-border/40 hover:bg-background/40">
                  <td className="py-2 pr-3 font-medium">{a.pair}</td>
                  <td className="py-2 pr-3 tabular-nums">
                    <span className={a.total < MIN_SAMPLE ? "text-amber-400" : ""}>{a.total}</span>
                    {a.total < MIN_SAMPLE && <span className="ml-1 text-[9px] text-amber-400/70">/{MIN_SAMPLE}</span>}
                  </td>
                  <td className="py-2 pr-3 tabular-nums">{a.winRate}%</td>
                  <td className={`py-2 pr-3 tabular-nums ${a.pnlSum >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {a.pnlSum >= 0 ? "+" : ""}
                    {a.pnlSum}%
                  </td>
                  {/* Streak — display only, sem destaque por |streak|>=3 */}
                  <td className="py-2 pr-3 tabular-nums text-muted-foreground">
                    {a.streak > 0 ? `+${a.streak}` : a.streak}
                  </td>
                  <td className="py-2 pr-3">
                    <TrendBadge trend={a.trend} />
                  </td>
                  <td className="py-2 pr-3 tabular-nums">{a.volumeScore}%</td>
                  <td className="py-2 pr-3 tabular-nums">
                    <ConfidenceBar confidence={a.confidence} recommendation={a.recommendation} />
                  </td>
                  <td className="py-2 pr-3">
                    <RecoBadge reco={a.recommendation} />
                  </td>
                  <td className="py-2 text-muted-foreground text-[10.5px] max-w-xs">{a.reason}</td>
                </tr>
              ))}
              {result.analyses.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-muted-foreground">
                    Sem histórico suficiente ainda. Opere pelo menos {MIN_SAMPLE} trades para ver a análise.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé */}
        <p className="mt-3 text-[10px] text-muted-foreground/60 leading-relaxed">
          Análise gerada em {new Date(result.generatedAt).toLocaleTimeString("pt-BR")}. Simulação para fins
          educacionais. Não constitui recomendação financeira ou de investimento.
        </p>
      </Card>
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function SummaryBox({
  title,
  pairs,
  color,
  icon,
  empty,
}: {
  title: string;
  pairs: string[];
  color: "emerald" | "red";
  icon: React.ReactNode;
  empty: string;
}) {
  const cls =
    color === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
      : "border-red-500/30 bg-red-500/5 text-red-300";
  return (
    <div className={`rounded-lg border p-3 ${cls}`}>
      <div className="flex items-center gap-2 mb-2 text-xs font-semibold">
        {icon}
        {title}
      </div>
      {pairs.length === 0 ? (
        <p className="text-[11px] opacity-70">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {pairs.map((p) => (
            <Badge key={p} variant="outline" className="text-[10px] h-5">
              {p}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function TrendBadge({ trend }: { trend: "UP" | "DOWN" | "FLAT" }) {
  if (trend === "UP")
    return (
      <span className="inline-flex items-center gap-1 text-emerald-400">
        <TrendingUp className="size-3" />
        UP
      </span>
    );
  if (trend === "DOWN")
    return (
      <span className="inline-flex items-center gap-1 text-red-400">
        <TrendingDown className="size-3" />
        DOWN
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <Minus className="size-3" />
      FLAT
    </span>
  );
}

function RecoBadge({ reco }: { reco: "PREFER" | "AVOID" | "NEUTRAL" }) {
  if (reco === "PREFER")
    return <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px] h-5">PREFER</Badge>;
  if (reco === "AVOID")
    return <Badge className="bg-red-500/15 text-red-300 border-red-500/30 text-[10px] h-5">AVOID</Badge>;
  return (
    <Badge variant="outline" className="text-[10px] h-5">
      NEUTRAL
    </Badge>
  );
}

// Barra de confiança — margem acima/abaixo da baseline (0..1 → 0..100%)
function ConfidenceBar({
  confidence,
  recommendation,
}: {
  confidence: number;
  recommendation: PairAnalysis["recommendation"];
}) {
  if (recommendation === "NEUTRAL" || confidence === 0) {
    return <span className="text-muted-foreground text-[10px]">—</span>;
  }
  const pct = Math.min(100, Math.round(confidence * 500)); // escala visual: 0.2 → 100%
  const color = recommendation === "PREFER" ? "#1D9E75" : "#E24B4A";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 rounded-full bg-border overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] tabular-nums" style={{ color }}>
        {(confidence * 100).toFixed(1)}pp
      </span>
    </div>
  );
}
