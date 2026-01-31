# Kick Me NFT 🎯

A soulbound (non-transferable) NFT that anyone can stick on any wallet address. Once stuck, it's there forever - like a virtual "Kick Me" sign!

## Features

- **Soulbound**: Cannot be transferred or burned (ERC-5192)
- **Anyone can stick**: Call `stick(victim)` to put a sign on someone
- **One sign per wallet**: Each address can only have ONE sign
- **Multiple stickers**: Tracks everyone who helped stick the sign
- **Kick action**: Anyone can `kick(victim)` - tracks kickers and total count
- **On-chain SVG**: Dynamic image shows stats (stickers, kicks, date)
- **Optional charity**: Owner can set a mint price with proceeds going to charity

## Setup

### Prerequisites

1. Install Foundry: https://book.getfoundry.sh/getting-started/installation

### Install Dependencies

```bash
cd kick-me-nft
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge install foundry-rs/forge-std --no-commit
```

### Environment Setup

```bash
cp .env.example .env
# Edit .env with your values
```

## Usage

### Build

```bash
forge build
```

### Test

```bash
forge test
```

### Test with verbosity

```bash
forge test -vvv
```

### Deploy to Base Sepolia

```bash
source .env
forge script script/Deploy.s.sol:DeployScript --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify
```

### Deploy to Base Mainnet

```bash
source .env
forge script script/Deploy.s.sol:DeployScript --rpc-url $BASE_MAINNET_RPC_URL --broadcast --verify
```

## Contract Interface

### Core Functions

| Function | Description |
|----------|-------------|
| `stick(address victim)` | Stick a sign on someone (mints if first, adds to stickers list) |
| `kick(address victim)` | Kick someone who has a sign |

### View Functions

| Function | Description |
|----------|-------------|
| `hasSign(address)` | Check if address has a Kick Me sign |
| `getStickers(address)` | Get all addresses who stuck signs on victim |
| `getStickerCount(address)` | Get number of stickers |
| `getKickers(address)` | Get all addresses who kicked victim |
| `kickCount(address)` | Get total kicks received |
| `signedAt(address)` | Get timestamp when first signed |
| `locked(uint256)` | Always returns true (ERC-5192) |

### Admin Functions (Owner only)

| Function | Description |
|----------|-------------|
| `setMintPrice(uint256)` | Set price for sticking (0 by default) |
| `setCharityAddress(address)` | Set donation recipient |
| `withdraw()` | Send collected funds to charity |

## Game Mechanics

```
1. STICK THE SIGN
   └─ Anyone calls stick(victim)
   └─ If victim has no sign → mints NFT, records sticker
   └─ If victim already has sign → just adds caller to stickers list

2. KICK
   └─ Anyone calls kick(victim)
   └─ Victim must have a sign
   └─ Records kicker address + increments kick count
   └─ Emits event for leaderboards
```

## License

MIT
