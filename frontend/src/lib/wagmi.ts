import { http, createConfig } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

const alchemyKey = import.meta.env.VITE_ALCHEMY_KEY
const rpcUrl = alchemyKey
  ? `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`
  : 'https://ethereum-rpc.publicnode.com'

export { rpcUrl }

export const config = createConfig({
  chains: [mainnet],
  connectors: [injected()],
  transports: {
    [mainnet.id]: http(rpcUrl),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
