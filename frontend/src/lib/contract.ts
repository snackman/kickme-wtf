export const KICKME_ADDRESS = '0xC8Dc7ABfB29C01Ae4ad681CB025cb0bE60848ac3' as const
export const KICKME_DEPLOY_BLOCK = 39643901n // Block where the contract was deployed

// Prices in wei
export const STICK_PRICE = 4200000000000000n // 0.0042 ETH
export const KICK_PRICE = 690000000000000n   // 0.00069 ETH

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
    name: 'getTokenIds',
    inputs: [{ name: 'victim', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getSignCount',
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
    name: 'firstSignedAt',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'stickerOfToken',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'seedOfToken',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'stuckAt',
    inputs: [{ name: '', type: 'uint256' }],
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
      { name: 'tokenId', type: 'uint256', indexed: false },
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
