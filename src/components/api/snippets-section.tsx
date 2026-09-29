import { useState } from "react";
import { Play, Terminal } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CodeBlock } from "./code-block";
import { ENDPOINTS } from "@/lib/api-data";

const SDK_INSTALLS = {
  npm: "npm install @aisignalradar/sdk",
  pnpm: "pnpm add @aisignalradar/sdk",
  yarn: "yarn add @aisignalradar/sdk",
  pip: "pip install aisignalradar",
};

function buildSnippet(lang: "javascript" | "python" | "curl", endpoint: string, params: Record<string, string>) {
  const qs = Object.entries(params)
    .filter(([, v]) => v.trim())
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  const url = `https://api.aisignalradar.io${endpoint}${qs ? "?" + qs : ""}`;
  if (lang === "javascript") {
    return `const res = await fetch("${url}", {
  headers: { "Authorization": "Bearer sk_live_YOUR_API_KEY" }
});
const data = await res.json();`;
  }
  if (lang === "python") {
    return `import requests

res = requests.get(
    "${url}",
    headers={"Authorization": "Bearer sk_live_YOUR_API_KEY"}
)
print(res.json())`;
  }
  return `curl -X GET "${url}" \\
  -H "Authorization: Bearer sk_live_YOUR_API_KEY"`;
}

function mockResponse(endpoint: string, params: Record<string, string>) {
  const asset = (params.asset || "BTC").toUpperCase();
  const tf = params.tf || "4h";
  const limit = Math.min(parseInt(params.limit || "3", 10) || 3, 5);

  if (endpoint.startsWith("/v1/signals")) {
    const data = Array.from({ length: limit }, (_, i) => ({
      id: `sig_${(Math.random().toString(36).slice(2, 8))}`,
      asset,
      timeframe: tf,
      type: i % 2 === 0 ? "long" : "short",
      confidence: Math.floor(70 + Math.random() * 28),
      entry: +(60000 + Math.random() * 8000).toFixed(2),
      tp: +(66000 + Math.random() * 4000).toFixed(2),
      sl: +(58000 + Math.random() * 2000).toFixed(2),
      created_at: new Date(Date.now() - i * 3600_000).toISOString(),
    }));
    return JSON.stringify({ data, meta: { count: data.length, rate_remaining: 4982 } }, null, 2);
  }
  if (endpoint.startsWith("/v1/score")) {
    return JSON.stringify({ asset, score: Math.floor(40 + Math.random() * 50), trend: "bullish", updated_at: new Date().toISOString() }, null, 2);
  }
  if (endpoint.startsWith("/v1/sentiment")) {
    return JSON.stringify({ asset, sentiment: 0.62, sources: { twitter: 0.71, news: 0.54, reddit: 0.58 }, mentions_24h: 18420 }, null, 2);
  }
  if (endpoint.startsWith("/v1/manipulation")) {
    return JSON.stringify({ data: [{ id: "mn_3a91", asset, type: "spoofing", severity: "high", confidence: 87, detected_at: new Date().toISOString() }] }, null, 2);
  }
  return JSON.stringify({ ok: true, endpoint, params }, null, 2);
}

export function SnippetsSection() {
  return (
    <section className="space-y-8">
      <div className="space-y-4">
        <header className="flex items-baseline justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-semibold">Quick start</h2>
            <p className="text-xs text-muted-foreground mt-1">Example for <span className="font-mono text-foreground/80">GET /v1/signals</span></p>
          </div>
          <SdkInstall />
        </header>
        <Tabs defaultValue="javascript">
          <TabsList className="bg-secondary/40">
            <TabsTrigger value="javascript">JavaScript</TabsTrigger>
            <TabsTrigger value="python">Python</TabsTrigger>
            <TabsTrigger value="curl">curl</TabsTrigger>
          </TabsList>
          <TabsContent value="javascript" className="mt-3">
            <CodeBlock code={buildSnippet("javascript", "/v1/signals", { asset: "BTC", tf: "4h" })} lang="javascript" />
          </TabsContent>
          <TabsContent value="python" className="mt-3">
            <CodeBlock code={buildSnippet("python", "/v1/signals", { asset: "BTC", tf: "4h" })} lang="python" />
          </TabsContent>
          <TabsContent value="curl" className="mt-3">
            <CodeBlock code={buildSnippet("curl", "/v1/signals", { asset: "BTC", tf: "4h" })} lang="curl" />
          </TabsContent>
        </Tabs>
      </div>

      <ApiExplorer />
    </section>
  );
}

function SdkInstall() {
  const [mgr, setMgr] = useState<keyof typeof SDK_INSTALLS>("npm");
  return (
    <div className="flex items-center gap-2">
      <Select value={mgr} onValueChange={(v) => setMgr(v as keyof typeof SDK_INSTALLS)}>
        <SelectTrigger className="h-8 w-[88px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="npm">npm</SelectItem>
          <SelectItem value="pnpm">pnpm</SelectItem>
          <SelectItem value="yarn">yarn</SelectItem>
          <SelectItem value="pip">pip</SelectItem>
        </SelectContent>
      </Select>
      <div className="min-w-[260px] max-w-full">
        <CodeBlock code={SDK_INSTALLS[mgr]} lang="curl" className="!rounded-md" />
      </div>
    </div>
  );
}

const REST_ENDPOINTS = ENDPOINTS.filter((e) => e.method !== "WS");

const DEFAULT_PARAMS: Record<string, Record<string, string>> = {
  "/v1/signals": { asset: "BTC", tf: "4h", limit: "3" },
  "/v1/signals/:id": { id: "sig_9f3a2c" },
  "/v1/score/:asset": { asset: "ETH" },
  "/v1/sentiment/:asset": { asset: "SOL" },
  "/v1/manipulation": { asset: "BTC", severity: "high" },
  "/v1/alerts/webhook": { url: "https://example.com/hook", events: "new_signal" },
};

function ApiExplorer() {
  const [endpoint, setEndpoint] = useState(REST_ENDPOINTS[0].path);
  const [params, setParams] = useState<Record<string, string>>(DEFAULT_PARAMS[REST_ENDPOINTS[0].path] || {});
  const [response, setResponse] = useState<string>("// Click \"Send request\" to see a live mock response");
  const [latency, setLatency] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  function onEndpointChange(path: string) {
    setEndpoint(path);
    setParams(DEFAULT_PARAMS[path] || {});
    setResponse("// Click \"Send request\" to see a live mock response");
    setLatency(null);
  }

  function setParam(k: string, v: string) {
    setParams((p) => ({ ...p, [k]: v }));
  }

  async function send() {
    setLoading(true);
    const start = performance.now();
    await new Promise((r) => setTimeout(r, 350 + Math.random() * 400));
    setResponse(mockResponse(endpoint, params));
    setLatency(Math.round(performance.now() - start));
    setLoading(false);
  }

  const paramKeys = Object.keys(params);

  return (
    <div className="space-y-3">
      <header className="flex items-center gap-2">
        <Terminal className="size-4 text-[#5fa8ff]" />
        <h2 className="text-lg font-semibold">API explorer</h2>
        <span className="text-[10.5px] uppercase tracking-wide text-muted-foreground bg-secondary/60 border border-border rounded px-1.5 py-0.5">interactive</span>
      </header>

      <div className="rounded-lg border border-border bg-card/40 p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold tracking-wide px-2 py-1 rounded border bg-emerald-500/15 text-emerald-400 border-emerald-500/30">GET</span>
          <Select value={endpoint} onValueChange={onEndpointChange}>
            <SelectTrigger className="h-9 flex-1 min-w-[240px] font-mono text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REST_ENDPOINTS.map((e) => (
                <SelectItem key={e.path} value={e.path} className="font-mono text-xs">
                  {e.path}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={send} disabled={loading} className="bg-[#378ADD] hover:bg-[#2d74bd] text-white">
            <Play className="size-3.5 mr-1.5" />
            {loading ? "Sending..." : "Send request"}
          </Button>
        </div>

        {paramKeys.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {paramKeys.map((k) => (
              <div key={k} className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground font-mono w-16 shrink-0">{k}</label>
                <Input
                  value={params[k]}
                  onChange={(e) => setParam(k, e.target.value)}
                  className="h-8 text-xs font-mono"
                  placeholder={k}
                />
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Response</div>
            {latency !== null && (
              <div className="text-[10.5px] tabular-nums text-muted-foreground flex items-center gap-2">
                <span className="text-emerald-400">200 OK</span>
                <span>·</span>
                <span>{latency}ms</span>
              </div>
            )}
          </div>
          <CodeBlock code={response} lang="json" />
        </div>
      </div>
    </div>
  );
}
