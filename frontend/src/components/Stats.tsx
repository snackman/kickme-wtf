type Props = {
  stickerCount: bigint | undefined
  kickCount: bigint | undefined
  signedAt: bigint | undefined
}

export function Stats({ stickerCount, kickCount, signedAt }: Props) {
  const formatDate = (timestamp: bigint | undefined) => {
    if (!timestamp) return '---'
    return new Date(Number(timestamp) * 1000).toLocaleDateString()
  }

  return (
    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
      <StatBox
        icon="👥"
        value={stickerCount?.toString() ?? '0'}
        label="Signs"
      />
      <StatBox
        icon="🦵"
        value={kickCount?.toString() ?? '0'}
        label="Kicks"
      />
      <StatBox
        icon="📅"
        value={formatDate(signedAt)}
        label="First Stuck"
      />
    </div>
  )
}

function StatBox({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div
      style={{
        background: '#2a2a4e',
        borderRadius: '12px',
        padding: '20px 30px',
        textAlign: 'center',
        minWidth: '120px',
      }}
    >
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ffeb3b' }}>{value}</div>
      <div style={{ fontSize: '14px', color: '#888', marginTop: '4px' }}>{label}</div>
    </div>
  )
}
