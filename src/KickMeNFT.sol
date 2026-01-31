// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./IERC5192.sol";
import {KickMeDoodleRenderer} from "./KickMeDoodleRenderer.sol";

/// @title Kick Me NFT - A Soulbound "Kick Me" Sign
/// @notice A non-transferable NFT that anyone can stick on any wallet. Once stuck, it's there forever.
/// @dev Implements ERC-721 + ERC-5192 (Soulbound). Cannot be transferred or burned.
contract KickMeNFT is ERC721, IERC5192, Ownable {
    using Strings for uint256;
    using Strings for address;

    // ============ Events ============

    /// @notice Emitted when a sign is stuck on a victim
    event Stuck(address indexed victim, address indexed sticker);

    /// @notice Emitted when someone kicks a victim
    event Kicked(address indexed victim, address indexed kicker, uint256 totalKicks);

    // ============ State Variables ============

    /// @notice Price to mint (0 by default, can be set for charity donations)
    uint256 public mintPrice;

    /// @notice Address where donations are sent
    address public charityAddress;

    /// @notice Counter for token IDs (starts at 1, 0 means no token)
    uint256 private _nextTokenId = 1;

    /// @notice Maps victim address to their token ID (0 = no sign)
    mapping(address => uint256) public tokenOfVictim;

    /// @notice Maps victim address to list of addresses who stuck signs on them
    mapping(address => address[]) private _stickers;

    /// @notice Maps victim address to list of addresses who kicked them
    mapping(address => address[]) private _kickers;

    /// @notice Maps victim address to total kick count
    mapping(address => uint256) public kickCount;

    /// @notice Maps victim address to timestamp when first signed
    mapping(address => uint256) public signedAt;

    /// @notice Maps token ID to victim address (reverse lookup)
    mapping(uint256 => address) public victimOfToken;

    /// @notice Maps victim address to their sign's visual seed (chosen by first sticker)
    mapping(address => uint256) public signSeed;

    // ============ Constructor ============

    constructor() ERC721("Kick Me", "KICKME") Ownable(msg.sender) {}

    // ============ Core Functions ============

    /// @notice Stick a "Kick Me" sign on someone's back
    /// @param victim The address to stick the sign on
    /// @param seed The visual seed for the sign (only used when minting new sign)
    /// @dev If victim has no sign, mints one with the provided seed. Otherwise just adds caller to stickers list.
    function stick(address victim, uint256 seed) external payable {
        require(victim != address(0), "Cannot stick sign on zero address");
        require(msg.value >= mintPrice, "Insufficient payment");

        if (tokenOfVictim[victim] == 0) {
            // First time - mint the sign with chosen seed
            uint256 tokenId = _nextTokenId++;
            tokenOfVictim[victim] = tokenId;
            victimOfToken[tokenId] = victim;
            signedAt[victim] = block.timestamp;
            signSeed[victim] = seed;

            _safeMint(victim, tokenId);

            // Emit ERC-5192 Locked event
            emit Locked(tokenId);
        }

        // Add sticker to the list (even if they've stuck before - let them pile on!)
        _stickers[victim].push(msg.sender);

        emit Stuck(victim, msg.sender);
    }

    /// @notice Kick someone who has a sign on their back
    /// @param victim The address to kick
    function kick(address victim) external {
        require(tokenOfVictim[victim] != 0, "Victim has no sign to kick");

        _kickers[victim].push(msg.sender);
        kickCount[victim]++;

        emit Kicked(victim, msg.sender, kickCount[victim]);
    }

    // ============ View Functions ============

    /// @notice Check if an address has a Kick Me sign
    /// @param victim The address to check
    /// @return True if the address has a sign
    function hasSign(address victim) external view returns (bool) {
        return tokenOfVictim[victim] != 0;
    }

    /// @notice Get all addresses who stuck signs on a victim
    /// @param victim The victim address
    /// @return Array of sticker addresses
    function getStickers(address victim) external view returns (address[] memory) {
        return _stickers[victim];
    }

    /// @notice Get the number of people who stuck signs on a victim
    /// @param victim The victim address
    /// @return Number of stickers
    function getStickerCount(address victim) external view returns (uint256) {
        return _stickers[victim].length;
    }

    /// @notice Get all addresses who kicked a victim
    /// @param victim The victim address
    /// @return Array of kicker addresses
    function getKickers(address victim) external view returns (address[] memory) {
        return _kickers[victim];
    }

    // ============ ERC-5192 Soulbound Implementation ============

    /// @notice Returns the locking status of a token (always locked)
    /// @param tokenId The token ID to check
    /// @return Always returns true since all tokens are soulbound
    function locked(uint256 tokenId) external view override returns (bool) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return true;
    }

    /// @notice ERC-165 interface support
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IERC5192).interfaceId || super.supportsInterface(interfaceId);
    }

    // ============ Transfer Blocking (Soulbound) ============

    /// @dev Override to block all transfers except minting
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);

        // Allow minting (from == address(0)), block everything else
        if (from != address(0)) {
            revert("Soulbound: transfers are disabled");
        }

        return super._update(to, tokenId, auth);
    }

    /// @dev Block approvals since transfers are disabled
    function approve(address, uint256) public virtual override {
        revert("Soulbound: approvals are disabled");
    }

    /// @dev Block approval for all since transfers are disabled
    function setApprovalForAll(address, bool) public virtual override {
        revert("Soulbound: approvals are disabled");
    }

    // ============ Metadata (On-Chain SVG) ============

    /// @notice Returns the token URI with on-chain SVG
    /// @param tokenId The token ID
    /// @return Base64-encoded JSON metadata with SVG image
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");

        address victim = victimOfToken[tokenId];
        uint256 stickers = _stickers[victim].length;
        uint256 kicks = kickCount[victim];
        uint256 timestamp = signedAt[victim];

        // Use the seed chosen by the first sticker (permanent visual identity)
        bytes32 salt = keccak256(abi.encodePacked(signSeed[victim]));

        string memory json = _buildMetadataJSON(tokenId, stickers, kicks, timestamp, salt);
        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    function _buildMetadataJSON(
        uint256 tokenId,
        uint256 stickers,
        uint256 kicks,
        uint256 timestamp,
        bytes32 salt
    ) internal pure returns (string memory) {
        string memory svg = KickMeDoodleRenderer.renderSVG(tokenId, salt);
        string memory imageData = Base64.encode(bytes(svg));

        string memory part1 = _buildJSONPart1(tokenId, stickers, kicks);
        string memory part2 = _buildJSONPart2(imageData, stickers, kicks, timestamp);

        return Base64.encode(bytes(string(abi.encodePacked(part1, part2))));
    }

    function _buildJSONPart1(uint256 tokenId, uint256 stickers, uint256 kicks) internal pure returns (string memory) {
        return string(abi.encodePacked(
            '{"name":"Kick Me Sign #',
            tokenId.toString(),
            '","description":"A soulbound Kick Me sign stuck on this wallet forever. ',
            stickers.toString(),
            " people stuck it, ",
            kicks.toString(),
            ' kicks received.",'
        ));
    }

    function _buildJSONPart2(
        string memory imageData,
        uint256 stickers,
        uint256 kicks,
        uint256 timestamp
    ) internal pure returns (string memory) {
        string memory imgPart = string(abi.encodePacked(
            '"image":"data:image/svg+xml;base64,',
            imageData,
            '",'
        ));
        string memory attrPart = _buildAttributes(stickers, kicks, timestamp);
        return string(abi.encodePacked(imgPart, attrPart));
    }

    function _buildAttributes(uint256 stickers, uint256 kicks, uint256 timestamp) internal pure returns (string memory) {
        return string(abi.encodePacked(
            '"attributes":[{"trait_type":"Stickers","value":',
            stickers.toString(),
            '},{"trait_type":"Kicks","value":',
            kicks.toString(),
            '},{"trait_type":"Signed At","display_type":"date","value":',
            timestamp.toString(),
            "}]}"
        ));
    }

    // ============ Admin Functions ============

    /// @notice Set the mint price (for charity donations)
    /// @param _price New price in wei
    function setMintPrice(uint256 _price) external onlyOwner {
        mintPrice = _price;
    }

    /// @notice Set the charity address for donations
    /// @param _charity Address to receive donations
    function setCharityAddress(address _charity) external onlyOwner {
        require(_charity != address(0), "Invalid charity address");
        charityAddress = _charity;
    }

    /// @notice Withdraw collected funds to charity
    function withdraw() external onlyOwner {
        require(charityAddress != address(0), "Charity address not set");
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");

        (bool success,) = charityAddress.call{value: balance}("");
        require(success, "Withdrawal failed");
    }
}
