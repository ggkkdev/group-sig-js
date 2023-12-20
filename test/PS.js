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
    describe("Deployment", function () {

        it("ps signatures ", async function () {
            const {bn128, lib} = await loadFixture(initFixture);
            //Setup
            const preg = bn128.Fr.random()
            const x = bn128.Fr.random()
            const y = bn128.Fr.random()
            const g = bn128.G2.timesFr(bn128.G2.one, bn128.Fr.e(preg))
            const gx = bn128.G2.timesFr(g, bn128.Fr.e(x))
            const gy = bn128.G2.timesFr(g, bn128.Fr.e(y))
            //to help
            const gy1 = bn128.G1.timesFr(bn128.G1.one, bn128.Fr.e(bn128.Fr.mul(y, preg)))
            const gx1 = bn128.G1.timesFr(bn128.G1.one, bn128.Fr.e(bn128.Fr.mul(x, preg)))
            const gsk = (x, y)
            const gpk = (g, gx, gy)

            //Deploy contract
            const gtildeneg = bn128.G2.toObject(bn128.G2.toAffine(bn128.G2.neg(g)))
            const gx1O = bn128.G1.toObject(bn128.G1.toAffine(gx1))
            const gy1O = bn128.G1.toObject(bn128.G1.toAffine(gy1))
            const PS = await ethers.getContractFactory("PS");
            const ps = await PS.deploy({
                x: [gtildeneg[0][1], gtildeneg[0][0]],
                y: [gtildeneg[1][1], gtildeneg[1][0]]
            }, {x: gx1O[0], y: gx1O[1]}, {x: gy1O[0], y: gy1O[1]});
            await ps.deployed();

            // sign
            const m = bn128.Fr.random()
            const xym = bn128.Fr.add(bn128.Fr.mul(y, m), x)
            const preh = bn128.Fr.random()
            const h = bn128.G1.timesFr(bn128.G1.one, bn128.Fr.e(preh))
            const h2 = bn128.G1.timesFr(h, bn128.Fr.e(xym))
            const sig = (h, h2)

            //verify
            const ym = bn128.G2.timesFr(gy, bn128.Fr.e(m))
            const p1 = bn128.pairing(h, bn128.G2.add(ym, gx))
            const p2 = bn128.pairing(h2, g)
            expect(bn128.Gt.eq(p1, p2)).to.eq(true)

            //joinG
            const ski = bn128.Fr.random()
            const tau = bn128.G1.timesFr(bn128.G1.one, bn128.Fr.e(ski))
            const tautilde = bn128.G2.timesFr(gy, bn128.Fr.e(ski))
            const tauy = bn128.pairing(tau, gy)
            const gtau = bn128.pairing(bn128.G1.one, tautilde)
            expect(bn128.Gt.eq(tauy, gtau)).to.eq(true)
            const u = bn128.Fr.random()
            const sigma1 = bn128.G1.timesFr(bn128.G1.one, bn128.Fr.e(u))
            const sigma2 = bn128.G1.timesFr(bn128.G1.add(bn128.G1.timesFr(bn128.G1.one, bn128.Fr.e(x)), bn128.G1.timesFr(tau, bn128.Fr.e(y))), bn128.Fr.e(u))
            const sigma = (sigma1, sigma2)
            const gski = (ski, sigma, bn128.pairing(sigma1, gy))

            //signG
            const t = bn128.Fr.random()
            const k = bn128.Fr.random()
            const sigma1random = bn128.G1.timesFr(sigma1, bn128.Fr.e(t))
            const sigma2random = bn128.G1.timesFr(sigma2, bn128.Fr.e(t))
            const signpairing = bn128.pairing(bn128.G1.timesFr(sigma1random, bn128.Fr.e(k)), gy)
            const c = bn128.Fr.fromObject(ethers.utils.solidityKeccak256(["bytes", "bytes", "bytes", "bytes"], [sigma1random, sigma2random, signpairing, m]))
            const s = bn128.Fr.add(k, bn128.Fr.mul(c, ski))
            const mu = (sigma1random, sigma2random, c, s)

            //verifG
            let R = bn128.pairing(bn128.G1.timesFr(sigma1random, bn128.Fr.e(c)), gx)
            R = bn128.Gt.mul(R, bn128.pairing(sigma2random, bn128.G2.neg(bn128.G2.timesFr(g, bn128.Fr.e(c)))))
            R = bn128.Gt.mul(R, bn128.pairing(bn128.G1.timesFr(sigma1random, bn128.Fr.e(s)), gy))
            expect(bn128.Gt.eq(R, signpairing)).to.eq(true)
            const _c = bn128.Fr.fromObject(ethers.utils.solidityKeccak256(["bytes", "bytes", "bytes", "bytes"], [sigma1random, sigma2random, R, m]))
            expect(bn128.Fr.eq(_c, c)).to.eq(true)

            //verifG simplified
            const yk = bn128.G2.timesFr(gy, bn128.Fr.e(k))
            const ltmp = bn128.G2.sub(bn128.G2.sub(yk, bn128.G2.timesFr(gx, bn128.Fr.e(c))), bn128.G2.timesFr(gy, bn128.Fr.e(s)))
            const lpairing = bn128.pairing(sigma1random, ltmp)
            const rpairing = bn128.pairing(bn128.G1.neg(bn128.G1.timesFr(sigma2random, bn128.Fr.e(c))), g)
            expect(bn128.Gt.eq(lpairing, rpairing)).to.eq(true)

            //verifG helped
            const lpairingTest = bn128.pairing(sigma1random, bn128.G2.add(yk, gx))
            const rpairingTest = bn128.pairing(bn128.G1.timesFr(sigma1random, bn128.Fr.e(bn128.Fr.add(bn128.Fr.mul(y, k), x))), g)
            expect(bn128.Gt.eq(lpairingTest, rpairingTest)).to.eq(true)

            const exponent = bn128.Fr.add(bn128.Fr.mul(bn128.Fr.mul(preg, x), c), bn128.Fr.mul(bn128.Fr.mul(preg, y), bn128.Fr.sub(s, k)))
            expect(bn128.Gt.eq(bn128.pairing(bn128.G1.timesFr(sigma1random, bn128.Fr.neg(exponent)), bn128.G2.g), rpairing)).to.eq(true)
            const sigma12 = bn128.G2.timesFr(bn128.G2.one, bn128.Fr.e(u))
            const lpairingTest2 = bn128.pairing(bn128.G1.sub(bn128.G1.timesFr(gy1, bn128.Fr.e(bn128.Fr.sub(k, s))), bn128.G1.timesFr(gx1, bn128.Fr.e(c))), bn128.G2.timesFr(sigma12, bn128.Fr.e(t)))
            expect(bn128.Gt.eq(lpairingTest2, rpairing)).to.eq(true)

            //verif with solidity pairing
            let e1a = bn128.G1.sub(bn128.G1.timesFr(gy1, bn128.Fr.e(bn128.Fr.sub(k, s))), bn128.G1.timesFr(gx1, bn128.Fr.e(c)))
            e1a = bn128.G1.toObject(bn128.G1.toAffine(e1a))
            const e1b = bn128.G2.toObject(bn128.G2.toAffine(bn128.G2.timesFr(sigma12, bn128.Fr.e(t))))
            const e2a = bn128.G1.toObject(bn128.G1.toAffine(bn128.G1.timesFr(sigma2random, bn128.Fr.e(c))))
            const e2b = bn128.G2.toObject(bn128.G2.toAffine(g))

            const result = await lib.bn256CustomCheckPairing([e1a[0], e1a[1], e1b[0][1], e1b[0][0], e1b[1][1], e1b[1][0], e2a[0], e2a[1], e2b[0][1], e2b[0][0], e2b[1][1], e2b[1][0]])
            expect(result).to.eq(true)

            //verif with solidity verify function
            const ymink = bn128.G1.neg(bn128.G1.timesFr(gy1, bn128.Fr.e(k)))
            const yminkO = bn128.G1.toObject(bn128.G1.toAffine(ymink))
            const sigma1random2 = bn128.G2.timesFr(bn128.G2.one, bn128.Fr.e(bn128.Fr.mul(u, t)))
            const sigma1random2O = bn128.G2.toObject(bn128.G2.toAffine(sigma1random2))
            const sigma2randomO = bn128.G1.toObject(bn128.G1.toAffine(sigma2random))
            const ea1 = bn128.G1.add(bn128.G1.timesFr(gx1, bn128.Fr.e(c)), bn128.G1.add(bn128.G1.timesFr(gy1, bn128.Fr.e(s)), ymink))
            const lpairingsol = bn128.pairing(ea1, sigma1random2)
            const sigma2randomc = bn128.G1.timesFr(sigma2random, bn128.Fr.e(c))
            const sigma2randomcO = bn128.G1.toObject(bn128.G1.toAffine(sigma2randomc))

            const _resVerif2 = await ps.verify(bn128.Fr.toObject(c), {
                x: yminkO[0],
                y: yminkO[1]
            }, bn128.Fr.toObject(s), {
                x: [sigma1random2O[0][1], sigma1random2O[0][0]],
                y: [sigma1random2O[1][1], sigma1random2O[1][0]]
            }, {x: sigma2randomO[0], y: sigma2randomO[1]})
            const resVerif2 = await _resVerif2.wait()
            console.log("Gas used for ps verification function " + resVerif2.gasUsed.toString())
            expect(resVerif2.events[resVerif2.events.length - 1].args.result).to.eq(true)

            //openG
            let lopenpairing = bn128.pairing(sigma2random, g)
            lopenpairing = bn128.Gt.mul(lopenpairing, bn128.pairing(bn128.G1.neg(sigma1random), gx))
            let ropenpairing = bn128.pairing(sigma1random, tautilde)
            expect(bn128.Gt.eq(lopenpairing, ropenpairing)).to.eq(true)

        })
    });
});
