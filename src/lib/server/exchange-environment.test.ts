import { afterEach, describe, expect, it, vi } from 'vitest'
import { getBinanceBaseUrl, getBinanceEnvironment } from './exchange.server'

describe('DEMO Binance environment', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('routes DEMO/default configuration to Spot Testnet', () => {
    vi.stubEnv('BINANCE_TRADING_ENV', 'demo')
    expect(getBinanceEnvironment()).toBe('testnet')
    expect(getBinanceBaseUrl()).toBe('https://testnet.binance.vision/api')
  })

  it('defaults an unset environment to Spot Testnet', () => {
    vi.stubEnv('BINANCE_TRADING_ENV', '')
    expect(getBinanceEnvironment()).toBe('testnet')
    expect(getBinanceBaseUrl()).toBe('https://testnet.binance.vision/api')
  })

  it('preserves production only when explicitly configured', () => {
    vi.stubEnv('BINANCE_TRADING_ENV', 'production')
    expect(getBinanceEnvironment()).toBe('production')
    expect(getBinanceBaseUrl()).toBe('https://api.binance.com/api')
  })
})
