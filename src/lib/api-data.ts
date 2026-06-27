export type Method = "GET" | "POST" | "WS";

export type Endpoint = {
  method: Method;
  path: string;
  desc: string;
  responseMs: number;
};

export const ENDPOINTS: Endpoint[] = [
  { method: "GET", path: "/v1/signals", desc: "List active signals with filters", responseMs: 32 },
  { method: "GET", path: "/v1/signals/:id", desc: "Signal detail + AI analysis", responseMs: 41 },
  { method: "GET", path: "/v1/score/:asset", desc: "AI score for any asset", responseMs: 28 },
  { method: "GET", path: "/v1/sentiment/:asset", desc: "Multi-source sentiment aggregate", responseMs: 36 },
  { method: "GET", path: "/v1/manipulation", desc: "Active manipulation alerts", responseMs: 44 },
  { method: "WS", path: "/v1/stream/signals", desc: "Real-time signal stream", responseMs: 12 },
  { method: "WS", path: "/v1/stream/scores", desc: "Real-time score updates", responseMs: 14 },
  { method: "POST", path: "/v1/alerts/webhook", desc: "Register webhook endpoint", responseMs: 58 },
];

export const SNIPPETS = {
  javascript: `// GET /v1/signals — list active signals
const res = await fetch("https://api.aisignalradar.io/v1/signals?asset=BTC&tf=4h", {
  headers: {
    "Authorization": "Bearer sk_live_YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});
const { data } = await res.json();
console.log(data);`,
  python: `# GET /v1/signals — list active signals
import requests

res = requests.get(
    "https://api.aisignalradar.io/v1/signals",
    params={"asset": "BTC", "tf": "4h"},
    headers={"Authorization": "Bearer sk_live_YOUR_API_KEY"}
)
print(res.json())`,
  curl: `curl -X GET "https://api.aisignalradar.io/v1/signals?asset=BTC&tf=4h" \\
  -H "Authorization: Bearer sk_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json"`,
};

export const RESPONSE_JSON = `{
  "data": [
    {
      "id": "sig_9f3a2c",
      "asset": "BTC",
      "timeframe": "4h",
      "type": "long",
      "confidence": 87,
      "entry": 64320.5,
      "tp": 65800.0,
      "sl": 63400.0,
      "created_at": "2026-05-24T14:22:00Z"
    }
  ],
  "meta": { "count": 1, "rate_remaining": 4982 }
}`;

export type ApiKey = {
  id: string;
  name: string;
  key: string;
  plan: "Starter" | "Pro" | "Institutional";
  requestsToday: number;
  createdAt: string;
};

export const SAMPLE_KEYS: ApiKey[] = [
  { id: "k1", name: "Production backend", key: "sk_live_••••••••••••PROD", plan: "Institutional", requestsToday: 12483, createdAt: "2026-03-14" },
  { id: "k2", name: "Research notebooks", key: "sk_live_••••••••••••RSCH", plan: "Institutional", requestsToday: 942, createdAt: "2026-04-02" },
];

export const RATE_LIMITS = [
  { plan: "Starter", limit: "100 req/day", burst: "10 req/min", streams: "—" },
  { plan: "Pro", limit: "5,000 req/day", burst: "60 req/min", streams: "1 WS" },
  { plan: "Institutional", limit: "Unlimited", burst: "600 req/min", streams: "Unlimited WS" },
];

export const WEBHOOK_EVENTS = [
  { id: "new_signal", label: "new signal" },
  { id: "manipulation_alert", label: "manipulation alert" },
  { id: "score_change", label: "score change" },
];

export const RECENT_DELIVERIES = [
  { ts: "2026-05-24 14:22:08", event: "new_signal", status: 200, ms: 142 },
  { ts: "2026-05-24 14:18:51", event: "score_change", status: 200, ms: 98 },
  { ts: "2026-05-24 14:12:33", event: "manipulation_alert", status: 200, ms: 184 },
  { ts: "2026-05-24 13:58:02", event: "new_signal", status: 500, ms: 3021 },
  { ts: "2026-05-24 13:44:18", event: "new_signal", status: 200, ms: 121 },
];
