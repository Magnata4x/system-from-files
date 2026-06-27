// Tipo canônico de plan_tier — fonte única de verdade para todas as camadas.
// Importar daqui; nunca redefinir os valores em outros arquivos.
// Mantido em sincronia com a constraint do banco:
//   CHECK (plan_tier IN ('starter','pro','institutional'))

export const PLAN_TIERS = ["starter", "pro", "institutional"] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];
