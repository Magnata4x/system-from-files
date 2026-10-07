export interface VerifiedExecutionTelemetryRow {
  status: string
  side: string
  realizedPnl: number | null
  createdAt: string
}

function localDateKey(iso: string, timezone: string) {
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return null
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date)
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
    return `${values.year}-${values.month}-${values.day}`
  } catch {
    return null
  }
}

export function summarizeVerifiedExecutionTelemetry(
  rows: VerifiedExecutionTelemetryRow[],
  timezone: string,
  now = new Date(),
) {
  const todayKey = localDateKey(now.toISOString(), timezone)
  const todayRows = todayKey
    ? rows.filter((row) => localDateKey(row.createdAt, timezone) === todayKey)
    : []

  const realized = todayRows.filter(
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
    completed: todayRows.filter((row) => row.status === 'completed').length,
    submitted: todayRows.filter((row) => row.status === 'submitted').length,
    pending: todayRows.filter((row) => row.status === 'pending').length,
    failed: todayRows.filter((row) => row.status === 'failed').length,
  }
}
