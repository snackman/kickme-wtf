// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title KickMeDoodleRenderer
 * @notice Onchain SVG renderer for handmade doodle "Kick Me" signs
 */
library KickMeDoodleRenderer {
    using Strings for uint256;

    struct RenderParams {
        uint256 seed;
        int256 paperRot;
        int256 tapeRot;
        int256 tapeX;
        uint256 warp;
        uint256 shadowDx;
        uint256 shadowDy;
        uint256 markerW;
        uint256 jitter;
        uint256 hatchN;
        int256 hatchAng;
        bool doodleOn;
        int256 textOffsetX;
        int256 textOffsetY;
        int256 meShiftX;
    }

    function rand(uint256 seed, bytes32 key) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(seed, key)));
    }

    function rangeUint(uint256 seed, bytes32 key, uint256 min, uint256 max) internal pure returns (uint256) {
        return min + (rand(seed, key) % (max - min + 1));
    }

    function rangeInt(uint256 seed, bytes32 key, int256 min, int256 max) internal pure returns (int256) {
        return min + int256(rand(seed, key) % uint256(max - min + 1));
    }

    function intToString(int256 value) internal pure returns (string memory) {
        if (value >= 0) return uint256(value).toString();
        return string(abi.encodePacked("-", uint256(-value).toString()));
    }

    function tenthsToString(int256 tenths) internal pure returns (string memory) {
        bool neg = tenths < 0;
        uint256 abs = neg ? uint256(-tenths) : uint256(tenths);
        if (neg) return string(abi.encodePacked("-", (abs / 10).toString(), ".", (abs % 10).toString()));
        return string(abi.encodePacked((abs / 10).toString(), ".", (abs % 10).toString()));
    }

    function getParams(uint256 tokenId, bytes32 salt) internal pure returns (RenderParams memory p) {
        p.seed = uint256(keccak256(abi.encodePacked(tokenId, salt)));
        p.paperRot = rangeInt(p.seed, keccak256("paperRot"), -20, 20);
        p.tapeRot = rangeInt(p.seed, keccak256("tapeRot"), -80, 80);
        p.tapeX = rangeInt(p.seed, keccak256("tapeX"), -20, 20);
        p.warp = rangeUint(p.seed, keccak256("warp"), 3, 9);
        p.shadowDx = rangeUint(p.seed, keccak256("sdx"), 10, 16);
        p.shadowDy = rangeUint(p.seed, keccak256("sdy"), 10, 16);
        p.markerW = rangeUint(p.seed, keccak256("mw"), 18, 26);
        p.jitter = rangeUint(p.seed, keccak256("jit"), 1, 3);
        p.hatchN = rangeUint(p.seed, keccak256("hn"), 18, 28);
        p.hatchAng = rangeInt(p.seed, keccak256("ha"), -120, -60);
        p.doodleOn = (rand(p.seed, keccak256("doodle")) % 10) < 3;
        // 15% margin buffer: paper is 150-850 (700w) x 190-870 (680h)
        // Safe zone with 15% margins: X 255-745, Y 292-768
        // Text block is ~298px wide, ~238px tall
        // X offset: 55 (left edge at 255) to 247 (right edge at 745)
        // Y offset: -130 (top at ~294) to 100 (bottom at ~762)
        p.textOffsetX = rangeInt(p.seed, keccak256("textX"), 55, 247);
        p.textOffsetY = rangeInt(p.seed, keccak256("textY"), -100, 80);
        // ME row can shift left (under K) or right
        p.meShiftX = rangeInt(p.seed, keccak256("meShiftX"), -100, 50);
    }

    function generatePaperPath(uint256 seed, uint256 warp) internal pure returns (string memory) {
        int256[24] memory bp = [int256(150),int256(190),int256(383),int256(190),int256(616),int256(190),int256(850),int256(190),int256(850),int256(417),int256(850),int256(643),int256(850),int256(870),int256(616),int256(870),int256(383),int256(870),int256(150),int256(870),int256(150),int256(643),int256(150),int256(417)];
        int256 w = int256(warp);
        string memory path = "";

        for (uint256 i = 0; i < 12; i++) {
            int256 px = bp[i*2] + rangeInt(seed, keccak256(abi.encodePacked("ppx", i)), -w, w);
            int256 py = bp[i*2+1] + rangeInt(seed, keccak256(abi.encodePacked("ppy", i)), -w, w);
            if (i == 0) {
                path = string(abi.encodePacked("M", intToString(px), " ", intToString(py)));
            } else {
                path = string(abi.encodePacked(path, " L", intToString(px), " ", intToString(py)));
            }
        }
        return string(abi.encodePacked(path, " Z"));
    }

    function generateTapePath(uint256 seed, int256 tapeX, uint256 warp) internal pure returns (string memory) {
        int256 bx = 370 + tapeX;
        int256 by = 160;
        int256 tw = int256(warp > 2 ? warp - 2 : 1);

        int256[8] memory xs = [bx, bx+130, bx+260, bx+260, bx+260, bx+130, bx, bx];
        int256[8] memory ys = [by, by, by, by+42, by+85, by+85, by+85, by+42];

        string memory path = "";
        for (uint256 i = 0; i < 8; i++) {
            int256 px = xs[i] + rangeInt(seed, keccak256(abi.encodePacked("tpx", i)), -tw, tw);
            int256 py = ys[i] + rangeInt(seed, keccak256(abi.encodePacked("tpy", i)), -tw, tw);
            if (i == 0) path = string(abi.encodePacked("M", intToString(px), " ", intToString(py)));
            else path = string(abi.encodePacked(path, " L", intToString(px), " ", intToString(py)));
        }
        return string(abi.encodePacked(path, " Z"));
    }

    function generateHatchLines(uint256 seed, uint256 hatchN) internal pure returns (string memory) {
        string memory lines = "";
        for (uint256 i = 0; i < hatchN; i++) {
            int256 baseY = int256(220 + (i * 600) / hatchN);
            int256 y1 = baseY + rangeInt(seed, keccak256(abi.encodePacked("hy1", i)), -8, 8);
            int256 y2 = baseY + rangeInt(seed, keccak256(abi.encodePacked("hy2", i)), -8, 8);
            lines = string(abi.encodePacked(lines, '<path d="M170 ', intToString(y1), ' L830 ', intToString(y2), '" stroke="#000" stroke-width="2" fill="none" opacity="0.05"/>'));
        }
        return lines;
    }

    function generateTapeFibers(uint256 seed, int256 tapeX) internal pure returns (string memory) {
        string memory fibers = "";
        for (uint256 i = 0; i < 4; i++) {
            int256 x = 370 + tapeX + 50 + int256(i * 50) + rangeInt(seed, keccak256(abi.encodePacked("tfx", i)), -5, 5);
            fibers = string(abi.encodePacked(fibers, '<path d="M', intToString(x), ' 165 L', intToString(x+2), ' 240" stroke="#000" opacity="0.06" stroke-width="2" fill="none"/>'));
        }
        return fibers;
    }

    function glyphK(uint256 seed, uint256 idx, int256 j) internal pure returns (string memory) {
        int256 d = rangeInt(seed, keccak256(abi.encodePacked("gK", idx)), -j, j);
        return string(abi.encodePacked('<path d="M', intToString(20+d), ' 10 L20 130"/><path d="M20 70 L85 15"/><path d="M20 70 L90 130"/>'));
    }

    function glyphI(uint256 seed, uint256 idx, int256 j) internal pure returns (string memory) {
        int256 d = rangeInt(seed, keccak256(abi.encodePacked("gI", idx)), -j, j);
        return string(abi.encodePacked('<path d="M', intToString(50+d), ' 10 L50 130"/><path d="M25 10 L75 10"/><path d="M25 130 L75 130"/>'));
    }

    function glyphC(uint256 seed, uint256 idx, int256 j) internal pure returns (string memory) {
        int256 d = rangeInt(seed, keccak256(abi.encodePacked("gC", idx)), -j, j);
        return string(abi.encodePacked('<path d="M', intToString(85+d), ' 25 C40 0, 15 40, 20 70 C25 110, 55 145, 88 118"/>'));
    }

    function glyphM(uint256 seed, uint256 idx, int256 j) internal pure returns (string memory) {
        int256 d = rangeInt(seed, keccak256(abi.encodePacked("gM", idx)), -j, j);
        return string(abi.encodePacked('<path d="M', intToString(15+d), ' 130 L15 10"/><path d="M15 10 L50 70"/><path d="M50 70 L85 10"/><path d="M85 10 L85 130"/>'));
    }

    function glyphE(uint256 seed, uint256 idx, int256 j) internal pure returns (string memory) {
        int256 d = rangeInt(seed, keccak256(abi.encodePacked("gE", idx)), -j, j);
        return string(abi.encodePacked('<path d="M', intToString(20+d), ' 10 L20 130"/><path d="M20 10 L90 10"/><path d="M20 70 L75 70"/><path d="M20 130 L90 130"/>'));
    }

    function wrapGlyph(string memory paths, int256 x, int256 y, uint256 scale10, uint256 markerW) internal pure returns (string memory) {
        return string(abi.encodePacked(
            '<g transform="translate(', intToString(x), ' ', intToString(y), ') scale(0.', scale10.toString(), ')" stroke="#000" stroke-width="', markerW.toString(), '" stroke-linecap="round" stroke-linejoin="round" fill="none">', paths, '</g>',
            '<g transform="translate(', intToString(x+2), ' ', intToString(y+1), ') scale(0.', scale10.toString(), ')" stroke="#000" stroke-width="', (markerW>4?markerW-4:1).toString(), '" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.25">', paths, '</g>'
        ));
    }

    function generateText(uint256 seed, uint256 markerW, uint256 jitter, int256 offsetX, int256 offsetY, int256 meShiftX) internal pure returns (string memory) {
        uint256 scale10 = 55 + rangeUint(seed, keccak256("scale"), 0, 10);
        int256 j = int256(jitter);
        // Per-letter position jitter (-12 to +12 pixels)
        int256 k1x = rangeInt(seed, keccak256("k1x"), -12, 12);
        int256 k1y = rangeInt(seed, keccak256("k1y"), -10, 10);
        int256 ix = rangeInt(seed, keccak256("ix"), -12, 12);
        int256 iy = rangeInt(seed, keccak256("iy"), -10, 10);
        int256 cx = rangeInt(seed, keccak256("cx"), -12, 12);
        int256 cy = rangeInt(seed, keccak256("cy"), -10, 10);
        int256 k2x = rangeInt(seed, keccak256("k2x"), -12, 12);
        int256 k2y = rangeInt(seed, keccak256("k2y"), -10, 10);
        int256 mx = rangeInt(seed, keccak256("mx"), -12, 12);
        int256 my = rangeInt(seed, keccak256("my"), -10, 10);
        int256 ex = rangeInt(seed, keccak256("ex"), -12, 12);
        int256 ey = rangeInt(seed, keccak256("ey"), -10, 10);
        return string(abi.encodePacked(
            wrapGlyph(glyphK(seed, 0, j), 200 + offsetX + k1x, 430 + offsetY + k1y, scale10, markerW),
            wrapGlyph(glyphI(seed, 1, j), 285 + offsetX + ix, 430 + offsetY + iy, scale10, markerW),
            wrapGlyph(glyphC(seed, 2, j), 355 + offsetX + cx, 430 + offsetY + cy, scale10, markerW),
            wrapGlyph(glyphK(seed, 3, j), 440 + offsetX + k2x, 430 + offsetY + k2y, scale10, markerW),
            wrapGlyph(glyphM(seed, 4, j), 300 + offsetX + meShiftX + mx, 590 + offsetY + my, scale10, markerW),
            wrapGlyph(glyphE(seed, 5, j), 410 + offsetX + meShiftX + ex, 590 + offsetY + ey, scale10, markerW)
        ));
    }

    function generateDoodle(uint256 seed) internal pure returns (string memory) {
        int256 cx = 760 + rangeInt(seed, keccak256("doodleX"), -15, 15);
        int256 cy = 820 + rangeInt(seed, keccak256("doodleY"), -15, 15);
        return string(abi.encodePacked('<g opacity="0.12" stroke="#000" stroke-width="3" stroke-linecap="round"><path d="M', intToString(cx-12), ' ', intToString(cy), ' L', intToString(cx+12), ' ', intToString(cy), '"/><path d="M', intToString(cx), ' ', intToString(cy-12), ' L', intToString(cx), ' ', intToString(cy+12), '"/></g>'));
    }

    function generateCornerCurl(uint256 seed) internal pure returns (string memory) {
        int256 dx = rangeInt(seed, keccak256("curlX"), -5, 5);
        return string(abi.encodePacked('<path d="M', intToString(820+dx), ' 210 Q835 195 840 220" stroke="#000" opacity="0.25" stroke-width="2" fill="none"/>'));
    }

    function renderSVG(uint256 tokenId, bytes32 salt) internal pure returns (string memory) {
        RenderParams memory p = getParams(tokenId, salt);
        return _assembleSVG(p);
    }

    function _assembleSVG(RenderParams memory p) private pure returns (string memory) {
        string memory paperPath = generatePaperPath(p.seed, p.warp);
        string memory tapePath = generateTapePath(p.seed, p.tapeX, p.warp);

        string memory part1 = string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">',
            _renderShadow(paperPath, p.shadowDx, p.shadowDy),
            _renderPaper(p, paperPath)
        ));

        string memory part2 = _renderTextAndEnd(p, tapePath);

        return string(abi.encodePacked(part1, part2));
    }

    function _renderTextAndEnd(RenderParams memory p, string memory tapePath) private pure returns (string memory) {
        string memory textGroup = string(abi.encodePacked(
            '<g id="text" transform="rotate(', tenthsToString(p.paperRot), ' 500 530)">',
            generateText(p.seed, p.markerW, p.jitter, p.textOffsetX, p.textOffsetY, p.meShiftX),
            '</g>'
        ));

        return string(abi.encodePacked(
            _renderTape(p, tapePath),
            textGroup,
            p.doodleOn ? generateDoodle(p.seed) : '',
            '</svg>'
        ));
    }

    function _renderShadow(string memory paperPath, uint256 dx, uint256 dy) private pure returns (string memory) {
        return string(abi.encodePacked('<g id="shadow" transform="translate(', dx.toString(), ' ', dy.toString(), ')"><path d="', paperPath, '" fill="#000" opacity="0.12"/></g>'));
    }

    function _renderPaper(RenderParams memory p, string memory paperPath) private pure returns (string memory) {
        return string(abi.encodePacked(
            '<g id="paper" transform="rotate(', tenthsToString(p.paperRot), ' 500 530)">',
            '<path d="', paperPath, '" fill="#FCFCFC" stroke="#111" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>',
            '<path d="', paperPath, '" fill="none" stroke="#000" stroke-width="4" opacity="0.20" stroke-linecap="round" stroke-linejoin="round" transform="translate(1 1)"/>',
            generateCornerCurl(p.seed),
            '<g id="hatch" transform="rotate(', tenthsToString(p.hatchAng), ' 500 530)" opacity="0.05">', generateHatchLines(p.seed, p.hatchN), '</g></g>'
        ));
    }

    function _renderTape(RenderParams memory p, string memory tapePath) private pure returns (string memory) {
        return string(abi.encodePacked(
            '<g id="tape" transform="rotate(', tenthsToString(p.tapeRot), ' 500 200)">',
            '<path d="', tapePath, '" fill="#E8D9B5" stroke="#000" stroke-width="3" opacity="0.85" stroke-linecap="round" stroke-linejoin="round"/>',
            '<path d="', tapePath, '" fill="none" stroke="#000" stroke-width="3" opacity="0.18" stroke-linecap="round" stroke-linejoin="round" transform="translate(1 1)"/>',
            generateTapeFibers(p.seed, p.tapeX), '</g>'
        ));
    }

    function renderImageURI(uint256 tokenId, bytes32 salt) internal pure returns (string memory) {
        return string(abi.encodePacked("data:image/svg+xml;base64,", Base64.encode(bytes(renderSVG(tokenId, salt)))));
    }
}
