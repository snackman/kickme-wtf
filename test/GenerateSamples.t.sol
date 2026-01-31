// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {KickMeDoodleRenderer} from "../src/KickMeDoodleRenderer.sol";

contract GenerateSamplesTest is Test {
    function testSample1() public view { console.log(KickMeDoodleRenderer.renderSVG(1, bytes32(uint256(999)))); }
    function testSample2() public view { console.log(KickMeDoodleRenderer.renderSVG(2, bytes32(uint256(888)))); }
    function testSample3() public view { console.log(KickMeDoodleRenderer.renderSVG(3, bytes32(uint256(777)))); }
    function testSample4() public view { console.log(KickMeDoodleRenderer.renderSVG(4, bytes32(uint256(666)))); }
    function testSample5() public view { console.log(KickMeDoodleRenderer.renderSVG(5, bytes32(uint256(12345)))); }
}
