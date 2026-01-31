import { useAccount, useConnect, useDisconnect } from 'wagmi'

export function ConnectButton() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        style={{
          padding: '10px 20px',
          fontSize: '14px',
          background: '#2a2a4e',
          border: '1px solid #444',
          borderRadius: '8px',
          color: '#fff',
          cursor: 'pointer',
        }}
      >
        {address.slice(0, 6)}...{address.slice(-4)}
      </button>
    )
  }

  return (
    <button
      onClick={() => connect({ connector: connectors[0] })}
      style={{
        padding: '10px 20px',
        fontSize: '14px',
        background: '#ffeb3b',
        border: 'none',
        borderRadius: '8px',
        color: '#000',
        cursor: 'pointer',
        fontWeight: 'bold',
      }}
    >
      Connect Wallet
    </button>
  )
}
