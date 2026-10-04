import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// --- Mocks --------------------------------------------------------------

const sendLovableEmailMock = vi.fn()
vi.mock('@lovable.dev/email-js', () => ({
  sendLovableEmail: (...args: unknown[]) => sendLovableEmailMock(...args),
}))

type Result = { data?: unknown; error?: unknown }

function makeBuilder(result: Result = { data: null, error: null }) {
  const thenable = {
    ...result,
    then: (resolve: (v: Result) => void) => resolve(result),
  }
  const builder: any = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => Promise.resolve(result)),
    update: vi.fn(() => builder),
    eq: vi.fn(() => thenable),
    in: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(result)),
  }
  return builder
}

const rpcMock = vi.fn()
const fromMock = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => fromMock(table),
    rpc: (name: string, args: unknown) => rpcMock(name, args),
  }),
}))

describe('email queue processor — TTL fallback', () => {
  const ORIGINAL_ENV = { ...process.env }
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    process.env.LOVABLE_API_KEY = 'test-api-key'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
    process.env.EMAIL_QUEUE_CRON_SECRET = 'test-cron-secret'

    sendLovableEmailMock.mockReset().mockResolvedValue(undefined)
    rpcMock.mockReset()
    fromMock.mockReset()
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
    process.env = { ...ORIGINAL_ENV }
    vi.unstubAllEnvs()
  })

  it('processes email without queued_at and logs warning', async () => {
    const stateBuilder = makeBuilder({ data: {}, error: null })

    fromMock.mockImplementation((table: string) => {
      if (table === 'email_send_state') return stateBuilder
      if (table === 'email_send_log') return makeBuilder({ data: [], error: null })
      return makeBuilder()
    })

    const messageWithoutTimestamp = {
      msg_id: 42,
      read_ct: 0,
      message: {
        message_id: 'mid-without-ts',
        to: 'user@example.com',
        from: 'noreply@example.com',
        subject: 'Hi',
        html: '<p>Hi</p>',
        label: 'welcome',
      },
    }

    rpcMock.mockImplementation((name: string) => {
      if (name === 'read_email_batch') {
        if (rpcMock.mock.calls.filter((c) => c[0] === 'read_email_batch').length === 1) {
          return Promise.resolve({ data: [messageWithoutTimestamp], error: null })
        }
        return Promise.resolve({ data: [], error: null })
      }
      if (name === 'delete_email') return Promise.resolve({ error: null })
      if (name === 'move_to_dlq') return Promise.resolve({ error: null })
      return Promise.resolve({ data: null, error: null })
    })

    const { Route } = await import('../process')
    const handler = (Route as any).options.server.handlers.POST

    const response = await handler({
      request: new Request('http://test/lovable/email/queue/process', {
        method: 'POST',
        headers: { Authorization: 'Bearer test-cron-secret' },
      }),
    })

    const body = await response.json()

    expect(sendLovableEmailMock).toHaveBeenCalledTimes(1)
    expect(body.processed).toBe(1)

    expect(rpcMock).not.toHaveBeenCalledWith(
      'move_to_dlq',
      expect.anything()
    )

    const warnCall = warnSpy.mock.calls.find((c: unknown[]) =>
      String(c[0]).includes('timestamp de enfileiramento')
    )
    expect(warnCall).toBeTruthy()
    expect(warnCall?.[1]).toMatchObject({
      msg_id: 42,
      message_id: 'mid-without-ts',
    })
  })
})
