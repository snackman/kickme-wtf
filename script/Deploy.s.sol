// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/KickMeNFT.sol";

contract DeployScript is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        KickMeNFT nft = new KickMeNFT();

        console.log("KickMeNFT deployed to:", address(nft));
        console.log("Owner:", nft.owner());

        vm.stopBroadcast();
    }
}

/// @notice Deploy and configure with charity address
contract DeployWithCharityScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address charityAddress = vm.envAddress("CHARITY_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        KickMeNFT nft = new KickMeNFT();
        nft.setCharityAddress(charityAddress);

        console.log("KickMeNFT deployed to:", address(nft));
        console.log("Charity address set to:", charityAddress);

        vm.stopBroadcast();
    }
}
