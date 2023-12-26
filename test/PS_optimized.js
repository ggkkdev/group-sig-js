const {expect} = require("chai");
const {buildBn128,} = require("ffjavascript");

const {loadFixture} = require("@nomicfoundation/hardhat-network-helpers");
const {
    toG2AffineObject,
    toG1AffineObject,
    G1ToAffineStruct,
    G2ToAffineStruct
} = require("../utils/utils");


let bn128;
describe("PS optimized", function () {

    async function initFixture() {
        const Lib = await ethers.getContractFactory("BN256G1");
        const lib = await Lib.deploy();
        await lib.deployed();

        const PSLib = await ethers.getContractFactory("PSLib");
        const psLibContract = await PSLib.deploy()
        await psLibContract.deployed();

        const [owner, addr1, addr2] = await ethers.getSigners();
        const bn128 = await buildBn128();
        return {lib, owner, addr1, addr2, bn128, psLibContract};
    }

    // You can nest describe calls to create subsections.
    describe("Test ps optimized workflow", function () {
        let lib, gtilde, gtildeneg, y, x, m, gy, gx, sigma1, sigma2, ski, sigma1random, sigma2random, c, s,
            k, preg, rpairing, u, t, tautilde, psContract, ymink, psLibContract;

        it("Setup ", async function () {
            const fixture = await loadFixture(initFixture);
            bn128 = fixture.bn128;
            lib = fixture.lib;
            psLibContract = fixture.psLibContract;
            //Setup
            preg = bn128.Fr.random()
            x = bn128.Fr.random()
            y = bn128.Fr.random()
            gtilde = bn128.G1.timesFr(bn128.G1.one, preg)
            gtildeneg = bn128.G1.neg(gtilde)
            gx = bn128.G1.timesFr(gtilde, x)
            gy = bn128.G1.timesFr(gtilde, y)
            const gsk = (x, y)
            const gpk = (gtilde, gx, gy)
        })
        it("Deploy PS contract ", async function () {
            //Deploy contract
            const PS = await ethers.getContractFactory("PS");
            psContract = await PS.deploy(G1ToAffineStruct(bn128, bn128.G1.neg(gtilde)), G1ToAffineStruct(bn128, gx), G1ToAffineStruct(bn128, gy))
            await psContract.deployed();
        })
        it("Join ", async function () {
            //joinG
            ski = bn128.Fr.random()
            const tau = bn128.G2.timesFr(bn128.G2.one, ski)
            tautilde = bn128.G1.timesFr(gy, ski)
            u = bn128.Fr.random()
            sigma1 = bn128.G2.timesFr(bn128.G2.one, u)
            sigma2 = bn128.G2.timesFr(bn128.G2.add(bn128.G2.timesFr(bn128.G2.one, x), bn128.G2.timesFr(tau, y)), u)
            const sigma = (sigma1, sigma2)
            const gski = (ski, sigma)
        })
        it("Sign", async function () {
            //signG
            m = bn128.Fr.random()
            t = bn128.Fr.random()
            k = bn128.Fr.random()
            sigma1random = bn128.G2.timesFr(sigma1, t)
            const sigma1randomO = toG2AffineObject(bn128, sigma1random)
            sigma2random = bn128.G2.timesFr(sigma2, t)
            const sigma2randomO = toG2AffineObject(bn128, sigma2random)
            ymink = bn128.G1.neg(bn128.G1.timesFr(gy, k))
            const yminkO = toG1AffineObject(bn128, ymink)
            c = bn128.Fr.fromObject(ethers.utils.solidityKeccak256(["uint", "uint", "uint", "uint", "uint", "uint", "uint", "uint", "uint", "uint", "bytes32"], [sigma1randomO[0][1], sigma1randomO[0][0], sigma1randomO[1][1], sigma1randomO[1][0], sigma2randomO[0][1], sigma2randomO[0][0], sigma2randomO[1][1], sigma2randomO[1][0], yminkO[0], yminkO[1], m]))
            s = bn128.Fr.add(k, bn128.Fr.mul(c, ski))
            const mu = (sigma1random, sigma2random, ymink, c, s)
        })
        it("Pairing verification ", async function () {
            //verifG simplified
            const ltmp = bn128.G1.add(bn128.G1.add(bn128.G1.timesFr(gx, c), bn128.G1.timesFr(gy, s)), ymink)
            const lpairing = bn128.pairing(ltmp, sigma1random)
            rpairing = bn128.pairing(bn128.G1.timesFr(gtilde, c), sigma2random)
            expect(bn128.Gt.eq(lpairing, rpairing)).to.eq(true)
        })
        it("Hash verification", async function () {
            const yminkO = toG1AffineObject(bn128, ymink)
            const sigma1randomO = toG2AffineObject(bn128, sigma1random)
            const sigma2randomO = toG2AffineObject(bn128, sigma2random)
            const verifc = ethers.utils.solidityKeccak256(["uint", "uint", "uint", "uint", "uint", "uint", "uint", "uint", "uint", "uint", "bytes32"], [sigma1randomO[0][1], sigma1randomO[0][0], sigma1randomO[1][1], sigma1randomO[1][0], sigma2randomO[0][1], sigma2randomO[0][0], sigma2randomO[1][1], sigma2randomO[1][0], yminkO[0], yminkO[1], m])
            expect(bn128.Fr.eq(bn128.Fr.fromObject(verifc), c)).to.eq(true)
        })

        it("Verif with solidity pairing", async function () {
            //verif with solidity pairing
            const ltmp = bn128.G1.add(bn128.G1.add(bn128.G1.timesFr(gx, bn128.Fr.e(c)), bn128.G1.timesFr(gy, bn128.Fr.e(s))), ymink)
            rpairing = bn128.pairing(bn128.G1.timesFr(gtilde, bn128.Fr.e(c)), sigma2random)
            const e1a = toG1AffineObject(bn128, ltmp)
            const e1b = toG2AffineObject(bn128, sigma1random)
            const e2a = toG1AffineObject(bn128, bn128.G1.timesFr(bn128.G1.neg(gtilde), bn128.Fr.e(c)))
            const e2b = toG2AffineObject(bn128, sigma2random)
            const result = await lib.bn256CustomCheckPairing([e1a[0], e1a[1], e1b[0][1], e1b[0][0], e1b[1][1], e1b[1][0], e2a[0], e2a[1], e2b[0][1], e2b[0][0], e2b[1][1], e2b[1][0]])
            expect(result).to.eq(true)
        })

        it("Verif with solidity verify function", async function () {
            //verif with solidity verify function
            const _resVerif2 = await psContract.verify(bn128.Fr.toObject(c), G1ToAffineStruct(bn128, ymink), bn128.Fr.toObject(s),
                G2ToAffineStruct(bn128, sigma1random),
                G2ToAffineStruct(bn128, sigma2random), m)
            const resVerif2 = await _resVerif2.wait()
            console.log("Gas used for ps verification function " + resVerif2.gasUsed.toString())
            expect(resVerif2.events[resVerif2.events.length - 1].args.result).to.eq(true)
        })
        it("Open signature", async function () {
            //openG
            let lopenpairing = bn128.pairing(gtilde, sigma2random)
            lopenpairing = bn128.Gt.mul(lopenpairing, bn128.pairing(bn128.G1.neg(gx), sigma1random))
            let ropenpairing = bn128.pairing(tautilde, sigma1random)
            expect(bn128.Gt.eq(lopenpairing, ropenpairing)).to.eq(true)
        })
    });
});

module.exports = {bn128}
