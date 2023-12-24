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
    //uint256 internal constant FIELD_MODULUS = 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001;
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

    event Verification(uint c, uint s, G1Point ymink, G2Point sigma2, G2Point sigma1, bool resultPairing, bool resultHash);
    event Debug(bytes32 hash);
    event Debug2(uint a, uint b, uint c, uint d, uint e, uint f, uint g, uint h, bytes32 message, bool result);


    G1Point gtildeneg;
    G1Point X;
    G1Point Y;
    constructor(G1Point memory _gtildeneg, G1Point memory _X, G1Point memory _Y) public {
        X = _X;
        Y = _Y;
        gtildeneg = _gtildeneg;
    }

    /// @dev Verify PS group signatures
    function verify(uint c, G1Point calldata ymink, uint s, G2Point calldata sigma1, G2Point calldata sigma2, bytes32 message) external returns (bool){
        (bool resultPairing) = checkPairing(c, ymink, s, sigma1, sigma2);
        //bool hashCheck = checkHash(c, sigma1, sigma2, ymink, message);
        emit Verification(c, s, ymink, sigma2, sigma1, resultPairing, resultPairing);
        return (resultPairing);
        //emit Verification(c, s, ymink, sigma2, sigma1, resultPairing, hashCheck);
        //return (resultPairing && hashCheck);
        //return result;
    }

        function checkPairing(uint c, G1Point calldata ymink, uint s, G2Point calldata sigma1, G2Point calldata sigma2) public returns (bool){
            uint e1a0;
            uint e1a1;
            {(uint xc0, uint xc1) = BN256G1.multiply([X.x, X.y, c]);
                (uint ys0, uint ys1) = BN256G1.multiply([Y.x, Y.y, s]);
                (uint ysmink0, uint ysmink1) = BN256G1.add([ys0, ys1, ymink.x, ymink.y]);
                (e1a0, e1a1) = BN256G1.add([ysmink0, ysmink1, xc0, xc1]);
            }
            (uint gtildenegc0, uint gtildenegc1) = BN256G1.multiply([gtildeneg.x, gtildeneg.y, c]);
            (bool resultPairing) = BN256G1.bn256CheckPairing([e1a0, e1a1, sigma1.x[0], sigma1.x[1], sigma1.y[0], sigma1.y[1], gtildenegc0, gtildenegc1, sigma2.x[0], sigma2.x[1], sigma2.y[0], sigma2.y[1]]);
            return (resultPairing);
        }
    /*
            function checkHash(uint c, G2Point calldata sigma1, G1Point calldata sigma2, G1Point calldata ymink, bytes32 message) public returns (bool){
                bytes32 hashed = keccak256(abi.encodePacked(sigma1.x[0], sigma1.x[1], sigma1.y[0], sigma1.y[1], sigma2.x, sigma2.y, ymink.x, ymink.y, message));
                //emit Debug(hashed);
                bytes32 hashed2 = bytes32(uint(hashed) % FIELD_MODULUS);
                //emit Debug(hashed2);
                bool hashCheck = (bytes32(c) == hashed2);
                emit Debug(hashed);
                emit Debug(hashed2);
                emit Debug2(sigma1.x[0], sigma1.x[1], sigma1.y[0], sigma1.y[1], sigma2.x, sigma2.y, ymink.x, ymink.y, message, hashCheck);
                return hashCheck;
            }
        */
}
