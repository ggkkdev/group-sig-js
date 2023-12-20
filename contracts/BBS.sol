// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./Pairing.sol";

/**
 * @title BBS
 * @dev A library for verifying BBS signatures.
 */
contract BBS {

    // Negated genarator of G2
    uint256 constant nG2x1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant nG2x0 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant nG2y1 = 17805874995975841540914202342111839520379459829704422454583296818431106115052;
    uint256 constant nG2y0 = 13392588948715843804641432497768002650278120570034223513918757245338268106653;

    function checkPairing(Pairing.G1Point memory _g1point1,
        Pairing.G2Point memory _g2point1,
        Pairing.G1Point memory _g1point2,
        Pairing.G2Point memory _g2point2) external returns (bool) {
        /*        Pairing.G1Point memory signature = Pairing.G1Point({
                x: _signatureX,
                y: _signatureY
                });*/
        return Pairing.pairing2(_g1point1, _g2point1, _g1point2, _g2point2);
    }

    /// @dev Checks if e(P, Q) = e (R,S).
    /// @param input: 12 values of 256 bits each:
    ///  *) x-coordinate of point P
    ///  *) y-coordinate of point P
    ///  *) x real coordinate of point Q
    ///  *) x imaginary coordinate of point Q
    ///  *) y real coordinate of point Q
    ///  *) y imaginary coordinate of point Q
    ///  *) x-coordinate of point R
    ///  *) y-coordinate of point R
    ///  *) x real coordinate of point S
    ///  *) x imaginary coordinate of point S
    ///  *) y real coordinate of point S
    ///  *) y imaginary coordinate of point S
    /// @return true if e(P, Q) = e (R,S).
    function checkPairing2(uint256[12] memory input) external returns (bool) {
        uint256[1] memory result;
        bool success;
        assembly {
        // 0x08     id of the bn256CheckPairing precompile    (checking the elliptic curve pairings)
        // 0        number of ether to transfer
        // 0        since we have an array of fixed length, our input starts in 0
        // 384      size of call parameters, i.e. 12*256 bits == 384 bytes
        // 32       size of result (one 32 byte boolean!)
            success := call(sub(gas(), 2000), 0x08, 0, input, 384, result, 32)
        }
        require(success, "elliptic curve pairing failed");
        return result[0] == 1;
    }

    function verifySingle(
        uint256[2] memory signature,
        uint256[4] memory pubkey,
        uint256[2] memory message
    ) external view returns (bool) {
        uint256[12] memory input = [signature[0], signature[1], nG2x1, nG2x0, nG2y1, nG2y0, message[0], message[1], pubkey[1], pubkey[0], pubkey[3], pubkey[2]];
        uint256[1] memory out;
        bool success;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 8, input, 384, out, 32)
            switch success
            case 0 {
                invalid()
            }
        }
        require(success, "");
        return out[0] != 0;
    }

    /**
 *  returns true if == 0,
 *  returns false if != 0,
 *  reverts with "Wrong pairing" if invalid pairing
 */
    function run(uint256[12] memory input) public view returns (bool) {
        assembly {
            let success := staticcall(gas(), 0x08, input, 0x0180, input, 0x20)
            if success {
                return (input, 0x20)
            }
        }
        revert("Wrong pairing");
    }

    function testPairings() public view returns(bool) {
        uint256 aG1_x = 3010198690406615200373504922352659861758983907867017329644089018310584441462;
        uint256 aG1_y = 17861058253836152797273815394432013122766662423622084931972383889279925210507;

        uint256 bG2_x1 = 2725019753478801796453339367788033689375851816420509565303521482350756874229;
        uint256 bG2_x2 = 7273165102799931111715871471550377909735733521218303035754523677688038059653;
        uint256 bG2_y1 = 2512659008974376214222774206987427162027254181373325676825515531566330959255;
        uint256 bG2_y2 = 957874124722006818841961785324909313781880061366718538693995380805373202866;

        uint256 cG1_x = 4503322228978077916651710446042370109107355802721800704639343137502100212473;
        uint256 cG1_y = 6132642251294427119375180147349983541569387941788025780665104001559216576968;

        uint256 dG2_x1 = 18029695676650738226693292988307914797657423701064905010927197838374790804409;
        uint256 dG2_x2 = 14583779054894525174450323658765874724019480979794335525732096752006891875705;
        uint256 dG2_y1 = 2140229616977736810657479771656733941598412651537078903776637920509952744750;
        uint256 dG2_y2 = 11474861747383700316476719153975578001603231366361248090558603872215261634898;

        uint256[12] memory points = [
        aG1_x,
        aG1_y,
        bG2_x2,
        bG2_x1,
        bG2_y2,
        bG2_y1,
        cG1_x,
        cG1_y,
        dG2_x2,
        dG2_x1,
        dG2_y2,
        dG2_y1
        ];

        bool x = run(points);
        return x;
    }

}
