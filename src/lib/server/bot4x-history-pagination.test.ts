import { describe, expect, it } from 'vitest'
import { verifiedHistoryPageOffsets } from './bot4x.server'

describe('verifiedHistoryPageOffsets', () => {
  it('covers the full public history limit in pages of at most 100', () => {
    expect(verifiedHistoryPageOffsets(500)).toEqual([0, 100, 200, 300, 400])
  })

  it('clamps unsafe limits and page sizes', () => {
    expect(verifiedHistoryPageOffsets(9999, 999)).toEqual([0, 100, 200, 300, 400])
    expect(verifiedHistoryPageOffsets(0)).toEqual([0])
  })

  it('does not create a page beyond the requested limit', () => {
    expect(verifiedHistoryPageOffsets(201)).toEqual([0, 100, 200])
    expect(verifiedHistoryPageOffsets(99)).toEqual([0])
  })
})
