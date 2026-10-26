// Credenciais de exchange do Bot4x: cifra AES-GCM + verificação na Binance.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types'
import { ApiError } from './api-auth.server'
import { getSupabaseAdmin } from './supabase-admin.server'

type Client = SupabaseClient<Database>

const enc = new TextEncoder()
const dec = new TextDecoder()

async function aesKey(): Promise<CryptoKey> {
  const secret = process.env['EXCHANGE_CREDENTIALS_KEY']
  if (!secret) throw new ApiError('Cofre de credenciais não configurado', 500)
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(secret))
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

function toB64(bytes: Uint8Array): string {
  let s = ''
  bytes.forEach((b) => (s += String.fromCharCode(b)))
  return btoa(s)
}

function fromB64(value: string): Uint8Array<ArrayBuffer> {
  const raw = atob(value)
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i)
  return out
}

export async function encryptSecret(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(), enc.encode(plain)),
  )
  return `${toB64(iv)}.${toB64(cipher)}`
}

export async function decryptSecret(payload: string): Promise<string> {
  const [ivPart, cipherPart] = payload.split('.')
  if (!ivPart || !cipherPart) throw new ApiError('Credencial corrompida', 500)
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(ivPart) },
    await aesKey(),
    fromB64(cipherPart),
  )
  return dec.decode(plain)
}

export interface ExchangeStatus {
  connected: boolean
  exchange: string
  environment: BinanceEnvironment
  keyPreview: string
  verified: boolean
  verifiedAt: string | null
  lastError: string | null
}

export type BinanceEnvironment = 'demo' | 'testnet' | 'production'

export function getBinanceEnvironment(): BinanceEnvironment {
  const value = process.env['BINANCE_TRADING_ENV']?.trim().toLowerCase()
  if (value === 'production' || value === 'testnet' || value === 'demo') return value
  return 'demo'
}

export function getBinanceBaseUrl(environment = getBinanceEnvironment()): string {
  if (environment === 'production') return 'https://api.binance.com/api'
  if (environment === 'testnet') return 'https://testnet.binance.vision/api'
  return 'https://demo-api.binance.com/api'
}

const EMPTY: ExchangeStatus = {
  connected: false,
  exchange: 'binance',
  environment: 'demo',
  keyPreview: '',
  verified: false,
  verifiedAt: null,
  lastError: null,
}

export async function getExchangeStatus(
  supabase: Client,
  userId: string,
  environment: BinanceEnvironment = getBinanceEnvironment(),
): Promise<ExchangeStatus> {
  const { data, error } = await getSupabaseAdmin()
    .from('exchange_credentials')
    .select('exchange, environment, key_preview, verified, verified_at, last_error')
    .eq('user_id', userId)
    .eq('environment', environment)
    .maybeSingle()
  if (error) {
    // Do not silently fall back to an environment-agnostic query: that could
    // return credentials from the wrong Binance environment.
    if (error.code === '42703' || error.code === 'PGRST204') {
      throw new ApiError(
        'Schema do banco desatualizado: aplique a migration 20261011000000_exchange_credentials_environment antes de consultar credenciais.',
        503,
      )
    }
    throw new ApiError('Não foi possível consultar as credenciais da exchange.', 503)
  }
  if (!data) return { ...EMPTY, environment }
  return {
    connected: true,
    exchange: data.exchange,
    environment: data.environment as BinanceEnvironment,
    keyPreview: data.key_preview,
    verified: data.verified,
    verifiedAt: data.verified_at,
    lastError: data.last_error,
  }
}

/** Assina uma chamada privada da Binance com método e parâmetros explícitos.
 *  O endpoint é derivado do ambiente da credencial carregada — nunca do
 *  ambiente global sozinho — para que uma chave de testnet nunca seja
 *  enviada à produção (e vice-versa). */
async function binanceSignedRequest(
  apiKey: string, apiSecret: string, method: 'GET' | 'POST', path: string, params: Record<string, string>,
  environment: BinanceEnvironment,
) {
  const query = new URLSearchParams({ ...params, timestamp: String(Date.now()), recvWindow: '10000' }).toString()
  const key = await crypto.subtle.importKey('raw', enc.encode(apiSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sigBytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(query)))
  const signature = Array.from(sigBytes).map((b) => b.toString(16).padStart(2, '0')).join('')
  const res = await fetch(getBinanceBaseUrl(environment) + path + '?' + query + '&signature=' + signature, { method, headers: { 'X-MBX-APIKEY': apiKey }, signal: AbortSignal.timeout(10_000) })
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) throw new ApiError(String(body['msg'] ?? ('Binance respondeu ' + res.status)), res.status, typeof body['code'] === 'number' ? body['code'] : undefined)
  return body
}

/** Assina e chama um endpoint privado da Binance (HMAC SHA-256). */
async function binanceSigned(apiKey: string, apiSecret: string, path: string, environment: BinanceEnvironment) {
  return binanceSignedRequest(apiKey, apiSecret, 'GET', path, {}, environment)
}

export interface VerifyResult extends ExchangeStatus {
  canTrade: boolean
  balances: { asset: string; free: number }[]
}

export interface UsdtBalance {
  asset: 'USDT'
  free: number
  locked: number
  total: number
  available: boolean
  updatedAt: string
}

async function verify(apiKey: string, apiSecret: string, environment: BinanceEnvironment) {
  const account = (await binanceSigned(apiKey, apiSecret, '/v3/account', environment)) as {
    canTrade?: boolean
    balances?: { asset: string; free: string }[]
  }
  return {
    canTrade: Boolean(account.canTrade),
    balances: (account.balances ?? [])
      .map((b) => ({ asset: b.asset, free: Number(b.free) }))
      .filter((b) => b.free > 0)
      .sort((a, b) => b.free - a.free)
      .slice(0, 10),
  }
}

const ENV_LABEL: Record<BinanceEnvironment, string> = {
  testnet: 'Spot Testnet (testnet.binance.vision)',
  demo: 'Demo Trading (demo.binance.com)',
  production: 'Binance real (binance.com)',
}

/** Testa a chave nos outros ambientes apenas para diagnóstico; nada é salvo. */
async function diagnoseKeyEnvironment(apiKey: string, apiSecret: string, target: BinanceEnvironment): Promise<string> {
  const others = (['testnet', 'demo', 'production'] as BinanceEnvironment[]).filter((e) => e !== target)
  for (const env of others) {
    try {
      await verify(apiKey, apiSecret, env)
      return `Esta chave pertence ao ambiente ${ENV_LABEL[env]}, mas o sistema está configurado para ${ENV_LABEL[target]}. Gere a chave em ${ENV_LABEL[target]}.`
    } catch (e) {
      if (env === 'production' && e instanceof ApiError && e.code === -2015) {
        // Pode ser chave real com restrição de IP — o servidor não tem IP fixo.
      }
    }
  }
  return `Chave não aceita em ${ENV_LABEL[target]}. Verifique: (1) a chave foi gerada em ${ENV_LABEL[target]}; (2) a restrição de IP está DESATIVADA ("Unrestricted") — o servidor não usa IP fixo; (3) a permissão de Spot Trading/Reading está ativa; (4) copie key e secret sem espaços.`
}


/** Lê o saldo Spot em USDT sem expor as credenciais ou outros ativos. */
export async function getUsdtBalance(supabase: Client, userId: string): Promise<UsdtBalance> {
  const { data, error } = await getSupabaseAdmin()
    .from('exchange_credentials')
    .select('api_key_cipher, api_secret_cipher, verified')
    .eq('user_id', userId)
    .eq('environment', getBinanceEnvironment())
    .maybeSingle()
  if (error) throw new ApiError(error.message, 500)
  if (!data || !data.verified) throw new ApiError('Binance não conectada ou não verificada.', 409)

  const account = (await binanceSigned(
    await decryptSecret(data.api_key_cipher),
    await decryptSecret(data.api_secret_cipher),
    '/v3/account',
    getBinanceEnvironment(),
  )) as { balances?: Array<{ asset: string; free: string; locked: string }> }
  const balance = account.balances?.find((item) => item.asset === 'USDT')
  const free = Number(balance?.free ?? 0)
  const locked = Number(balance?.locked ?? 0)
  return {
    asset: 'USDT',
    free,
    locked,
    total: free + locked,
    available: true,
    updatedAt: new Date().toISOString(),
  }
}

export interface VerifiedBinanceAccount {
  canTrade: boolean
  balances: { asset: string; free: number; locked: number }[]
}

async function getStoredCredentials(supabase: Client, userId: string) {
  const expectedEnvironment = getBinanceEnvironment()
  const { data, error } = await getSupabaseAdmin()
    .from('exchange_credentials')
    .select('api_key_cipher, api_secret_cipher, verified, environment')
    .eq('user_id', userId)
    .eq('environment', expectedEnvironment)
    .maybeSingle()
  if (error) throw new ApiError(error.message, 500)
  if (!data || !data.verified) {
    throw new ApiError('Binance não conectada ou não verificada.', 409)
  }
  // Defesa em profundidade: a credencial carregada deve pertencer ao ambiente
  // operacional atual. Divergência recusa a operação — sem fallback.
  if (data.environment !== expectedEnvironment) {
    throw new ApiError('Credencial de ambiente divergente do ambiente operacional.', 409)
  }
  return {
    apiKey: await decryptSecret(data.api_key_cipher),
    apiSecret: await decryptSecret(data.api_secret_cipher),
    environment: data.environment as BinanceEnvironment,
  }
}

/** Envia uma ordem MARKET somente após a validação server-side.
 *  BUY usa quoteOrderQty (valor em USDT); SELL usa quantity (quantidade do
 *  ativo), pois no Spot a venda consome o saldo do ativo base. */
export async function submitVerifiedBinanceMarketOrder(
  supabase: Client, userId: string,
  input: { symbol: string; side: 'BUY' | 'SELL'; quoteOrderQty?: number; quantity?: number; clientOrderId: string },
) {
  const credentials = await getStoredCredentials(supabase, userId)
  const params: Record<string, string> = {
    symbol: input.symbol,
    side: input.side,
    type: 'MARKET',
    newClientOrderId: input.clientOrderId,
  }
  if (input.quoteOrderQty !== undefined) params.quoteOrderQty = input.quoteOrderQty.toFixed(2)
  else if (input.quantity !== undefined) params.quantity = String(input.quantity)
  else throw new ApiError('Ordem sem valor (quoteOrderQty) ou quantidade.', 400)
  return binanceSignedRequest(credentials.apiKey, credentials.apiSecret, 'POST', '/v3/order', params, credentials.environment)
}

/** Consulta o estado de uma ordem Spot existente na Binance. */
export async function getVerifiedBinanceOrder(
  supabase: Client,
  userId: string,
  input: { symbol: string; orderId: number },
) {
  const credentials = await getStoredCredentials(supabase, userId)
  return binanceSignedRequest(credentials.apiKey, credentials.apiSecret, 'GET', '/v3/order', {
    symbol: input.symbol,
    orderId: String(input.orderId),
  }, credentials.environment)
}

/** Consulta uma ordem Spot pelo clientOrderId. Somente leitura e usada para recuperar intents pendentes. */
export async function getVerifiedBinanceOrderByClientOrderId(
  supabase: Client,
  userId: string,
  input: { symbol: string; clientOrderId: string },
) {
  const credentials = await getStoredCredentials(supabase, userId)
  return binanceSignedRequest(credentials.apiKey, credentials.apiSecret, 'GET', '/v3/order', {
    symbol: input.symbol,
    origClientOrderId: input.clientOrderId,
  }, credentials.environment)
}

/** Consulta os fills reais de uma ordem Spot já existente. Somente leitura. */
export async function getVerifiedBinanceTrades(
  supabase: Client,
  userId: string,
  input: { symbol: string; orderId: number },
) {
  const credentials = await getStoredCredentials(supabase, userId)
  return binanceSignedRequest(credentials.apiKey, credentials.apiSecret, 'GET', '/v3/myTrades', {
    symbol: input.symbol,
    orderId: String(input.orderId),
  }, credentials.environment)
}

export async function getVerifiedBinanceAccount(
  supabase: Client,
  userId: string,
): Promise<VerifiedBinanceAccount> {
  const credentials = await getStoredCredentials(supabase, userId)
  const account = (await binanceSigned(credentials.apiKey, credentials.apiSecret, '/v3/account', credentials.environment)) as {
    canTrade?: boolean
    balances?: Array<{ asset: string; free: string; locked: string }>
  }
  return {
    canTrade: account.canTrade === true,
    balances: (account.balances ?? []).map((item) => ({
      asset: item.asset,
      free: Number(item.free),
      locked: Number(item.locked),
    })),
  }
}

/** Salva (ou substitui) as chaves e verifica imediatamente contra a exchange. */
export async function saveExchangeCredentials(
  supabase: Client,
  userId: string,
  input: { exchange?: string; apiKey?: string; apiSecret?: string },
): Promise<VerifyResult> {
  const apiKey = (input.apiKey ?? '').trim()
  const apiSecret = (input.apiSecret ?? '').trim()
  const exchange = (input.exchange ?? 'binance').trim().toLowerCase()
  if (apiKey.length < 16 || apiSecret.length < 16) {
    throw new ApiError('Informe uma API key e secret válidas.', 400)
  }
  if (exchange !== 'binance') throw new ApiError('Somente Binance é suportada no momento.', 400)

  let check: { canTrade: boolean; balances: { asset: string; free: number }[] }
  const targetEnv = getBinanceEnvironment()
  try {
    check = await verify(apiKey, apiSecret, targetEnv)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha ao validar credenciais'
    const code = err instanceof ApiError ? err.code : undefined
    // -2015/-2014: chave não reconhecida neste ambiente. Diagnostica (sem salvar)
    // se a chave pertence a outro ambiente Binance, para orientar o usuário.
    if (code === -2015 || code === -2014 || code === -1022) {
      throw new ApiError(await diagnoseKeyEnvironment(apiKey, apiSecret, targetEnv), 400)
    }
    throw new ApiError(message, 400)
  }

  const { error } = await getSupabaseAdmin().from('exchange_credentials').upsert(
    {
      user_id: userId,
      environment: getBinanceEnvironment(),
      exchange,
      api_key_cipher: await encryptSecret(apiKey),
      api_secret_cipher: await encryptSecret(apiSecret),
      key_preview: `${apiKey.slice(0, 4)}••••${apiKey.slice(-4)}`,
      verified: true,
      verified_at: new Date().toISOString(),
      last_error: null,
    },
    { onConflict: 'user_id,environment' },
  )
  if (error) throw new ApiError(error.message, 500)

  await supabase.from('bot4x_configs').update({ api_key_set: true, exchange }).eq('user_id', userId)

  return { ...(await getExchangeStatus(supabase, userId)), ...check }
}

/** Revalida as chaves já salvas (usado antes de destravar o modo REAL). */
export async function testExchangeCredentials(
  supabase: Client,
  userId: string,
): Promise<VerifyResult> {
  const { data, error } = await getSupabaseAdmin()
    .from('exchange_credentials')
    .select('api_key_cipher, api_secret_cipher')
    .eq('user_id', userId)
    .eq('environment', getBinanceEnvironment())
    .maybeSingle()
  if (error) throw new ApiError(error.message, 500)
  if (!data) throw new ApiError('Nenhuma credencial salva.', 404)

  const apiKey = await decryptSecret(data.api_key_cipher)
  const apiSecret = await decryptSecret(data.api_secret_cipher)

  try {
    const check = await verify(apiKey, apiSecret, getBinanceEnvironment())
    await supabase
      .from('exchange_credentials')
      .update({ verified: true, verified_at: new Date().toISOString(), last_error: null })
      .eq('user_id', userId)
      .eq('environment', getBinanceEnvironment())
    return { ...(await getExchangeStatus(supabase, userId)), ...check }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha na verificação'
    await supabase
      .from('exchange_credentials')
      .update({ verified: false, last_error: message })
      .eq('user_id', userId)
      .eq('environment', getBinanceEnvironment())
    throw new ApiError(message, 400)
  }
}

export async function deleteExchangeCredentials(supabase: Client, userId: string) {
  const { error } = await getSupabaseAdmin().from('exchange_credentials').delete().eq('user_id', userId).eq('environment', getBinanceEnvironment())
  if (error) throw new ApiError(error.message, 500)
  await supabase.from('bot4x_configs').update({ api_key_set: false }).eq('user_id', userId)
  return EMPTY
}
