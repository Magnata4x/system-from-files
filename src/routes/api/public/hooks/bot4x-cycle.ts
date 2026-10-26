import { createFileRoute } from '@tanstack/react-router'

/**
 * Gatilho agendado do ciclo Bot4x (pg_cron → pg_net → este endpoint).
 *
 * O bearer token aqui é apenas um filtro de tráfego (a chave publishable é
 * pública): o ciclo é idempotente por natureza — as chaves de idempotência
 * são determinísticas por sinal/candle, então chamadas repetidas ou
 * maliciosas não criam ordens duplicadas. A execução DEMO continua gated por
 * BOT4X_DEMO_AUTO_EXECUTION e pelas credenciais Testnet verificadas de cada
 * usuário; REAL permanece bloqueado pelo gate operacional.
 */
export const Route = createFileRoute('/api/public/hooks/bot4x-cycle')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get('authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        const { runBot4xOrchestratorCycle } = await import('@/lib/server/bot4x-orchestrator.server')
        const result = await runBot4xOrchestratorCycle()

        return new Response(
          JSON.stringify({
            success: true,
            startedAt: result.startedAt,
            finishedAt: result.finishedAt,
            usersScanned: result.usersScanned,
            signalsScanned: result.signalsScanned,
            candidates: result.candidates,
            blocked: result.blocked,
            ignored: result.ignored,
            exitsSubmitted: result.exitsSubmitted,
            executionsSubmitted: result.decisions.filter((d) => d.executionSubmitted).length,
          }),
          { headers: { 'Content-Type': 'application/json' } },
        )
      },
    },
  },
})
