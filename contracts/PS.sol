// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./Pairing.sol";
import "./BN256G1.sol";

/**
 * @title BBS
 * @dev A library for verifying BBS signatures.
 */
contract PS {
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

    event Multiply(uint indexed x0, uint x1);
    event Add(uint indexed x0, uint x1);
    event Debug(uint indexed x0, uint x1);
    event Verification(uint c, uint s, Pairing.G1Point ymink, Pairing.G1Point sigma2, Pairing.G2Point sigma1, bool result);
    /*
        // Negated genarator of G2
        uint256 constant nG2x1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
        uint256 constant nG2x0 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
        uint256 constant nG2y1 = 17805874995975841540914202342111839520379459829704422454583296818431106115052;
        uint256 constant nG2y0 = 13392588948715843804641432497768002650278120570034223513918757245338268106653;
    */

    Pairing.G2Point gtildeneg;
    Pairing.G1Point X;
    Pairing.G1Point Y;
    constructor(Pairing.G2Point memory _gtildeneg, Pairing.G1Point memory _X, Pairing.G1Point memory _Y) public {
        X = _X;
        Y = _Y;
        gtildeneg = _gtildeneg;
    }
    /// @dev Checks if P is on G1 using the EllipticCurve library.
    /// @param point: 2 values of 256 bits each:
    ///  *) x-coordinate of point P
    ///  *) y-coordinate of point P
    /// @return true if P is in G1.
    function isOnCurve(uint[2] memory point) external pure returns (bool) {
        // checks if the given point is a valid point from the first elliptic curve group
        // uses the EllipticCurve library
        return EllipticCurve.isOnCurve(
            point[0],
            point[1],
            AA,
            BB,
            PP);
    }

    function add(uint256[4] memory input) external returns (uint256, uint256) {
        (uint xc0, uint xc1) = BN256G1.add(input);
        emit Add(xc0, xc1);
        return (xc0, xc1);
    }

    function multiply(uint256[3] memory input) external returns (uint, uint){
        (uint xc0, uint xc1) = BN256G1.multiply([input[0], input[1], input[2]]);
        emit Multiply(xc0, xc1);
        return (xc0, xc1);
    }

    function multiplyX(uint c) external returns (uint, uint){
        (uint xc0, uint xc1) = BN256G1.multiply([X.x, X.y, c]);
        emit Multiply(xc0, xc1);
        return (xc0, xc1);
    }

    function debug(uint c, Pairing.G1Point calldata ymink, uint s, Pairing.G2Point calldata sigma1, Pairing.G1Point calldata sigma2) external returns (uint e1a0, uint e1a1){
        {(uint xc0, uint xc1) = BN256G1.multiply([X.x, X.y, c]);
            //emit Verif(xc0, xc1);
            //uint smink= submod(s, k, FIELD_MODULUS);
            (uint ys0, uint ys1) = BN256G1.multiply([Y.x, Y.y, s]);
            //emit Verif(ys0, ys1);
            (uint ysmink0, uint ysmink1) = BN256G1.add([ys0, ys1, ymink.x, ymink.y]);
            //emit Verif(ysmink0, ysmink1);
            (e1a0, e1a1) = BN256G1.add([ysmink0, ysmink1, xc0, xc1]);
        }
        //emit Verif(e1a0, e1a1);
        //emit Verif(s, s);
        return (e1a0, e1a1);
    }


    function verify(uint c, Pairing.G1Point calldata ymink, uint s, Pairing.G2Point calldata sigma1, Pairing.G1Point calldata sigma2) external returns (bool){
        uint e1a0;
        uint e1a1;
        {(uint xc0, uint xc1) = BN256G1.multiply([X.x, X.y, c]);
            (uint ys0, uint ys1) = BN256G1.multiply([Y.x, Y.y, s]);
            (uint ysmink0, uint ysmink1) = BN256G1.add([ys0, ys1, ymink.x, ymink.y]);
            (e1a0, e1a1) = BN256G1.add([ysmink0, ysmink1, xc0, xc1]);
        }
        (uint sigma2c0, uint sigma2c1) = BN256G1.multiply([sigma2.x, sigma2.y, c]);
        emit Debug(e1a0,e1a1);
        emit Debug(sigma1.x[0],sigma1.x[1]);
        emit Debug(sigma1.y[0],sigma1.y[1]);
        emit Debug(sigma2c0,sigma2c1);
        emit Debug(gtildeneg.x[0],gtildeneg.x[1]);
        emit Debug(gtildeneg.y[0],gtildeneg.y[1]);
        (bool result) = checkPairing2([e1a0, e1a1, sigma1.x[0], sigma1.x[1], sigma1.y[0], sigma1.y[1], sigma2c0, sigma2c1, gtildeneg.x[0], gtildeneg.x[1], gtildeneg.y[0], gtildeneg.y[1]]);
        emit Verification(c, s, ymink, sigma2, sigma1, result);
        return result;
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
    function checkPairing2(uint256[12] memory input) public returns (bool) {
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
