// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./BN256G1.sol";

/**
 * @title BBS
 * @dev A library for verifying BBS signatures.
 */
contract PS {
    struct G1Point {
        uint x;
        uint y;
    }

    struct G2Point {
        uint[2] x;
        uint[2] y;
    }

    uint256 internal constant FIELD_MODULUS = 0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47;
    // Generator coordinate `x` of the EC curve
    uint256 public constant GX = 1;
    // Generator coordinate `y` of the EC curve
    uint256 public constant GY = 2;
    // Constant `a` of EC equation
    uint256 internal constant AA = 0;
    // Constant `b` of EC equation
    uint256 internal constant BB = 3;
    // Prime number of the curve
    uint256 internal constant PP = 0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47;

    event Verification(uint c, uint s, G1Point ymink, G1Point sigma2, G2Point sigma1, bool result);


    G2Point gtildeneg;
    G1Point X;
    G1Point Y;
    constructor(G2Point memory _gtildeneg, G1Point memory _X, G1Point memory _Y) public {
        X = _X;
        Y = _Y;
        gtildeneg = _gtildeneg;
    }

    /// @dev Verify PS group signatures
    function verify(uint c, G1Point calldata ymink, uint s, G2Point calldata sigma1, G1Point calldata sigma2) external returns (bool){
        uint e1a0;
        uint e1a1;
        {(uint xc0, uint xc1) = BN256G1.multiply([X.x, X.y, c]);
            (uint ys0, uint ys1) = BN256G1.multiply([Y.x, Y.y, s]);
            (uint ysmink0, uint ysmink1) = BN256G1.add([ys0, ys1, ymink.x, ymink.y]);
            (e1a0, e1a1) = BN256G1.add([ysmink0, ysmink1, xc0, xc1]);
        }
        (uint sigma2c0, uint sigma2c1) = BN256G1.multiply([sigma2.x, sigma2.y, c]);
        (bool result) = checkPairing([e1a0, e1a1, sigma1.x[0], sigma1.x[1], sigma1.y[0], sigma1.y[1], sigma2c0, sigma2c1, gtildeneg.x[0], gtildeneg.x[1], gtildeneg.y[0], gtildeneg.y[1]]);
        emit Verification(c, s, ymink, sigma2, sigma1, result);
        return result;
    }


    /// @dev pairing check function
   /// returns true if == 0,
   /// returns false if != 0,
   /// reverts with "Wrong pairing" if invalid pairing
    function run(uint256[12] memory input) public view returns (bool) {
        assembly {
            let success := staticcall(gas(), 0x08, input, 0x0180, input, 0x20)
            if success {
                return (input, 0x20)
            }
        }
        revert("Wrong pairing");
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
    function checkPairing(uint256[12] memory input) public returns (bool) {
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


}
