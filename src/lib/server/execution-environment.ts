/**
 * Contrato global de ambiente operacional.
 *
 * Fase 41:
 * - DEMO usa o pipeline operacional real, mas aponta para um ambiente TEST.
 * - REAL aponta para PRODUCTION, sujeito aos gates server-side já existentes.
 *
 * A Fase 45 liga explicitamente o executor DEMO ao Binance Spot Testnet.
 */

export const EXECUTION_MODES = ['DEMO', 'REAL'] as const;
export type ExecutionMode = (typeof EXECUTION_MODES)[number];

export const EXECUTION_ENVIRONMENTS = ['TEST', 'PRODUCTION'] as const;
export type ExecutionEnvironment = (typeof EXECUTION_ENVIRONMENTS)[number];

export interface ExecutionContext {
  mode: ExecutionMode;
  environment: ExecutionEnvironment;
}

export function environmentForMode(mode: ExecutionMode): ExecutionEnvironment {
  return mode === 'REAL' ? 'PRODUCTION' : 'TEST';
}

export function createExecutionContext(mode: ExecutionMode): ExecutionContext {
  return { mode, environment: environmentForMode(mode) };
}

/** Mapeia o modo operacional para o ambiente Spot da Binance sem depender de env global. */
export function binanceEnvironmentForMode(mode: ExecutionMode): 'testnet' | 'production' {
  return mode === 'REAL' ? 'production' : 'testnet';
}

export function assertExecutionContext(context: ExecutionContext): void {
  const expected = environmentForMode(context.mode);
  if (context.environment !== expected) {
    throw new Error(
      'Ambiente de execução incompatível com o modo ' + context.mode +
      ': esperado ' + expected + ', recebido ' + context.environment,
    );
  }
}

export function isProductionExecution(context: ExecutionContext): boolean {
  return context.environment === 'PRODUCTION';
}

/**
 * Gate explícito da Fase 41.
 *
 * O contrato conhece o destino REAL, mas não concede autorização para
 * submissão. A autorização de execução REAL continua pertencendo aos gates
 * server-side do executor e permanece fechada até fase posterior.
 */
export function isRealExecutionAuthorized(_context: ExecutionContext): false {
  return false;
}
/** Gate único da submissão REAL. Mantido fechado até aprovação operacional explícita. */
export function assertRealExecutionAuthorized(context: ExecutionContext): void {
  assertExecutionContext(context)
  if (context.mode !== 'REAL' || !isProductionExecution(context) || !isRealExecutionAuthorized(context)) {
    throw new Error('Execução REAL não autorizada pelo gate operacional.')
  }
}
