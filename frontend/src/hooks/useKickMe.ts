import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { KICKME_ADDRESS, KICKME_ABI, STICK_PRICE, KICK_PRICE } from '../lib/contract'
import type { Address } from 'viem'

export function useHasSign(address: Address | undefined) {
  return useReadContract({
    address: KICKME_ADDRESS,
    abi: KICKME_ABI,
    functionName: 'hasSign',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
}

export function useVictimStats(address: Address | undefined) {
  const hasSign = useReadContract({
    address: KICKME_ADDRESS,
    abi: KICKME_ABI,
    functionName: 'hasSign',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const tokenIds = useReadContract({
    address: KICKME_ADDRESS,
    abi: KICKME_ABI,
    functionName: 'getTokenIds',
    args: address ? [address] : undefined,
    query: { enabled: !!address && hasSign.data === true },
  })

  const signCount = useReadContract({
    address: KICKME_ADDRESS,
    abi: KICKME_ABI,
    functionName: 'getSignCount',
    args: address ? [address] : undefined,
    query: { enabled: !!address && hasSign.data === true },
  })

  const kickCount = useReadContract({
    address: KICKME_ADDRESS,
    abi: KICKME_ABI,
    functionName: 'kickCount',
    args: address ? [address] : undefined,
    query: { enabled: !!address && hasSign.data === true },
  })

  const firstSignedAt = useReadContract({
    address: KICKME_ADDRESS,
    abi: KICKME_ABI,
    functionName: 'firstSignedAt',
    args: address ? [address] : undefined,
    query: { enabled: !!address && hasSign.data === true },
  })

  return {
    hasSign: hasSign.data,
    tokenIds: tokenIds.data as readonly bigint[] | undefined,
    signCount: signCount.data,
    kickCount: kickCount.data,
    firstSignedAt: firstSignedAt.data,
    isLoading: hasSign.isLoading,
    refetch: () => {
      hasSign.refetch()
      tokenIds.refetch()
      signCount.refetch()
      kickCount.refetch()
      firstSignedAt.refetch()
    },
  }
}

export function useTokenURI(tokenId: bigint | undefined) {
  return useReadContract({
    address: KICKME_ADDRESS,
    abi: KICKME_ABI,
    functionName: 'tokenURI',
    args: tokenId ? [tokenId] : undefined,
    query: { enabled: !!tokenId && tokenId > 0n },
  })
}

export function useStick() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { switchChainAsync } = useSwitchChain()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const stick = async (victim: Address, seed: bigint) => {
    try {
      await switchChainAsync({ chainId: baseSepolia.id })
    } catch (e) {
      console.log('Chain switch failed or rejected:', e)
    }
    writeContract({
      address: KICKME_ADDRESS,
      abi: KICKME_ABI,
      functionName: 'stick',
      args: [victim, seed],
      value: STICK_PRICE,
      chainId: baseSepolia.id,
    })
  }

  return { stick, hash, isPending, isConfirming, isSuccess, error }
}

export function useKick() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { switchChainAsync } = useSwitchChain()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const kick = async (victim: Address) => {
    try {
      await switchChainAsync({ chainId: baseSepolia.id })
    } catch (e) {
      console.log('Chain switch failed or rejected:', e)
    }
    writeContract({
      address: KICKME_ADDRESS,
      abi: KICKME_ABI,
      functionName: 'kick',
      args: [victim],
      value: KICK_PRICE,
      chainId: baseSepolia.id,
    })
  }

  return { kick, hash, isPending, isConfirming, isSuccess, error }
}
