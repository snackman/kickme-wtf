// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {KickMeDoodleRenderer} from "../src/KickMeDoodleRenderer.sol";

contract KickMeDoodleRendererTest is Test {
    function testRenderSVG() public pure {
        string memory svg = KickMeDoodleRenderer.renderSVG(1, bytes32(uint256(12345)));
        require(bytes(svg).length > 1000, "SVG too short");
    }

    function testRenderImageURI() public pure {
        string memory uri = KickMeDoodleRenderer.renderImageURI(1, bytes32(uint256(12345)));
        require(bytes(uri).length > 100, "URI too short");
    }

    function testDeterminism() public pure {
        string memory svg1 = KickMeDoodleRenderer.renderSVG(100, bytes32(uint256(42)));
        string memory svg2 = KickMeDoodleRenderer.renderSVG(100, bytes32(uint256(42)));
        require(keccak256(bytes(svg1)) == keccak256(bytes(svg2)), "Not deterministic");
    }

    function testVariation() public pure {
        string memory svg1 = KickMeDoodleRenderer.renderSVG(1, bytes32(uint256(42)));
        string memory svg2 = KickMeDoodleRenderer.renderSVG(2, bytes32(uint256(42)));
        require(keccak256(bytes(svg1)) != keccak256(bytes(svg2)), "Should vary");
    }

    function testLogSVG() public view {
        string memory svg = KickMeDoodleRenderer.renderSVG(1, bytes32(uint256(12345)));
        console.log(svg);
    }

    function testLogURI() public view {
        string memory uri = KickMeDoodleRenderer.renderImageURI(1, bytes32(uint256(12345)));
        console.log(uri);
    }
}
