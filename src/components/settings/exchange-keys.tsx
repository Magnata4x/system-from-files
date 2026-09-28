import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SectionCard } from "./section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exchangeAdapter } from "@/adapters/backend/exchange.adapter";
import { CheckCircle2, Loader2, ShieldAlert, Trash2 } from "lucide-react";

function errMsg(e: unknown) {
  const anyErr = e as { response?: { data?: { message?: string } }; message?: string };
  return anyErr?.response?.data?.message ?? anyErr?.message ?? "Erro inesperado";
}

/** Conexão real com a exchange — habilita o modo REAL do Bot4x. */
export function SettingsExchangeKeys() {
  const qc = useQueryClient();
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");

  const status = useQuery({ queryKey: ["exchange", "status"], queryFn: exchangeAdapter.status });
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["exchange", "status"] });
  };

  const save = useMutation({
    mutationFn: () => exchangeAdapter.save({ apiKey, apiSecret }),
    onSuccess: () => {
      setApiKey("");
      setApiSecret("");
      invalidate();
    },
  });
  const test = useMutation({ mutationFn: exchangeAdapter.test, onSuccess: invalidate });
  const remove = useMutation({ mutationFn: exchangeAdapter.remove, onSuccess: invalidate });

  const data = status.data;
  const busy = save.isPending || test.isPending || remove.isPending;

  return (
    <SectionCard
      title="Exchange (Binance)"
      description="Conecte suas chaves para liberar o modo REAL do Bot4x. As chaves são guardadas criptografadas e nunca voltam ao navegador."
    >
      {status.isLoading ? (
        <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> verificando conexão…
        </p>
      ) : status.isError ? (
        <p className="text-xs text-[#E24B4A]">{errMsg(status.error)}</p>
      ) : data?.connected ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {data.verified ? (
              <span className="inline-flex items-center gap-1.5 text-[#1D9E75]">
                <CheckCircle2 className="size-3.5" /> Conectado e verificado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[#E0A93B]">
                <ShieldAlert className="size-3.5" /> Chaves salvas, mas não verificadas
              </span>
            )}
            <span className="text-muted-foreground">
              {data.exchange} · {data.keyPreview}
              {data.verifiedAt && ` · ${new Date(data.verifiedAt).toLocaleString()}`}
            </span>
          </div>

          {data.lastError && <p className="text-xs text-[#E24B4A]">{data.lastError}</p>}

          {test.isSuccess && test.data.balances && test.data.balances.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Saldos: {test.data.balances.map((b) => `${b.asset} ${b.free}`).join(" · ")}
            </p>
          )}
          {test.isError && <p className="text-xs text-[#E24B4A]">{errMsg(test.error)}</p>}

          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={busy} onClick={() => test.mutate()}>
              {test.isPending && <Loader2 className="size-3.5 mr-2 animate-spin" />}
              Testar conexão
            </Button>
            <Button size="sm" variant="destructive" disabled={busy} onClick={() => remove.mutate()}>
              <Trash2 className="size-3.5 mr-2" /> Remover chaves
            </Button>
          </div>
        </div>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="ex-key">API key</Label>
            <Input
              id="ex-key"
              value={apiKey}
              autoComplete="off"
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ex-secret">API secret</Label>
            <Input
              id="ex-secret"
              type="password"
              value={apiSecret}
              autoComplete="new-password"
              onChange={(e) => setApiSecret(e.target.value)}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Use uma chave HMAC da Binance.com com leitura ativa e sem permissão de saque. Se houver
            restrição de IP, autorize o IP do servidor, não o IP do seu aparelho.
          </p>
          {save.isError && <p className="text-xs text-[#E24B4A]">{errMsg(save.error)}</p>}
          <Button size="sm" type="submit" disabled={busy || !apiKey || !apiSecret}>
            {save.isPending && <Loader2 className="size-3.5 mr-2 animate-spin" />}
            Conectar e verificar
          </Button>
        </form>
      )}
    </SectionCard>
  );
}
