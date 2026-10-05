const COINGECKO_GLOBAL_URL = "https://api.coingecko.com/api/v3/global";
const RETENTION_DAYS = 90;

type SupabaseError = { message: string };

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável server-side ausente: ${name}`);
  return value;
}

function finiteNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function minuteTimestamp(now = Date.now()): string {
  return new Date(Math.floor(now / 60_000) * 60_000).toISOString();
}

export interface MarketSnapshotCronResult {
  capturedAt: string;
  source: "coingecko";
  deletedBefore: string;
}

export async function collectMarketSnapshot(): Promise<MarketSnapshotCronResult> {
  const response = await fetch(COINGECKO_GLOBAL_URL, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`CoinGecko global HTTP ${response.status}`);
  }

  const payload = (await response.json()) as {
    data?: Record<string, unknown>;
  };
  const data = payload.data ?? {};
  const marketCap = data.total_market_cap as Record<string, unknown> | undefined;
  const volume = data.total_volume as Record<string, unknown> | undefined;
  const dominance = data.market_cap_percentage as Record<string, unknown> | undefined;

  const row = {
    captured_at: minuteTimestamp(),
    source: "coingecko" as const,
    total_market_cap: finiteNumber(marketCap?.usd),
    total_volume: finiteNumber(volume?.usd),
    btc_dominance: finiteNumber(dominance?.btc),
    market_cap_change_24h: finiteNumber(data.market_cap_change_percentage_24h_usd),
  };

  const url = env("SUPABASE_URL");
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const inserted = await fetch(`${url}/rest/v1/market_snapshots?on_conflict=captured_at`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates,return=minimal",
    },
    body: JSON.stringify(row),
  });

  if (!inserted.ok) {
    const detail = await inserted.text();
    throw new Error(`Supabase market_snapshots HTTP ${inserted.status}: ${detail.slice(0, 300)}`);
  }

  const deletedBefore = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60_000).toISOString();
  const cleanup = await fetch(
    `${url}/rest/v1/market_snapshots?captured_at=lt.${encodeURIComponent(deletedBefore)}`,
    {
      method: "DELETE",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: "return=minimal",
      },
    },
  );

  if (!cleanup.ok) {
    const detail = await cleanup.text();
    throw new Error(`Supabase market_snapshots cleanup HTTP ${cleanup.status}: ${detail.slice(0, 300)}`);
  }

  return {
    capturedAt: row.captured_at,
    source: row.source,
    deletedBefore,
  };
}
