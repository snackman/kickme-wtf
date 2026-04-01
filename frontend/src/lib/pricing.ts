import { parseEther } from 'viem'
import { STICK_PRICE_MIN, KICK_PRICE_MIN } from './contract'

// Target USD prices
export const STICK_USD = 4.20
export const KICK_USD = 0.69

/**
 * Convert a USD amount to wei at the given ETH/USD rate.
 * Rounds up to avoid underpaying the contract.
 */
export function usdToWei(usdAmount: number, ethUsdPrice: number): bigint {
  const ethAmount = usdAmount / ethUsdPrice
  // Round up to 6 decimal places
  const rounded = Math.ceil(ethAmount * 1e6) / 1e6
  return parseEther(rounded.toFixed(6))
}

/**
 * Effective stick price: max of (USD-pegged amount, on-chain minimum).
 * Falls back to on-chain minimum if ethPrice is unavailable.
 */
export function getStickPrice(ethUsdPrice: number | null): bigint {
  if (ethUsdPrice === null || ethUsdPrice <= 0) return STICK_PRICE_MIN
  const usdBased = usdToWei(STICK_USD, ethUsdPrice)
  return usdBased > STICK_PRICE_MIN ? usdBased : STICK_PRICE_MIN
}

/**
 * Effective kick price: max of (USD-pegged amount, on-chain minimum).
 */
export function getKickPrice(ethUsdPrice: number | null): bigint {
  if (ethUsdPrice === null || ethUsdPrice <= 0) return KICK_PRICE_MIN
  const usdBased = usdToWei(KICK_USD, ethUsdPrice)
  return usdBased > KICK_PRICE_MIN ? usdBased : KICK_PRICE_MIN
}
