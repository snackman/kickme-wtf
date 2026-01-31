import { useTokenURI } from '../hooks/useKickMe'

type Props = {
  tokenId: bigint | undefined
  size?: number
}

export function KickMeSign({ tokenId, size = 300 }: Props) {
  const { data: tokenURI, isLoading } = useTokenURI(tokenId)

  if (isLoading || !tokenURI) {
    return (
      <div
        style={{
          width: size,
          height: size * 1.25,
          background: '#2a2a4e',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#888',
        }}
      >
        {isLoading ? 'Loading...' : 'No sign yet'}
      </div>
    )
  }

  // Parse the data URI
  try {
    const json = JSON.parse(atob(tokenURI.split(',')[1]))
    const imageData = json.image

    return (
      <img
        src={imageData}
        alt="Kick Me Sign"
        style={{
          width: size,
          height: 'auto',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}
      />
    )
  } catch {
    return (
      <div
        style={{
          width: size,
          height: size * 1.25,
          background: '#2a2a4e',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#e74c3c',
        }}
      >
        Error loading sign
      </div>
    )
  }
}
