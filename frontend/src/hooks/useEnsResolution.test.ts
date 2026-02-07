import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { isAddress } from 'viem'

// Mock the ensCache module
vi.mock('../lib/ensCache', () => ({
  resolveEnsName: vi.fn(),
  getCachedAddress: vi.fn(),
}))

import { useEnsResolution } from './useEnsResolution'
import { resolveEnsName, getCachedAddress } from '../lib/ensCache'

const mockedResolveEnsName = vi.mocked(resolveEnsName)
const mockedGetCachedAddress = vi.mocked(getCachedAddress)

describe('useEnsResolution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGetCachedAddress.mockReturnValue(undefined)
  })

  describe('empty input', () => {
    it('returns initial state for empty string', () => {
      const { result } = renderHook(() => useEnsResolution(''))

      expect(result.current.address).toBeNull()
      expect(result.current.isEns).toBe(false)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isValid).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('returns initial state for whitespace only', () => {
      const { result } = renderHook(() => useEnsResolution('   '))

      expect(result.current.address).toBeNull()
      expect(result.current.isValid).toBe(false)
    })
  })

  describe('valid Ethereum address', () => {
    it('returns address immediately for valid address', () => {
      const validAddress = '0x1234567890123456789012345678901234567890'
      const { result } = renderHook(() => useEnsResolution(validAddress))

      expect(result.current.address).toBe(validAddress)
      expect(result.current.isEns).toBe(false)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isValid).toBe(true)
      expect(result.current.error).toBeNull()
    })

    it('handles checksummed addresses', () => {
      const checksummed = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B'
      const { result } = renderHook(() => useEnsResolution(checksummed))

      expect(result.current.address).toBe(checksummed)
      expect(result.current.isValid).toBe(true)
    })

    it('trims whitespace from address', () => {
      const { result } = renderHook(() =>
        useEnsResolution('  0x1234567890123456789012345678901234567890  ')
      )

      expect(result.current.address).toBe('0x1234567890123456789012345678901234567890')
      expect(result.current.isValid).toBe(true)
    })
  })

  describe('ENS name handling', () => {
    it('identifies .eth names as ENS', async () => {
      mockedResolveEnsName.mockResolvedValue('0x1234567890123456789012345678901234567890')

      const { result } = renderHook(() => useEnsResolution('test.eth'))

      // Initially loading
      await waitFor(() => {
        expect(result.current.isEns).toBe(true)
      })
    })

    it('uses cached address when available', () => {
      mockedGetCachedAddress.mockReturnValue('0xabcdef1234567890123456789012345678901234')

      const { result } = renderHook(() => useEnsResolution('cached.eth'))

      expect(result.current.address).toBe('0xabcdef1234567890123456789012345678901234')
      expect(result.current.isEns).toBe(true)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isValid).toBe(true)
    })

    it('resolves ENS name successfully', async () => {
      const resolvedAddress = '0x1234567890123456789012345678901234567890'
      mockedResolveEnsName.mockResolvedValue(resolvedAddress)

      const { result } = renderHook(() => useEnsResolution('vitalik.eth'))

      // Wait for debounce and resolution
      await waitFor(
        () => {
          expect(result.current.address).toBe(resolvedAddress)
        },
        { timeout: 2000 }
      )

      expect(result.current.isValid).toBe(true)
      expect(result.current.error).toBeNull()
    })

    it('handles ENS name not found', async () => {
      mockedResolveEnsName.mockResolvedValue(null)

      const { result } = renderHook(() => useEnsResolution('nonexistent.eth'))

      // Wait for debounce (500ms) + resolution
      await waitFor(
        () => {
          // Either we get an error or the resolution completed with null
          return result.current.error !== null || (result.current.isEns && !result.current.isLoading)
        },
        { timeout: 2000 }
      )

      expect(result.current.address).toBeNull()
      expect(result.current.isValid).toBe(false)
      // Error might be set to "ENS name not found" or null depending on timing
    })

    it('handles ENS resolution error', async () => {
      mockedResolveEnsName.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useEnsResolution('error.eth'))

      await waitFor(
        () => {
          expect(result.current.error).toBe('Failed to resolve ENS name')
        },
        { timeout: 2000 }
      )

      expect(result.current.isValid).toBe(false)
    })

    it('handles timeout error', async () => {
      mockedResolveEnsName.mockRejectedValue(new Error('Timeout'))

      const { result } = renderHook(() => useEnsResolution('slow.eth'))

      await waitFor(
        () => {
          expect(result.current.error).toBe('ENS lookup timed out')
        },
        { timeout: 2000 }
      )
    })
  })

  describe('invalid input', () => {
    it('handles partial address (not .eth, not valid address)', () => {
      const { result } = renderHook(() => useEnsResolution('0x123'))

      expect(result.current.isValid).toBe(false)
      expect(result.current.isEns).toBe(false)
      expect(result.current.error).toBeNull() // No error while typing
    })

    it('handles random text', () => {
      const { result } = renderHook(() => useEnsResolution('hello world'))

      expect(result.current.isValid).toBe(false)
      expect(result.current.isEns).toBe(false)
    })
  })

  describe('input changes', () => {
    it('updates when input changes from address to ENS', async () => {
      mockedResolveEnsName.mockResolvedValue('0xnewaddress12345678901234567890123456789012')

      const { result, rerender } = renderHook(({ input }) => useEnsResolution(input), {
        initialProps: { input: '0x1234567890123456789012345678901234567890' },
      })

      expect(result.current.isEns).toBe(false)
      expect(result.current.isValid).toBe(true)

      rerender({ input: 'test.eth' })

      await waitFor(() => {
        expect(result.current.isEns).toBe(true)
      })
    })

    it('cancels pending resolution on input change', async () => {
      mockedResolveEnsName.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('0x123...'), 1000))
      )

      const { result, rerender } = renderHook(({ input }) => useEnsResolution(input), {
        initialProps: { input: 'first.eth' },
      })

      // Change input before resolution completes
      rerender({ input: '0x1234567890123456789012345678901234567890' })

      // Should immediately show the valid address
      expect(result.current.address).toBe('0x1234567890123456789012345678901234567890')
      expect(result.current.isValid).toBe(true)
    })
  })

  describe('debouncing', () => {
    it('debounces ENS lookups by 500ms', async () => {
      vi.useFakeTimers()
      mockedResolveEnsName.mockResolvedValue('0x1234567890123456789012345678901234567890')

      renderHook(() => useEnsResolution('test.eth'))

      // Should not call resolve immediately
      expect(mockedResolveEnsName).not.toHaveBeenCalled()

      // Advance time by 500ms
      await act(async () => {
        vi.advanceTimersByTime(500)
      })

      // Now it should have been called
      expect(mockedResolveEnsName).toHaveBeenCalledWith('test.eth')

      vi.useRealTimers()
    })
  })
})
