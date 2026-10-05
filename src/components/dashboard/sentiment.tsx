import { Loader2, AlertTriangle, TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react";
import { useSentiment } from "@/hooks/useSentiment";
import { DataStatusBadge } from "@/components/dashboard/data-status";

export function Sentiment() {
  const { data, isLoading, isError, isStale, dataUpdatedAt } = useSentiment();
  const status = isLoading ? "loading" : isError ? "unavailable" : isStale ? "stale" : "ok";
  const updatedAt = data?.updatedAt ? new Date(data.updatedAt) : (dataUpdatedAt || null);

  return (
    <div className="rounded-xl border border-border bg-card p-4 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-medium">Momentum de mercado</h3>
          <p className="text-[10px] text-muted-foreground mt-1">
            Leitura real baseada em variação, momentum e posição no range da Binance.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <DataStatusBadge source="Binance · mercado" updatedAt={updatedAt} status={status} />
          {data && <span className="text-[22px] font-semibold tabular-nums">{data.overall}/100</span>}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 mt-4 text-[12px] text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> carregando momentum…
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 mt-4 text-[12px] text-[#E24B4A]">
          <AlertTriangle className="size-3.5" /> Fonte de mercado indisponível.
        </div>
      )}

      {data && !isLoading && !isError && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-[#1D9E75]">{data.bullBear.bull.toFixed(0)}% bullish</span>
            <span className="text-[#E24B4A]">{data.bullBear.bear.toFixed(0)}% bearish</span>
            <span className="text-muted-foreground">
              {data.advancers} ↑ / {data.decliners} ↓
            </span>
          </div>

          <div className="space-y-2">
            {data.assets.slice(0, 4).map((asset) => {
              const Icon =
                asset.trend === "up" || asset.trend === "upup"
                  ? TrendingUp
                  : asset.trend === "down"
                    ? TrendingDown
                    : Minus;
              const tone =
                asset.signal === "BULLISH"
                  ? "text-[#1D9E75]"
                  : asset.signal === "BEARISH"
                    ? "text-[#E24B4A]"
                    : "text-muted-foreground";

              return (
                <div key={asset.asset} className="flex items-center gap-2 text-[11px]">
                  <span className="w-12 font-medium">{asset.asset}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-[var(--brand-cyan)]"
                      style={{ width: `${asset.overall}%` }}
                    />
                  </div>
                  <Icon className={`size-3.5 ${tone}`} />
                  <span className={`w-10 text-right font-medium ${tone}`}>{asset.overall}</span>
                </div>
              );
            })}
          </div>

          {data.topGainer && data.topLoser && (
            <div className="text-[10px] text-muted-foreground">
              Melhor: {data.topGainer.asset} ({data.topGainer.changePct >= 0 ? "+" : ""}
              {data.topGainer.changePct.toFixed(2)}%) · Pior: {data.topLoser.asset} (
              {data.topLoser.changePct.toFixed(2)}%)
            </div>
          )}

          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between gap-3 text-[10px]">
              <DataStatusBadge
                source={data.newsFeed.provider}
                updatedAt={data.newsFeed.updatedAt ? new Date(data.newsFeed.updatedAt) : null}
                status={data.newsFeed.status === "available" ? "ok" : "unavailable"}
              />
              <span className="text-muted-foreground tabular-nums">
                {data.newsFeed.status === "available"
                  ? `${data.newsFeed.count} notícias${data.newsFeed.score === null ? "" : ` · score ${data.newsFeed.score}`}`
                  : "notícias indisponíveis"}
              </span>
            </div>

            {data.newsFeed.status === "available" && data.newsFeed.articles.length > 0 && (
              <div className="mt-2 space-y-2">
                {data.newsFeed.articles.slice(0, 3).map((article) => (
                  <a
                    key={article.id}
                    href={article.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-start justify-between gap-2 text-[11px] text-foreground/90 hover:text-primary"
                  >
                    <span className="min-w-0">
                      <span className="line-clamp-1">{article.title}</span>
                      <span className="text-[9px] text-muted-foreground">
                        {article.source}{article.score === null ? "" : ` · ${article.score}/100`}
                      </span>
                    </span>
                    <ExternalLink className="mt-0.5 size-3 shrink-0 text-muted-foreground group-hover:text-primary" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
