export type Plan = {
  id: "starter" | "pro" | "institutional";
  name: string;
  badge: string;
  tagline: string;
  monthly: number;
  annualMonthly: number;
  showPrice: boolean;
  cta: string;
  ctaVariant: "outline" | "primary";
  featured?: boolean;
  features: { label: string; included: boolean }[];
};

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    badge: "Para começar",
    tagline: "Para traders individuais começando.",
    monthly: 97,
    annualMonthly: 77,
    showPrice: true,
    cta: "Começar grátis por 7 dias",
    ctaVariant: "outline",
    features: [
      { label: "Radar de sinais (10 ativos)", included: true },
      { label: "Score IA básico (0–100)", included: true },
      { label: "Alertas Telegram (5/dia)", included: true },
      { label: "Dashboard + heatmap", included: true },
      { label: "TradingView integrado", included: true },
      { label: "Sentiment AI", included: false },
      { label: "Manipulation Radar", included: false },
      { label: "DNA Trader", included: false },
      { label: "API access", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    badge: "Mais popular",
    tagline: "Para traders ativos que vivem do mercado.",
    monthly: 247,
    annualMonthly: 197,
    showPrice: true,
    cta: "Assinar Pro",
    ctaVariant: "primary",
    featured: true,
    features: [
      { label: "Radar ilimitado (todos os ativos)", included: true },
      { label: "Score IA avançado + explicação", included: true },
      { label: "Alertas multicanal (ilimitados)", included: true },
      { label: "Sentiment AI completo", included: true },
      { label: "Manipulation Radar", included: true },
      { label: "DNA Trader", included: true },
      { label: "Multi-exchange (5)", included: true },
      { label: "Copy Trading (seguir)", included: true },
      { label: "API access", included: false },
    ],
  },
  {
    id: "institutional",
    name: "Institutional",
    badge: "Para profissionais",
    tagline: "Para mesas, fundos e infraestrutura.",
    monthly: 697,
    annualMonthly: 557,
    showPrice: false,
    cta: "Falar com vendas",
    ctaVariant: "outline",
    features: [
      { label: "Tudo do Pro", included: true },
      { label: "API pública completa", included: true },
      { label: "Webhook avançado", included: true },
      { label: "White label", included: true },
      { label: "Múltiplos usuários (até 10)", included: true },
      { label: "Fluxo institucional", included: true },
      { label: "Suporte prioritário", included: true },
      { label: "SLA 99.9%", included: true },
    ],
  },
];

export type CompareCell = boolean | string;
export type CompareRow = { feature: string; starter: CompareCell; pro: CompareCell; institutional: CompareCell };
export type CompareGroup = { group: string; rows: CompareRow[] };

export const COMPARISON: CompareGroup[] = [
  {
    group: "Sinais & Inteligência",
    rows: [
      { feature: "Ativos monitorados", starter: "10", pro: "Ilimitado", institutional: "Ilimitado" },
      { feature: "Score IA", starter: "Básico", pro: "Avançado + explicação", institutional: "Avançado + custom" },
      { feature: "Sentiment AI", starter: false, pro: true, institutional: true },
      { feature: "Manipulation Radar", starter: false, pro: true, institutional: true },
      { feature: "DNA Trader", starter: false, pro: true, institutional: true },
    ],
  },
  {
    group: "Alertas & Canais",
    rows: [
      { feature: "Alertas Telegram", starter: "5/dia", pro: "Ilimitado", institutional: "Ilimitado" },
      { feature: "Alertas Discord", starter: false, pro: true, institutional: true },
      { feature: "Webhooks", starter: false, pro: "Básico", institutional: "Avançado" },
      { feature: "Push mobile", starter: true, pro: true, institutional: true },
    ],
  },
  {
    group: "Execução",
    rows: [
      { feature: "Exchanges conectadas", starter: "1", pro: "5", institutional: "Ilimitado" },
      { feature: "Copy Trading", starter: false, pro: "Seguir", institutional: "Seguir + ser seguido" },
      { feature: "Bot4x automação", starter: false, pro: true, institutional: true },
    ],
  },
  {
    group: "Plataforma & Suporte",
    rows: [
      { feature: "API pública", starter: false, pro: false, institutional: true },
      { feature: "White label", starter: false, pro: false, institutional: true },
      { feature: "Usuários incluídos", starter: "1", pro: "1", institutional: "Até 10" },
      { feature: "SLA", starter: "—", pro: "99%", institutional: "99.9%" },
      { feature: "Suporte", starter: "E-mail", pro: "Chat prioritário", institutional: "Gerente dedicado" },
    ],
  },
];

export const FAQS = [
  {
    q: "Posso cancelar a qualquer momento?",
    a: "Sim. O cancelamento é instantâneo na própria conta — você mantém o acesso até o fim do período pago, sem multa ou retenção.",
  },
  {
    q: "O período trial precisa de cartão?",
    a: "Não. O teste de 7 dias do Starter e do Pro não exige cartão de crédito. Você só informa pagamento se decidir continuar.",
  },
  {
    q: "Posso mudar de plano depois?",
    a: "Sim. Upgrades são proporcionais e ativam imediatamente. Downgrades entram em vigor no próximo ciclo de cobrança.",
  },
  {
    q: "Quais exchanges são suportadas?",
    a: "Binance, Bybit, OKX, Bitget e Coinbase Advanced. No plano Institutional adicionamos integrações customizadas sob demanda.",
  },
  {
    q: "Como funciona o desconto anual?",
    a: "Pagando 12 meses adiantados você economiza 20% em todos os planos. A cobrança é única e renovável anualmente.",
  },
  {
    q: "O plano Institutional aceita NF para PJ?",
    a: "Sim. Emitimos NFS-e brasileira e fatura internacional, com contrato MSA opcional e termos customizados de SLA.",
  },
];
