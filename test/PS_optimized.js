const {expect} = require("chai");
const {buildBn128,} = require("ffjavascript");

const {loadFixture} = require("@nomicfoundation/hardhat-network-helpers");


describe("PS", function () {

    async function initFixture() {
        const Lib = await ethers.getContractFactory("BN256G1");
        const lib = await Lib.deploy();
        await lib.deployed();

        const [owner, addr1, addr2] = await ethers.getSigners();
        const bn128 = await buildBn128();
        return {lib, owner, addr1, addr2, bn128};
    }

    // You can nest describe calls to create subsections.
    describe("Test ps workflow", function () {
        let bn128, lib, gtilde, y, x, m, gy, gx, sigma1, sigma2, ski, sigma1random, sigma2random, c, s,
            k, preg, rpairing, u, t, tautilde, psContract, ymink;

        it("Setup ", async function () {
            const fixture = await loadFixture(initFixture);
            bn128 = fixture.bn128;
            lib = fixture.lib
            //Setup
            preg = bn128.Fr.random()
            x = bn128.Fr.random()
            y = bn128.Fr.random()
            gtilde = bn128.G1.timesFr(bn128.G1.one, preg)
            gx = bn128.G1.timesFr(gtilde, x)
            gy = bn128.G1.timesFr(gtilde, y)
            const gsk = (x, y)
            const gpk = (gtilde, gx, gy)
        })
        it("Deploy PS contract ", async function () {
            //Deploy contract
            const gtildeneg = bn128.G1.toObject(bn128.G1.toAffine(bn128.G1.neg(gtilde)))
            const gxO = bn128.G1.toObject(bn128.G1.toAffine(gx))
            const gyO = bn128.G1.toObject(bn128.G1.toAffine(gy))
            const PS = await ethers.getContractFactory("PS");
            psContract = await PS.deploy({
                x: gtildeneg[0],
                y: gtildeneg[1]
            }, {x: gxO[0], y: gxO[1]}, {x: gyO[0], y: gyO[1]});
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
            const sigma1randomO = bn128.G2.toObject(bn128.G2.toAffine(sigma1random))
            sigma2random = bn128.G2.timesFr(sigma2, t)
            const sigma2randomO = bn128.G2.toObject(bn128.G2.toAffine(sigma2random))
            ymink = bn128.G1.neg(bn128.G1.timesFr(gy, k))
            const yminkO = bn128.G1.toObject(bn128.G1.toAffine(ymink))
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
            const yminkO = bn128.G1.toObject(bn128.G1.toAffine(ymink))
            const sigma1randomO = bn128.G2.toObject(bn128.G2.toAffine(sigma1random))
            const sigma2randomO = bn128.G2.toObject(bn128.G2.toAffine(sigma2random))
            const verifc = ethers.utils.solidityKeccak256(["uint", "uint", "uint", "uint", "uint", "uint", "uint", "uint", "uint", "uint", "bytes32"], [sigma1randomO[0][1], sigma1randomO[0][0], sigma1randomO[1][1], sigma1randomO[1][0], sigma2randomO[0][1], sigma2randomO[0][0], sigma2randomO[1][1], sigma2randomO[1][0], yminkO[0], yminkO[1], m])
            expect(bn128.Fr.eq(bn128.Fr.fromObject(verifc),c)).to.eq(true)
        })

        it("Verif with solidity pairing", async function () {
            //verif with solidity pairing
            const ltmp = bn128.G1.add(bn128.G1.add(bn128.G1.timesFr(gx, bn128.Fr.e(c)), bn128.G1.timesFr(gy, bn128.Fr.e(s))), ymink)
            rpairing = bn128.pairing(bn128.G1.timesFr(gtilde, bn128.Fr.e(c)), sigma2random)
            const e1a = bn128.G1.toObject(bn128.G1.toAffine(ltmp))
            const e1b = bn128.G2.toObject(bn128.G2.toAffine(sigma1random))
            const e2a = bn128.G1.toObject(bn128.G1.toAffine(bn128.G1.timesFr(bn128.G1.neg(gtilde), bn128.Fr.e(c))))
            const e2b = bn128.G2.toObject(bn128.G2.toAffine(sigma2random))
            const result = await lib.bn256CustomCheckPairing([e1a[0], e1a[1], e1b[0][1], e1b[0][0], e1b[1][1], e1b[1][0], e2a[0], e2a[1], e2b[0][1], e2b[0][0], e2b[1][1], e2b[1][0]])
            expect(result).to.eq(true)
        })

        it("Verif with solidity verify function", async function () {
            //verif with solidity verify function
            const yminkO = bn128.G1.toObject(bn128.G1.toAffine(ymink))
            const sigma1randomO = bn128.G2.toObject(bn128.G2.toAffine(sigma1random))
            const sigma2randomO = bn128.G2.toObject(bn128.G2.toAffine(sigma2random))

            const _resVerif2 = await psContract.verify(bn128.Fr.toObject(c), {
                    x: yminkO[0],
                    y: yminkO[1]
                }, bn128.Fr.toObject(s),
                {
                    x: [sigma1randomO[0][1], sigma1randomO[0][0]],
                    y: [sigma1randomO[1][1], sigma1randomO[1][0]]
                },
                {
                    x: [sigma2randomO[0][1], sigma2randomO[0][0]],
                    y: [sigma2randomO[1][1], sigma2randomO[1][0]]
                }
                , m)
            const resVerif2 = await _resVerif2.wait()
            console.log("Gas used for ps verification function " + resVerif2.gasUsed.toString())
            expect(resVerif2.events[resVerif2.events.length - 1].args.resultPairing).to.eq(true)
            expect(resVerif2.events[resVerif2.events.length - 1].args.resultHash).to.eq(true)
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
