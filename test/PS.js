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
        let gx1, gy1, bn128, lib, g, y, x, m, gy, gx, h, h2, sigma1, sigma2, ski, sigma1random, sigma2random, c, s,
            signpairing, yk, k, preg, rpairing, u, t, sigma12, tautilde, psContract,sigma1randomk, ymink,sigma1random2;

        it("Setup ", async function () {
            const fixture = await loadFixture(initFixture);
            bn128 = fixture.bn128;
            lib = fixture.lib
            //Setup
            preg = bn128.Fr.random()
            x = bn128.Fr.random()
            y = bn128.Fr.random()
            g = bn128.G2.timesFr(bn128.G2.one, bn128.Fr.e(preg))
            gx = bn128.G2.timesFr(g, bn128.Fr.e(x))
            gy = bn128.G2.timesFr(g, bn128.Fr.e(y))
            //to help
            gy1 = bn128.G1.timesFr(bn128.G1.one, bn128.Fr.e(bn128.Fr.mul(y, preg)))
            gx1 = bn128.G1.timesFr(bn128.G1.one, bn128.Fr.e(bn128.Fr.mul(x, preg)))
            const gsk = (x, y)
            const gpk = (g, gx, gy)
        })
        it("Deploy PS contract ", async function () {
            //Deploy contract
            const gtildeneg = bn128.G2.toObject(bn128.G2.toAffine(bn128.G2.neg(g)))
            const gx1O = bn128.G1.toObject(bn128.G1.toAffine(gx1))
            const gy1O = bn128.G1.toObject(bn128.G1.toAffine(gy1))
            const PS = await ethers.getContractFactory("PS");
            psContract = await PS.deploy({
                x: [gtildeneg[0][1], gtildeneg[0][0]],
                y: [gtildeneg[1][1], gtildeneg[1][0]]
            }, {x: gx1O[0], y: gx1O[1]}, {x: gy1O[0], y: gy1O[1]});
            await psContract.deployed();
        })
        it("Sign ", async function () {
            // sign
            m = bn128.Fr.random()
            const xym = bn128.Fr.add(bn128.Fr.mul(y, m), x)
            const preh = bn128.Fr.random()
            h = bn128.G1.timesFr(bn128.G1.one, bn128.Fr.e(preh))
            h2 = bn128.G1.timesFr(h, bn128.Fr.e(xym))
            const sig = (h, h2)
        })

        it("Verify ", async function () {
            //verify
            const ym = bn128.G2.timesFr(gy, bn128.Fr.e(m))
            const p1 = bn128.pairing(h, bn128.G2.add(ym, gx))
            const p2 = bn128.pairing(h2, g)
            expect(bn128.Gt.eq(p1, p2)).to.eq(true)
        })
        it("Join ", async function () {
            //joinG
            ski = bn128.Fr.random()
            const tau = bn128.G1.timesFr(bn128.G1.one, bn128.Fr.e(ski))
            tautilde = bn128.G2.timesFr(gy, bn128.Fr.e(ski))
            const tauy = bn128.pairing(tau, gy)
            const gtau = bn128.pairing(bn128.G1.one, tautilde)
            expect(bn128.Gt.eq(tauy, gtau)).to.eq(true)
            u = bn128.Fr.random()
            sigma1 = bn128.G1.timesFr(bn128.G1.one, bn128.Fr.e(u))
            sigma2 = bn128.G1.timesFr(bn128.G1.add(bn128.G1.timesFr(bn128.G1.one, bn128.Fr.e(x)), bn128.G1.timesFr(tau, bn128.Fr.e(y))), bn128.Fr.e(u))
            const sigma = (sigma1, sigma2)
            const gski = (ski, sigma, bn128.pairing(sigma1, gy))
        })
        it("Sign", async function () {
            //signG
            t = bn128.Fr.random()
            k = bn128.Fr.random()
            sigma1random = bn128.G1.timesFr(sigma1, bn128.Fr.e(t))
            sigma1random2 = bn128.G2.timesFr(bn128.G2.one, bn128.Fr.e(bn128.Fr.mul(u, t)))
            const sigma1random2O = bn128.G2.toObject(bn128.G2.toAffine(sigma1random2))
            sigma2random = bn128.G1.timesFr(sigma2, bn128.Fr.e(t))
            const sigma2randomO = bn128.G1.toObject(bn128.G1.toAffine(sigma2random))
            signpairing = bn128.pairing(bn128.G1.timesFr(sigma1random, bn128.Fr.e(k)), gy)
            sigma1randomk=bn128.G1.timesFr(sigma1random, bn128.Fr.e(k))
            ymink = bn128.G1.neg(bn128.G1.timesFr(gy1, bn128.Fr.e(k)))
            const yminkO= bn128.G1.toObject(bn128.G1.toAffine(ymink))
            c = bn128.Fr.fromObject(ethers.utils.solidityKeccak256(["uint", "uint","uint", "uint", "uint", "uint", "uint", "uint", "bytes32"], [sigma1random2O[0][1],sigma1random2O[0][0], sigma1random2O[1][1],sigma1random2O[1][0],sigma2randomO[0], sigma2randomO[1], yminkO[0], yminkO[1], m]))
            s = bn128.Fr.add(k, bn128.Fr.mul(c, ski))
            const mu = (sigma1random, sigma2random, c, s)
        })
        it("Verif", async function () {
            //verifG
            let R = bn128.pairing(bn128.G1.timesFr(sigma1random, bn128.Fr.e(c)), gx)
            R = bn128.Gt.mul(R, bn128.pairing(sigma2random, bn128.G2.neg(bn128.G2.timesFr(g, bn128.Fr.e(c)))))
            R = bn128.Gt.mul(R, bn128.pairing(bn128.G1.timesFr(sigma1random, bn128.Fr.e(s)), gy))
            expect(bn128.Gt.eq(R, signpairing)).to.eq(true)
            //const _c = bn128.Fr.fromObject(ethers.utils.solidityKeccak256(["bytes", "bytes", "bytes", "bytes"], [sigma1random, sigma2random, R, m]))
            //expect(bn128.Fr.eq(_c, c)).to.eq(true)
        })
        it("Verif Simplified", async function () {
            //verifG simplified
            yk = bn128.G2.timesFr(gy, bn128.Fr.e(k))
            const ltmp = bn128.G2.sub(bn128.G2.sub(yk, bn128.G2.timesFr(gx, bn128.Fr.e(c))), bn128.G2.timesFr(gy, bn128.Fr.e(s)))
            const lpairing = bn128.pairing(sigma1random, ltmp)
            rpairing = bn128.pairing(bn128.G1.neg(bn128.G1.timesFr(sigma2random, bn128.Fr.e(c))), g)
            expect(bn128.Gt.eq(lpairing, rpairing)).to.eq(true)
        })
        it("Open signature", async function () {
            //openG
            let lopenpairing = bn128.pairing(sigma2random, g)
            lopenpairing = bn128.Gt.mul(lopenpairing, bn128.pairing(bn128.G1.neg(sigma1random), gx))
            let ropenpairing = bn128.pairing(sigma1random, tautilde)
            expect(bn128.Gt.eq(lopenpairing, ropenpairing)).to.eq(true)
        })
    });
});
