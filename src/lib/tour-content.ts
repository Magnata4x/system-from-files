import {
  TrendingUp, Radar, Grid3x3, Gauge, Dna, SlidersHorizontal, CandlestickChart, Star,
  LayoutGrid, Play, ArrowUpDown, Calculator, BarChart3, AlertTriangle, UserCircle2,
  Calendar, Hexagon, Lightbulb, Sparkles, ShieldAlert, Bell, Building2, Cloud, Table,
  Bot, Wallet, Maximize, ShieldCheck, GitBranch, Send, Filter, ListChecks, UserCog,
  Link as LinkIcon, Crown, Lock, Palette, CreditCard, CalendarRange, Tag, ShieldQuestion,
  Code as CodeIcon, List, type LucideIcon,
} from "lucide-react";

export type TourStep = {
  selector: string;
  icon: LucideIcon;
  title: string;
  text: string;
};

export type TourDef = {
  id: string;
  label: string;
  route?: string;          // route prefix that auto-triggers this tour
  manualOnly?: boolean;    // do not auto-trigger; replay only
  next?: { id: string; route: string; label: string };
  steps: TourStep[];
};

export const TOURS: TourDef[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    route: "/dashboard",
    next: { id: "signals", route: "/signals", label: "Signal Radar" },
    steps: [
      { selector: "[data-tour='top-bar-prices']", icon: TrendingUp, title: "Preços em tempo real", text: "Os preços das principais criptomoedas atualizam automaticamente a cada 3 segundos. BTC, ETH e a dominância BTC ficam sempre visíveis aqui." },
      { selector: "[data-tour='metric-signals']", icon: Radar, title: "Sinais ativos agora", text: "Este número mostra quantos sinais de alta qualidade estão ativos neste momento. Clique para ir direto ao Signal Radar e ver todos os detalhes." },
      { selector: "[data-tour='heatmap']", icon: Grid3x3, title: "Heatmap de ativos", text: "Cada célula representa um ativo. Verde = valorização. Vermelho = queda. A intensidade da cor indica a magnitude do movimento." },
      { selector: "[data-tour='fear-greed']", icon: Gauge, title: "Índice Fear & Greed", text: "Mede o sentimento geral do mercado de 0 a 100. Abaixo de 25 = Medo Extremo (historicamente bom para comprar). Acima de 75 = Ganância Extrema (cautela)." },
      { selector: "[data-tour='dna-panel']", icon: Dna, title: "Seu DNA Trader", text: "Resumo do seu perfil comportamental. A IA analisa seus padrões e recomenda os melhores setups para o seu estilo. Clique em 'Relatório completo' para ver tudo." },
    ],
  },
  {
    id: "signals",
    label: "Signal Radar",
    route: "/signals",
    next: { id: "dna-trader", route: "/dna-trader", label: "DNA Trader" },
    steps: [
      { selector: "[data-tour='filter-bar']", icon: SlidersHorizontal, title: "Filtros de sinal", text: "Filtre os sinais por ativo, timeframe, score mínimo e direção (BUY/SELL). Use 'Score ≥75' para ver apenas os sinais de alta probabilidade." },
      { selector: "[data-tour='signal-card']", icon: CandlestickChart, title: "Card de sinal", text: "Cada card mostra o ativo, direção, score da IA, preços de entrada/stop/alvo e a relação risco/retorno. A barra lateral verde = BUY, vermelha = SELL." },
      { selector: "[data-tour='score-badge']", icon: Star, title: "Score de qualidade", text: "Roxo (≥90) = Institucional Premium. Verde (75-89) = Alta probabilidade. Âmbar (60-74) = Moderado. Vermelho (<60) = Evitar." },
      { selector: "[data-tour='view-toggle']", icon: LayoutGrid, title: "Modos de visualização", text: "Cards: visual e intuitivo. Tabela: densa, ideal para comparar muitos sinais. Radar Map: scatter chart mostrando R/R vs Score para identificar as melhores oportunidades." },
      { selector: "[data-tour='live-toggle']", icon: Play, title: "Modo ao vivo", text: "Com o Live ativado, novos sinais aparecem automaticamente no topo da lista. Um toast de notificação avisa quando um sinal de score alto chega." },
    ],
  },
  {
    id: "signal-detail",
    label: "Detalhe do Sinal",
    manualOnly: true,
    steps: [
      { selector: "[data-tour='price-ladder']", icon: ArrowUpDown, title: "Níveis do trade", text: "A escada de preços mostra entrada, stop loss e dois alvos. As % ao lado mostram a distância de cada nível em relação à entrada." },
      { selector: "[data-tour='position-calc']", icon: Calculator, title: "Calculadora de posição", text: "Insira seu capital e o risco por trade (%) para calcular automaticamente o tamanho da posição em USDT e a quantidade de unidades do ativo." },
      { selector: "[data-tour='score-breakdown']", icon: BarChart3, title: "Breakdown do score", text: "O score total é composto por 6 camadas: Price Action, Indicadores, Volume & Fluxo, Sentimento, Contexto Macro e Risco de Manipulação." },
      { selector: "[data-tour='invalidation']", icon: AlertTriangle, title: "Cenários de invalidação", text: "Se qualquer uma dessas condições ocorrer, o trade foi invalidado. O sistema atualiza o status do sinal automaticamente." },
    ],
  },
  {
    id: "dna-trader",
    label: "DNA Trader",
    route: "/dna-trader",
    next: { id: "manipulation", route: "/manipulation", label: "Manipulation Radar" },
    steps: [
      { selector: "[data-tour='archetype']", icon: UserCircle2, title: "Seu arquétipo de trader", text: "Com base no seu histórico, a IA identificou seu arquétipo dominante. Os 5 gauges mostram suas forças e pontos de melhoria em diferentes dimensões." },
      { selector: "[data-tour='behavior-heatmap']", icon: Calendar, title: "Heatmap de performance", text: "Calendário dos últimos 90 dias. Verde = dia lucrativo. Vermelho = prejuízo. Passe o mouse sobre qualquer dia para ver as estatísticas daquele dia." },
      { selector: "[data-tour='dna-radar']", icon: Hexagon, title: "Radar do seu DNA", text: "A área ciano é o seu DNA atual. A linha roxa pontilhada é o benchmark institucional. O objetivo é expandir sua área ciano para se aproximar do hexágono externo." },
      { selector: "[data-tour='dna-insights']", icon: Lightbulb, title: "Insights comportamentais", text: "A IA identifica padrões automáticos no seu histórico. Verde = ponto forte. Vermelho = padrão negativo a corrigir. Cada card traz uma ação concreta de melhoria." },
      { selector: "[data-tour='dna-recommendations']", icon: Sparkles, title: "Estratégias personalizadas", text: "Recomendações geradas especificamente para o seu DNA: qual setup focar, qual timeframe priorizar, qual horário evitar e qual risco por trade usar." },
    ],
  },
  {
    id: "manipulation",
    label: "Manipulation Radar",
    route: "/manipulation",
    next: { id: "sentiment", route: "/sentiment", label: "Sentiment AI" },
    steps: [
      { selector: "[data-tour='alert-banner']", icon: ShieldAlert, title: "Alertas ativos", text: "O banner vermelho aparece quando há manipulação detectada agora. Evite abrir novas posições nos ativos listados até o alerta ser resolvido." },
      { selector: "[data-tour='manip-heatmap']", icon: Grid3x3, title: "Heatmap de risco institucional", text: "Cada célula cruza um ativo com um timeframe. Azul escuro = seguro. Vermelho pulsante = alerta ativo. Clique em qualquer célula para ver o detalhe." },
      { selector: "[data-tour='alert-feed']", icon: Bell, title: "Feed de alertas", text: "Cada alerta mostra o tipo de manipulação (Stop Hunt, Fake Breakout, Liquidity Grab...), a confiança da detecção e a ação recomendada." },
      { selector: "[data-tour='smart-money']", icon: Building2, title: "Smart Money Activity", text: "Order flow mostra a pressão compradora vs vendedora. Ordens de baleias (whales) podem indicar movimentos direcionais iminentes." },
    ],
  },
  {
    id: "sentiment",
    label: "Sentiment AI",
    route: "/sentiment",
    next: { id: "bot4x", route: "/bot4x", label: "Bot4x" },
    steps: [
      { selector: "[data-tour='sent-gauge']", icon: Gauge, title: "Fear & Greed em tempo real", text: "O índice consolida dados de 4 fontes: redes sociais, notícias, on-chain e derivativos. Extremos históricos tendem a preceder reversões de mercado." },
      { selector: "[data-tour='sent-sources']", icon: CodeIcon, title: "4 fontes de sentimento", text: "Twitter/X, Reddit, Notícias e On-Chain têm scores independentes. Quando todas apontam para o mesmo lado, o sinal é mais robusto." },
      { selector: "[data-tour='narrative-cloud']", icon: Cloud, title: "Narrativas dominantes", text: "O tamanho de cada tag reflete a relevância da narrativa agora. Verde = narrativa bullish. Vermelho = bearish. Use para entender o contexto macro do mercado." },
      { selector: "[data-tour='asset-sent-table']", icon: Table, title: "Score por ativo", text: "Sentimento individual para cada criptomoeda. A coluna Signal mostra BULLISH, BEARISH ou NEUTRAL com base na combinação dos 3 scores." },
    ],
  },
  {
    id: "bot4x",
    label: "Bot4x",
    route: "/bot4x",
    next: { id: "alerts", route: "/alerts", label: "Alertas" },
    steps: [
      { selector: "[data-tour='bot-mode-toggle']", icon: Bot, title: "Sempre comece em DEMO", text: "O modo DEMO simula todas as operações sem risco real. Valide sua estratégia por pelo menos 7 dias em DEMO antes de ativar o modo REAL." },
      { selector: "[data-tour='bot-capital']", icon: Wallet, title: "Capital e alocação", text: "O capital ativo é calculado automaticamente. Cada slot de trade usa exatamente 1/3 do capital ativo — máximo de 3 posições simultâneas." },
      { selector: "[data-tour='bot-leverage']", icon: Maximize, title: "Alavancagem e risco", text: "Alavancagem 1-3 = espaço gráfico amplo, menor risco de violinada (RECOMENDADO). Alavancagem 8-10 = espaço mínimo, apenas para scalpers experientes." },
      { selector: "[data-tour='bot-breakers']", icon: ShieldCheck, title: "Disjuntores automáticos", text: "O Bot4x se desliga automaticamente se o prejuízo diário atingir -1.5% (emergência) ou se o lucro recuar do pico de +4% para +3% (proteção de ganhos)." },
      { selector: "[data-tour='bot-profiles']", icon: SlidersHorizontal, title: "Calibrador de perfil", text: "Conservador = mais filtros, menos trades, maior win rate. Agressivo = menos filtros, mais trades, win rate menor. Comece com Conservador." },
      { selector: "[data-tour='bot-pipeline']", icon: GitBranch, title: "Pipeline de filtros", text: "Visualize em tempo real como cada Market Tick passa pelos 6 filtros. Verde = aprovado. Vermelho = bloqueado neste filtro. O JSON output mostra a decisão completa." },
    ],
  },
  {
    id: "alerts",
    label: "Alertas",
    route: "/alerts",
    next: { id: "profile", route: "/profile", label: "Perfil" },
    steps: [
      { selector: "[data-tour='telegram-toggle']", icon: Send, title: "Conecte o Telegram primeiro", text: "O Telegram é o canal mais rápido para alertas de trading. Conecte em 3 cliques: clique em 'Conectar', siga as instruções e confirme o código." },
      { selector: "[data-tour='score-slider']", icon: Filter, title: "Filtre pelo score mínimo", text: "Recomendamos score ≥ 75 para evitar ruído. Score ≥ 90 = apenas sinais Institucional Premium — muito seletivo mas alta qualidade." },
      { selector: "[data-tour='alert-types']", icon: ListChecks, title: "Escolha seus alertas", text: "Não ative todos — menos alertas = mais atenção em cada um. Recomendamos: Novo sinal ≥80 + Manipulação detectada + Stop hunt como base." },
    ],
  },
  {
    id: "profile",
    label: "Perfil",
    route: "/profile",
    next: { id: "settings", route: "/settings", label: "Configurações" },
    steps: [
      { selector: "[data-tour='trading-prefs']", icon: UserCog, title: "Configure suas preferências", text: "Defina seus mercados e timeframes preferidos. Essas informações alimentam o DNA Trader e personalizam as recomendações de sinais." },
      { selector: "[data-tour='connected-accounts']", icon: LinkIcon, title: "Conecte suas contas", text: "Conecte o Telegram para alertas, o Google para login rápido e as APIs das exchanges para o Bot4x em modo REAL (somente leitura, sem execução automática aqui)." },
      { selector: "[data-tour='plan-badge']", icon: Crown, title: "Seu plano atual", text: "Clique em 'Upgrade' para ver os benefícios do plano Pro: sinais ilimitados, Sentiment AI, Manipulation Radar, DNA Trader e muito mais." },
    ],
  },
  {
    id: "settings",
    label: "Configurações",
    route: "/settings",
    next: { id: "pricing", route: "/pricing", label: "Planos" },
    steps: [
      { selector: "[data-tour='settings-security']", icon: Lock, title: "Ative o 2FA agora", text: "A autenticação em 2 fatores protege sua conta mesmo se sua senha for comprometida. Use Google Authenticator ou Authy. Leva menos de 2 minutos." },
      { selector: "[data-tour='settings-appearance']", icon: Palette, title: "Personalize a interface", text: "Escolha a densidade de informação (Compacto/Padrão/Confortável) e o gráfico padrão. O dark mode é permanente — construído para sessões longas." },
      { selector: "[data-tour='settings-billing']", icon: CreditCard, title: "Gerencie sua assinatura", text: "Histórico de pagamentos, troca de plano e cancelamento ficam aqui. Assinaturas anuais têm 20% de desconto." },
    ],
  },
  {
    id: "dna-30",
    label: "DNA Trader (30 dias)",
    manualOnly: true,
    steps: [
      { selector: "[data-tour='dna-evolution']", icon: TrendingUp, title: "Sua evolução em 30 dias", text: "Após 1 mês operando, o DNA Trader tem dados suficientes para mostrar sua curva de evolução. Compare o score atual com o do início." },
      { selector: "[data-tour='dna-monthly']", icon: CalendarRange, title: "Compare mês a mês", text: "O score DNA é recalculado todo dia 1. Use o seletor de período para comparar sua performance entre meses diferentes." },
    ],
  },
  {
    id: "pricing",
    label: "Planos",
    route: "/pricing",
    steps: [
      { selector: "[data-tour='plan-table']", icon: Tag, title: "Compare os planos", text: "O plano Pro inclui todos os módulos de IA: DNA Trader, Manipulation Radar, Sentiment AI e sinais ilimitados. Experimente grátis por 7 dias." },
      { selector: "[data-tour='annual-toggle']", icon: Calendar, title: "Economize 20% no plano anual", text: "Assinatura anual custa 20% menos que o mensal. Para traders que pretendem usar a plataforma continuamente, o anual se paga em 2-3 meses." },
    ],
  },
  {
    id: "bot4x-calibrador",
    label: "Bot4x — Calibrador",
    manualOnly: true,
    steps: [
      { selector: "[data-tour='calib-conservative']", icon: ShieldQuestion, title: "Comece pelo Conservador", text: "Para traders novos no Bot4x: ative o perfil Conservador com alavancagem 1:3. Rode em DEMO por 7 dias antes de qualquer ajuste." },
      { selector: "[data-tour='calib-impact']", icon: BarChart3, title: "Impacto de cada perfil", text: "Os 4 cards mostram como cada perfil afeta o número de trades, bloqueios e win rate estimado com base em 30 dias de simulação histórica." },
      { selector: "[data-tour='calib-matrix']", icon: Grid3x3, title: "Compatibilidade por alavancagem", text: "A tabela cruza perfis com alavancagens. Verde = compatível. Âmbar = monitorar. Vermelho = não recomendado. Siga essas restrições para proteger o capital." },
    ],
  },
  {
    id: "bot4x-monitor",
    label: "Bot4x — Monitor",
    manualOnly: true,
    steps: [
      { selector: "[data-tour='monitor-pipeline']", icon: GitBranch, title: "A pipeline de decisão", text: "Os 6 filtros são executados em sequência para cada tick de mercado. Um tick só vira ordem se passar por todos os filtros. A contagem mostra quantos bloqueios houve hoje em cada filtro." },
      { selector: "[data-tour='monitor-feed']", icon: List, title: "Feed de ticks em tempo real", text: "Cada card mostra um Market Tick processado. Verde = passou todos os filtros e foi executado. Vermelho = bloqueado no filtro indicado. Clique em qualquer card para ver o JSON completo." },
      { selector: "[data-tour='monitor-json']", icon: CodeIcon, title: "JSON output do bot", text: "O JSON é a resposta exata do motor de decisão. Em modo REAL, esse JSON é enviado diretamente para a API da Binance Futures para executar a ordem." },
    ],
  },
];

export const TOUR_MAP: Record<string, TourDef> = Object.fromEntries(TOURS.map((t) => [t.id, t]));

export function tourForRoute(pathname: string): TourDef | undefined {
  return TOURS.find((t) => t.route && (pathname === t.route || pathname.startsWith(t.route + "/")));
}
