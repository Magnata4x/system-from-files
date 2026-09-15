// Fluxo ao vivo da Binance (websocket público) para a página de Manipulation.
// Detecta no navegador dois padrões clássicos a partir dos negócios agregados:
//  - negócio muito acima da média recente  → LIQUIDITY GRAB / ABSORPTION
//  - variação rápida de preço em poucos segundos → STOP HUNT
import { useEffect, useRef, useState } from "react";
import type { Alert, AlertType, Severity } from "@/lib/manipulation-data";

const WS_BASE = "wss://stream.binance.com:9443/stream?streams=";

const DEFAULT_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"];

interface AggTrade {
  s: string; // symbol
  p: string; // price
  q: string; // quantity
  T: number; // trade time
  m: boolean; // buyer is market maker
}

interface SymbolState {
  sizes: number[];
  lastPrice: number;
  windowStart: number;
  windowPrice: number;
  lastAlertAt: number;
}

function toPairLabel(symbol: string) {
  return symbol.endsWith("USDT") ? `${symbol.slice(0, -4)}/USDT` : symbol;
}

function severityFor(ratio: number): Severity {
  if (ratio >= 20) return "HIGH";
  if (ratio >= 12) return "MEDIUM";
  return "LOW";
}

export function useBinanceManipulationStream(
  symbol: string | undefined,
  onAlert: (alert: Alert) => void,
  enabled = true,
) {
  const [connected, setConnected] = useState(false);
  const onAlertRef = useRef(onAlert);
  onAlertRef.current = onAlert;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const symbols = symbol ? [symbol.toUpperCase()] : DEFAULT_SYMBOLS;
    const streams = symbols.map((s) => `${s.toLowerCase()}@aggTrade`).join("/");
    const ws = new WebSocket(`${WS_BASE}${streams}`);
    const state = new Map<string, SymbolState>();
    let closed = false;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (event) => {
      if (closed) return;
      let trade: AggTrade | undefined;
      try {
        const parsed = JSON.parse(event.data as string) as { data?: AggTrade };
        trade = parsed.data;
      } catch {
        return;
      }
      if (!trade?.s) return;

      const price = Number(trade.p);
      const notional = price * Number(trade.q);
      const now = trade.T || Date.now();

      const st =
        state.get(trade.s) ??
        { sizes: [], lastPrice: price, windowStart: now, windowPrice: price, lastAlertAt: 0 };

      st.sizes.push(notional);
      if (st.sizes.length > 300) st.sizes.shift();
      st.lastPrice = price;

      const avg = st.sizes.reduce((a, b) => a + b, 0) / st.sizes.length;
      const ratio = avg > 0 ? notional / avg : 0;
      const cooling = now - st.lastAlertAt < 20_000;

      // 1) Negócio gigante em relação à média recente.
      if (!cooling && st.sizes.length > 60 && ratio >= 8 && notional > 50_000) {
        st.lastAlertAt = now;
        const type: AlertType = trade.m ? "ABSORPTION" : "LIQUIDITY GRAB";
        onAlertRef.current({
          id: `live-${trade.s}-${now}`,
          severity: severityFor(ratio),
          type,
          asset: toPairLabel(trade.s),
          tf: "1m",
          confidence: Math.min(99, Math.round(50 + ratio * 2)),
          ago: "agora",
          desc: `Negócio de US$ ${Math.round(notional).toLocaleString("pt-BR")} — ${ratio.toFixed(1)}x a média recente a ${price}`,
          action: trade.m ? "Venda agressiva absorvida" : "Compra agressiva varrendo liquidez",
          detail: "Detectado ao vivo no fluxo público da Binance",
        });
      }

      // 2) Variação rápida de preço (janela de 10s).
      if (now - st.windowStart >= 10_000) {
        const movePct = st.windowPrice > 0 ? ((price - st.windowPrice) / st.windowPrice) * 100 : 0;
        if (!cooling && Math.abs(movePct) >= 0.45) {
          st.lastAlertAt = now;
          onAlertRef.current({
            id: `live-move-${trade.s}-${now}`,
            severity: Math.abs(movePct) >= 0.9 ? "HIGH" : "MEDIUM",
            type: "STOP HUNT",
            asset: toPairLabel(trade.s),
            tf: "10s",
            confidence: Math.min(99, Math.round(55 + Math.abs(movePct) * 25)),
            ago: "agora",
            desc: `Preço moveu ${movePct.toFixed(2)}% em 10s até ${price}`,
            action: movePct > 0 ? "Possível caça a stops de venda" : "Possível caça a stops de compra",
            detail: "Detectado ao vivo no fluxo público da Binance",
          });
        }
        st.windowStart = now;
        st.windowPrice = price;
      }

      state.set(trade.s, st);
    };

    return () => {
      closed = true;
      setConnected(false);
      ws.close();
    };
  }, [symbol, enabled]);

  return { liveConnected: connected };
}
