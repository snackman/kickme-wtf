// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/KickMeNFT.sol";

contract KickMeNFTTest is Test {
    KickMeNFT public nft;

    address public owner = address(1);
    address public alice = address(2);
    address public bob = address(3);
    address public charlie = address(4);
    address public victim = address(5);
    address public charity = address(6);

    event Stuck(address indexed victim, address indexed sticker, uint256 tokenId);
    event Kicked(address indexed victim, address indexed kicker, uint256 totalKicks);
    event Locked(uint256 tokenId);
    event StickPriceChanged(uint256 newPrice);
    event KickPriceChanged(uint256 newPrice);
    event CharityAddressChanged(address newCharity);

    function setUp() public {
        vm.prank(owner);
        nft = new KickMeNFT();
    }

    // ============ Stick Tests ============

    function test_StickFirstTime() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        vm.expectEmit(true, true, false, false);
        emit Locked(1);
        vm.expectEmit(true, true, false, true);
        emit Stuck(victim, alice, 1);
        nft.stick{value: 0.00042 ether}(victim, 12345);

        assertEq(nft.ownerOf(1), victim);
        assertEq(nft.balanceOf(victim), 1);
        assertTrue(nft.hasSign(victim));
        assertEq(nft.getSignCount(victim), 1);
        assertEq(nft.stickerOfToken(1), alice);
        assertEq(nft.seedOfToken(1), 12345);
    }

    function test_StickMultipleTimes() public {
        vm.deal(alice, 1 ether);
        vm.deal(bob, 1 ether);
        vm.deal(charlie, 1 ether);

        vm.prank(alice);
        nft.stick{value: 0.00042 ether}(victim, 11111);

        vm.prank(bob);
        vm.expectEmit(true, true, false, true);
        emit Stuck(victim, bob, 2);
        nft.stick{value: 0.00042 ether}(victim, 22222);

        vm.prank(charlie);
        nft.stick{value: 0.00042 ether}(victim, 33333);

        // Three tokens minted
        assertEq(nft.balanceOf(victim), 3);
        assertEq(nft.getSignCount(victim), 3);

        // Each token has its own sticker
        assertEq(nft.stickerOfToken(1), alice);
        assertEq(nft.stickerOfToken(2), bob);
        assertEq(nft.stickerOfToken(3), charlie);

        // Each token has its own seed
        assertEq(nft.seedOfToken(1), 11111);
        assertEq(nft.seedOfToken(2), 22222);
        assertEq(nft.seedOfToken(3), 33333);
    }

    function test_StickSamePersonMultipleTimes() public {
        vm.deal(alice, 1 ether);
        vm.startPrank(alice);
        nft.stick{value: 0.00042 ether}(victim, 11111);
        nft.stick{value: 0.00042 ether}(victim, 22222);
        nft.stick{value: 0.00042 ether}(victim, 33333);
        vm.stopPrank();

        // Same person can stick multiple times, each gets a new token
        assertEq(nft.getSignCount(victim), 3);
        assertEq(nft.balanceOf(victim), 3);
    }

    function test_StickOnYourself() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        nft.stick{value: 0.00042 ether}(alice, 12345);

        assertEq(nft.ownerOf(1), alice);
        assertTrue(nft.hasSign(alice));
        assertEq(nft.stickerOfToken(1), alice);
    }

    function test_StickOnZeroAddressReverts() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        vm.expectRevert("Cannot stick sign on zero address");
        nft.stick{value: 0.00042 ether}(address(0), 12345);
    }

    function test_StickWithPayment() public {
        // Default stickPrice is 0.00042 ether, charity is already set
        uint256 charityBalanceBefore = nft.charityAddress().balance;

        vm.deal(alice, 1 ether);
        vm.prank(alice);
        nft.stick{value: 0.00042 ether}(victim, 12345);

        // Funds go directly to charity, not contract
        assertEq(address(nft).balance, 0);
        assertEq(nft.charityAddress().balance, charityBalanceBefore + 0.00042 ether);
    }

    function test_StickInsufficientPaymentReverts() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        vm.expectRevert("Insufficient payment");
        nft.stick{value: 0.0001 ether}(victim, 12345);
    }

    // ============ Multi-Sign Specific Tests ============

    function test_EachSignHasOwnSeed() public {
        vm.deal(alice, 1 ether);
        vm.deal(bob, 1 ether);

        vm.prank(alice);
        nft.stick{value: 0.00042 ether}(victim, 11111);

        vm.prank(bob);
        nft.stick{value: 0.00042 ether}(victim, 22222);

        assertEq(nft.seedOfToken(1), 11111);
        assertEq(nft.seedOfToken(2), 22222);

        // Each token produces different tokenURI since they have different seeds
        string memory uri1 = nft.tokenURI(1);
        string memory uri2 = nft.tokenURI(2);
        assertTrue(keccak256(bytes(uri1)) != keccak256(bytes(uri2)));
    }

    function test_MultipleSignsShareKickCount() public {
        vm.deal(alice, 1 ether);
        vm.deal(bob, 1 ether);
        vm.deal(charlie, 1 ether);

        // Two signs on victim
        vm.prank(alice);
        nft.stick{value: 0.00042 ether}(victim, 11111);
        vm.prank(bob);
        nft.stick{value: 0.00042 ether}(victim, 22222);

        // One kick applies to the victim (shared across signs)
        vm.prank(charlie);
        nft.kick{value: 0.000042 ether}(victim);

        assertEq(nft.kickCount(victim), 1);
        // Kick count is per-victim, not per-token
        assertEq(nft.getSignCount(victim), 2);
    }

    function test_GetTokenIds() public {
        vm.deal(alice, 1 ether);
        vm.deal(bob, 1 ether);

        vm.prank(alice);
        nft.stick{value: 0.00042 ether}(victim, 11111);
        vm.prank(bob);
        nft.stick{value: 0.00042 ether}(victim, 22222);

        uint256[] memory tokenIds = nft.getTokenIds(victim);
        assertEq(tokenIds.length, 2);
        assertEq(tokenIds[0], 1);
        assertEq(tokenIds[1], 2);
    }

    function test_StickerOfToken() public {
        vm.deal(alice, 1 ether);
        vm.deal(bob, 1 ether);

        vm.prank(alice);
        nft.stick{value: 0.00042 ether}(victim, 11111);
        vm.prank(bob);
        nft.stick{value: 0.00042 ether}(victim, 22222);

        assertEq(nft.stickerOfToken(1), alice);
        assertEq(nft.stickerOfToken(2), bob);
    }

    function test_FirstSignedAtOnlySetOnce() public {
        uint256 timestamp1 = 1000000;
        uint256 timestamp2 = 2000000;

        vm.deal(alice, 1 ether);
        vm.deal(bob, 1 ether);

        vm.warp(timestamp1);
        vm.prank(alice);
        nft.stick{value: 0.00042 ether}(victim, 11111);

        vm.warp(timestamp2);
        vm.prank(bob);
        nft.stick{value: 0.00042 ether}(victim, 22222);

        // firstSignedAt should be the first sign's timestamp
        assertEq(nft.firstSignedAt(victim), timestamp1);

        // But each token has its own stuckAt
        assertEq(nft.stuckAt(1), timestamp1);
        assertEq(nft.stuckAt(2), timestamp2);
    }

    function test_GetSignCount() public {
        vm.deal(alice, 1 ether);

        assertEq(nft.getSignCount(victim), 0);

        vm.startPrank(alice);
        nft.stick{value: 0.00042 ether}(victim, 11111);
        assertEq(nft.getSignCount(victim), 1);

        nft.stick{value: 0.00042 ether}(victim, 22222);
        assertEq(nft.getSignCount(victim), 2);

        nft.stick{value: 0.00042 ether}(victim, 33333);
        assertEq(nft.getSignCount(victim), 3);
        vm.stopPrank();
    }

    // ============ Kick Tests ============

    function test_Kick() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        nft.stick{value: 0.00042 ether}(victim, 12345);

        vm.deal(bob, 1 ether);
        vm.prank(bob);
        vm.expectEmit(true, true, true, true);
        emit Kicked(victim, bob, 1);
        nft.kick{value: 0.000042 ether}(victim);

        assertEq(nft.kickCount(victim), 1);
    }

    function test_KickMultipleTimes() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        nft.stick{value: 0.00042 ether}(victim, 12345);

        vm.deal(bob, 1 ether);
        vm.deal(charlie, 1 ether);

        vm.prank(bob);
        nft.kick{value: 0.000042 ether}(victim);
        vm.prank(charlie);
        nft.kick{value: 0.000042 ether}(victim);
        vm.prank(bob);
        nft.kick{value: 0.000042 ether}(victim);

        assertEq(nft.kickCount(victim), 3);
    }

    function test_KickWithoutSignReverts() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        vm.expectRevert("Victim has no sign to kick");
        nft.kick{value: 0.000042 ether}(victim);
    }

    function test_KickInsufficientPaymentReverts() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        nft.stick{value: 0.00042 ether}(victim, 12345);

        vm.deal(bob, 1 ether);
        vm.prank(bob);
        vm.expectRevert("Insufficient payment");
        nft.kick{value: 0.00001 ether}(victim);
    }

    function test_SelfKick() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        nft.stick{value: 0.00042 ether}(victim, 12345);

        // Victim can kick themselves (sad!)
        vm.deal(victim, 1 ether);
        vm.prank(victim);
        nft.kick{value: 0.000042 ether}(victim);

        assertEq(nft.kickCount(victim), 1);
    }

    // ============ Soulbound Tests ============

    function test_TransferReverts() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        nft.stick{value: 0.00042 ether}(victim, 12345);

        vm.prank(victim);
        vm.expectRevert("Soulbound: transfers are disabled");
        nft.transferFrom(victim, alice, 1);
    }

    function test_SafeTransferReverts() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        nft.stick{value: 0.00042 ether}(victim, 12345);

        vm.prank(victim);
        vm.expectRevert("Soulbound: transfers are disabled");
        nft.safeTransferFrom(victim, alice, 1);
    }

    function test_ApproveReverts() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        nft.stick{value: 0.00042 ether}(victim, 12345);

        vm.prank(victim);
        vm.expectRevert("Soulbound: approvals are disabled");
        nft.approve(alice, 1);
    }

    function test_SetApprovalForAllReverts() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        nft.stick{value: 0.00042 ether}(victim, 12345);

        vm.prank(victim);
        vm.expectRevert("Soulbound: approvals are disabled");
        nft.setApprovalForAll(alice, true);
    }

    function test_Locked() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        nft.stick{value: 0.00042 ether}(victim, 12345);

        assertTrue(nft.locked(1));
    }

    function test_LockedNonexistentTokenReverts() public {
        vm.expectRevert("Token does not exist");
        nft.locked(999);
    }

    // ============ Interface Support Tests ============

    function test_SupportsERC721() public view {
        assertTrue(nft.supportsInterface(0x80ac58cd)); // ERC721
    }

    function test_SupportsERC721Metadata() public view {
        assertTrue(nft.supportsInterface(0x5b5e139f)); // ERC721Metadata
    }

    function test_SupportsERC5192() public view {
        assertTrue(nft.supportsInterface(type(IERC5192).interfaceId));
    }

    function test_SupportsERC165() public view {
        assertTrue(nft.supportsInterface(0x01ffc9a7)); // ERC165
    }

    // ============ Metadata Tests ============

    function test_TokenURI() public {
        vm.deal(alice, 1 ether);
        vm.deal(bob, 1 ether);

        vm.prank(alice);
        nft.stick{value: 0.00042 ether}(victim, 12345);

        vm.prank(bob);
        nft.kick{value: 0.000042 ether}(victim);

        string memory uri = nft.tokenURI(1);

        // Should start with base64 data URI
        assertTrue(bytes(uri).length > 0);
        assertTrue(_startsWith(uri, "data:application/json;base64,"));
    }

    function test_TokenURINonexistentReverts() public {
        vm.expectRevert("Token does not exist");
        nft.tokenURI(999);
    }

    function test_Name() public view {
        assertEq(nft.name(), "Kick Me");
    }

    function test_Symbol() public view {
        assertEq(nft.symbol(), "KICKME");
    }

    // ============ Admin Tests ============

    function test_SetStickPrice() public {
        vm.prank(owner);
        vm.expectEmit(false, false, false, true);
        emit StickPriceChanged(0.1 ether);
        nft.setStickPrice(0.1 ether);

        assertEq(nft.stickPrice(), 0.1 ether);
    }

    function test_SetStickPriceNonOwnerReverts() public {
        vm.prank(alice);
        vm.expectRevert();
        nft.setStickPrice(0.1 ether);
    }

    function test_SetKickPrice() public {
        vm.prank(owner);
        vm.expectEmit(false, false, false, true);
        emit KickPriceChanged(0.01 ether);
        nft.setKickPrice(0.01 ether);

        assertEq(nft.kickPrice(), 0.01 ether);
    }

    function test_SetKickPriceNonOwnerReverts() public {
        vm.prank(alice);
        vm.expectRevert();
        nft.setKickPrice(0.01 ether);
    }

    function test_DefaultPrices() public view {
        assertEq(nft.stickPrice(), 0.00042 ether);
        assertEq(nft.kickPrice(), 0.000042 ether);
    }

    function test_DefaultCharityAddress() public view {
        assertEq(nft.charityAddress(), 0x2E9FbB542eb83D57235487cCCDAd57Ae2a487029);
    }

    function test_SetCharityAddress() public {
        vm.prank(owner);
        vm.expectEmit(false, false, false, true);
        emit CharityAddressChanged(charity);
        nft.setCharityAddress(charity);

        assertEq(nft.charityAddress(), charity);
    }

    function test_SetCharityAddressZeroReverts() public {
        vm.prank(owner);
        vm.expectRevert("Invalid charity address");
        nft.setCharityAddress(address(0));
    }

    function test_SetCharityAddressNonOwnerReverts() public {
        vm.prank(alice);
        vm.expectRevert();
        nft.setCharityAddress(charity);
    }

    function test_Withdraw() public {
        // Funds normally go direct to charity, but if stuck in contract, withdraw works
        vm.deal(address(nft), 1 ether);

        uint256 charityBalanceBefore = nft.charityAddress().balance;

        vm.prank(owner);
        nft.withdraw();

        assertEq(nft.charityAddress().balance, charityBalanceBefore + 1 ether);
        assertEq(address(nft).balance, 0);
    }

    function test_WithdrawNoFundsReverts() public {
        vm.prank(owner);
        vm.expectRevert("No funds to withdraw");
        nft.withdraw();
    }

    function test_WithdrawNonOwnerReverts() public {
        vm.deal(address(nft), 1 ether);

        vm.prank(alice);
        vm.expectRevert();
        nft.withdraw();
    }

    // ============ View Function Tests ============

    function test_HasSignFalse() public view {
        assertFalse(nft.hasSign(victim));
    }

    function test_VictimOfToken() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        nft.stick{value: 0.00042 ether}(victim, 12345);

        assertEq(nft.victimOfToken(1), victim);
    }

    function test_StuckAt() public {
        uint256 timestamp = 1234567890;
        vm.warp(timestamp);

        vm.deal(alice, 1 ether);
        vm.prank(alice);
        nft.stick{value: 0.00042 ether}(victim, 12345);

        assertEq(nft.stuckAt(1), timestamp);
    }

    function test_FirstSignedAt() public {
        uint256 timestamp = 1234567890;
        vm.warp(timestamp);

        vm.deal(alice, 1 ether);
        vm.prank(alice);
        nft.stick{value: 0.00042 ether}(victim, 12345);

        assertEq(nft.firstSignedAt(victim), timestamp);
    }

    // ============ Multiple Victims Tests ============

    function test_MultipleVictims() public {
        vm.deal(alice, 1 ether);

        vm.prank(alice);
        nft.stick{value: 0.00042 ether}(bob, 12345);

        vm.prank(alice);
        nft.stick{value: 0.00042 ether}(charlie, 54321);

        uint256[] memory bobTokens = nft.getTokenIds(bob);
        uint256[] memory charlieTokens = nft.getTokenIds(charlie);

        assertEq(bobTokens.length, 1);
        assertEq(charlieTokens.length, 1);
        assertEq(bobTokens[0], 1);
        assertEq(charlieTokens[0], 2);
        assertEq(nft.ownerOf(1), bob);
        assertEq(nft.ownerOf(2), charlie);
    }

    function test_DifferentSeedsProduceDifferentSigns() public {
        vm.deal(alice, 1 ether);

        // Create two victims with different seeds
        vm.prank(alice);
        nft.stick{value: 0.00042 ether}(bob, 12345);

        vm.prank(alice);
        nft.stick{value: 0.00042 ether}(charlie, 54321);

        // Get their token URIs
        string memory uri1 = nft.tokenURI(1);
        string memory uri2 = nft.tokenURI(2);

        // URIs should be different (different seeds = different appearance)
        assertTrue(keccak256(bytes(uri1)) != keccak256(bytes(uri2)));
    }

    // ============ Helper Functions ============

    function _startsWith(string memory str, string memory prefix) internal pure returns (bool) {
        bytes memory strBytes = bytes(str);
        bytes memory prefixBytes = bytes(prefix);

        if (strBytes.length < prefixBytes.length) {
            return false;
        }

        for (uint256 i = 0; i < prefixBytes.length; i++) {
            if (strBytes[i] != prefixBytes[i]) {
                return false;
            }
        }

        return true;
    }
}
