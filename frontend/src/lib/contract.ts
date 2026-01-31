export const KICKME_ADDRESS = '0x2000DF70bb743e9A15998cb5D48ceBeDaCdbD22c' as const

export const KICKME_ABI = [
  {
    type: 'function',
    name: 'stick',
    inputs: [
      { name: 'victim', type: 'address' },
      { name: 'seed', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'kick',
    inputs: [{ name: 'victim', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'hasSign',
    inputs: [{ name: 'victim', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'tokenOfVictim',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getStickerCount',
    inputs: [{ name: 'victim', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'kickCount',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'signedAt',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'signSeed',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'tokenURI',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getStickers',
    inputs: [{ name: 'victim', type: 'address' }],
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getKickers',
    inputs: [{ name: 'victim', type: 'address' }],
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'mintPrice',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'Stuck',
    inputs: [
      { name: 'victim', type: 'address', indexed: true },
      { name: 'sticker', type: 'address', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'Kicked',
    inputs: [
      { name: 'victim', type: 'address', indexed: true },
      { name: 'kicker', type: 'address', indexed: true },
      { name: 'totalKicks', type: 'uint256', indexed: false },
    ],
  },
] as const
