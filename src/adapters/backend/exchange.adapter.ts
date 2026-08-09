// Credenciais de exchange (Binance) — usadas para destravar o modo REAL do Bot4x.
import { api, endpoints } from "./api.adapter";

export interface ExchangeStatusUI {
  connected: boolean;
  exchange: string;
  keyPreview: string;
  verified: boolean;
  verifiedAt: string | null;
  lastError: string | null;
  canTrade?: boolean;
  balances?: { asset: string; free: number }[];
}

export const exchangeAdapter = {
  status: () => api.get<ExchangeStatusUI>(endpoints.exchange.credentials),
  save: (payload: { exchange?: string; apiKey: string; apiSecret: string }) =>
    api.post<ExchangeStatusUI>(endpoints.exchange.credentials, payload),
  test: () => api.post<ExchangeStatusUI>(endpoints.exchange.test, {}),
  remove: () => api.delete<ExchangeStatusUI>(endpoints.exchange.credentials),
};
