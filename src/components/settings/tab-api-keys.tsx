import { SectionCard } from "./section-card";
import { KeysManagement } from "@/components/api/keys-management";

// SEG-07: a versão antiga desta aba gerava chaves de API apenas no estado do
// React (crypto.getRandomValues + useState), sem backend, sem hashing e sem
// validação. Também forçava `isPro = true` no cliente, dando ao usuário
// uma falsa sensação de acesso ao plano Institutional.
//
// Reutilizamos o mesmo placeholder "Em breve" exibido em /api enquanto o
// backend real (tabela api_keys + RPC de emissão + middleware) não existe.
export function SettingsApiKeys() {
  return (
    <SectionCard title="API Keys" description="Gestão de chaves de API.">
      <KeysManagement />
    </SectionCard>
  );
}
