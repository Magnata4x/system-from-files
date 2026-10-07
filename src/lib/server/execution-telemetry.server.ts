export interface VerifiedExecutionTelemetryRow {
  status: string
  side: string
  realizedPnl: number | null
}

export function summarizeVerifiedExecutionTelemetry(rows: VerifiedExecutionTelemetryRow[]) {
  const realized = rows.filter(
    (row) =>
      row.status === 'completed' &&
      row.side === 'SELL' &&
      row.realizedPnl !== null &&
      Number.isFinite(row.realizedPnl),
  )
  const pnl = realized.reduce((sum, row) => sum + Number(row.realizedPnl), 0)

  return {
    wins: realized.filter((row) => Number(row.realizedPnl) > 0).length,
    losses: realized.filter((row) => Number(row.realizedPnl) < 0).length,
    pnl: Number(pnl.toFixed(2)),
    completed: rows.filter((row) => row.status === 'completed').length,
    submitted: rows.filter((row) => row.status === 'submitted').length,
    pending: rows.filter((row) => row.status === 'pending').length,
    failed: rows.filter((row) => row.status === 'failed').length,
  }
}
