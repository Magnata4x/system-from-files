import { Lock, Sparkles, Construction } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RATE_LIMITS } from "@/lib/api-data";
import { cn } from "@/lib/utils";

// SEG-06: a página antiga de "API keys" gerava/revogava chaves apenas no
// estado local (sem tabela, sem backend, sem hash). Vendida no plano
// Institutional, isso era falsa expectativa para clientes pagantes.
// Enquanto o backend real (tabela api_keys + RPC de emissão + middleware
// de validação) não existir, exibimos um estado "Em breve" honesto.
//
// Os limites de rate por plano continuam visíveis porque são informação
// comercial verdadeira.

export function KeysManagement() {
  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">API keys</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Gere, rotacione e monitore o uso de chaves de API.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-amber-500/40 bg-amber-500/10 text-amber-300">
          <Construction className="size-3.5" /> Em breve
        </span>
      </header>

      <div className="rounded-lg border border-dashed border-border bg-card/30 p-6">
        <div className="flex items-start gap-4">
          <div className="size-10 shrink-0 rounded-lg bg-[#378ADD]/10 border border-[#378ADD]/30 flex items-center justify-center">
            <Lock className="size-5 text-[#5fa8ff]" />
          </div>
          <div className="space-y-2 min-w-0">
            <h3 className="text-sm font-semibold">Emissão de chaves em desenvolvimento</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              O painel de gestão de chaves de API está em desenvolvimento. Quando estiver disponível,
              clientes do plano Institutional poderão emitir, rotacionar e revogar chaves a partir desta tela,
              com hashing server-side e validação por middleware em cada request da API pública.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Até lá, esta página é informativa. Se você precisa acessar os endpoints REST/WebSocket,
              entre em contato com o suporte para emissão manual de credenciais.
            </p>
            <div className="pt-1 flex gap-2">
              <Button size="sm" variant="outline" disabled className="opacity-60 cursor-not-allowed">
                <Sparkles className="size-3.5 mr-1" /> Generate new key
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <a href="mailto:support@aisignalradar.com?subject=API%20key%20request">Falar com suporte</a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Rate limits</h3>
        <div className="rounded-lg border border-border bg-card/40 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground bg-secondary/30">
              <tr>
                <th className="text-left font-medium px-4 py-2.5">Plan</th>
                <th className="text-left font-medium px-4 py-2.5">Daily quota</th>
                <th className="text-left font-medium px-4 py-2.5">Burst</th>
                <th className="text-left font-medium px-4 py-2.5">Streams</th>
              </tr>
            </thead>
            <tbody>
              {RATE_LIMITS.map((r) => (
                <tr key={r.plan} className={cn("border-t border-border/60", r.plan === "Institutional" && "bg-[#378ADD]/5")}>
                  <td className="px-4 py-3 font-medium">{r.plan}</td>
                  <td className="px-4 py-3 tabular-nums">{r.limit}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.burst}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.streams}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
