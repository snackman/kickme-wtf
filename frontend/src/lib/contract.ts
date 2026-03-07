export const KICKME_ADDRESS = '0x8faffd998D28DefFE5cB08eF5d0AC16831c926C8' as const
export const KICKME_DEPLOY_BLOCK = 38551439n // Block where the contract was deployed

// Prices in wei
export const STICK_PRICE = 420000000000000n // 0.00042 ETH
export const KICK_PRICE = 42000000000000n   // 0.000042 ETH

// Charity info
export const CHARITY_NAME = 'Stomp Out Bullying'
export const CHARITY_URL = 'https://www.stompoutbullying.org/'
export const CHARITY_ADDRESS = '0x2E9FbB542eb83D57235487cCCDAd57Ae2a487029'

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
    stateMutability: 'payable',
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
    name: 'stickPrice',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'kickPrice',
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
