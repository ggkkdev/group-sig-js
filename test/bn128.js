const {expect, assert} = require("chai");
const {buildBn128} = require("ffjavascript");

const {loadFixture} = require("@nomicfoundation/hardhat-network-helpers");

describe("bn128", function () {

    async function initFixture() {
        const Lib = await ethers.getContractFactory("BN256G1");
        const lib = await Lib.deploy();
        await lib.deployed();

        const [owner, addr1, addr2] = await ethers.getSigners();
        const bn128 = await buildBn128();
        return {lib, owner, addr1, addr2, bn128};
    }

    describe("Deployment", function () {

        it("Basic check on pairings", async function () {// We use loadFixture to setup our environment, and then assert that
            // things went well
            const {owner, bn128} = await loadFixture(initFixture);
            const r1 = bn128.Fr.e(33);
            const r2 = bn128.Fr.e(44);

            const gr1 = bn128.G1.timesFr(bn128.G1.g, r1);
            const gr2 = bn128.G1.timesFr(bn128.G1.g, r2);
            const grsum1 = bn128.G1.add(gr1, gr2);
            const grsum2 = bn128.G1.timesFr(bn128.G1.g, bn128.Fr.add(r1, r2));
            expect(bn128.G1.eq(grsum1, grsum2)).to.eq(true);
        });


        it("Basic check on pairings2", async function () {// We use loadFixture to setup our environment, and then assert that
            const {bn128} = await loadFixture(initFixture);
            const g1a = bn128.G1.timesScalar(bn128.G1.g, 10);
            const g1b = bn128.G1.timesScalar(bn128.G1.g, 1);
            const g2a = bn128.G2.timesScalar(bn128.G2.g, 1);
            const g2b = bn128.G2.timesScalar(bn128.G2.g, 10);
            const ea = bn128.pairing(g1a, g2a)
            const eb = bn128.pairing(g1b, g2b)
            //console.log(bn128.)
            expect(bn128.F12.eq(ea, eb)).to.eq(true);
        })
        it("Basic check on pairings4", async function () {
            const {bn128} = await loadFixture(initFixture);
            const c = bn128.G1.F.toObject(bn128.G1.F.fromObject(ethers.utils.solidityKeccak256(["uint"], [123])))
            const d=bn128.G1.F.toObject(bn128.G1.F.random())
            const cdmod=c*d%bn128.Fr.p

            const g1a = bn128.G1.timesScalar(bn128.G1.g, c);
            const g2a = bn128.G2.timesScalar(bn128.G2.g, d);
            const ea = bn128.pairing(g1a, g2a)
            const g1b = bn128.G1.timesScalar(bn128.G1.g, 1);
            const g2b = bn128.G2.timesScalar(bn128.G2.g,cdmod);
            const eb = bn128.pairing(g1b, g2b)
            //bn128.Gt.eq(ea,bn128.pairing(g1b, bn128.G2.timesScalar(bn128.G2.g,bn128.Fr.mul(bn128.Fr.e(c),bn128.Fr.e(d)))))
            //bn128.Gt.eq(ea,bn128.pairing(g1b, bn128.G2.timesScalar(bn128.G2.g, c*d%bn128.Fr.p)))
            //bn128.G1.eq(bn128.G1.timesScalar(bn128.G1.g, c*d), bn128.G1.timesFr(bn128.G1.g,bn128.Fr.mul(bn128.Fr.e(d),bn128.Fr.e(c))))
            //bn128.Fr.toObject(bn128.Fr.mul(bn128.Fr.e(d),bn128.Fr.e(c)))==bn128.G1.F.toObject(bn128.G1.F.mul(bn128.G1.F.e(c),bn128.G1.F.e(d)))
            expect(bn128.Gt.eq(ea, eb)).to.eq(true);
        })

        it("Basic check on pairings3", async function () {
            const {bn128} = await loadFixture(initFixture);

            const _alpha = bn128.Fr.random();
            const _alpha2 = bn128.Fr.random();
            const alpha = bn128.G1.timesFr(bn128.G1.one, _alpha)
            const alpha2 = bn128.G2.timesFr(bn128.G2.one, _alpha2)
            const _beta = bn128.Fr.random();
            const _beta2 = bn128.Fr.random();
            const beta = bn128.G1.timesFr(bn128.G1.one, _beta)
            const beta2 = bn128.G2.timesFr(bn128.G2.one, _beta2)
            const alphabeta = bn128.G1.add(alpha, beta);
            const alphabeta2 = bn128.G2.add(alpha2, beta2);
            const pair1 = bn128.pairing(alpha, bn128.G2.one)
            const pair2 = bn128.pairing(beta, bn128.G2.one)
            const pair3 = bn128.pairing(alphabeta, bn128.G2.one)
            const pairsum = bn128.Gt.mul(pair1, pair2)
            expect(bn128.Gt.eq(pairsum, pair3)).to.eq(true)
        })

        it("Check pairing in solidity", async function () {// We use loadFixture to setup our environment, and then assert that
            const {lib, bn128} = await loadFixture(initFixture);
            const a = bn128.Fr.e(4)
            const b = bn128.Fr.e(3)
            const c = bn128.Fr.e(6)
            const d = bn128.Fr.e(2)

            const e1a = bn128.G1.toObject(bn128.G1.toAffine(bn128.G1.neg(bn128.G1.timesFr(bn128.G1.gAffine, a))))
            const e1b = bn128.G2.toObject(bn128.G2.toAffine(bn128.G2.timesFr(bn128.G2.gAffine, b)))
            const e2a = bn128.G1.toObject(bn128.G1.toAffine(bn128.G1.timesFr(bn128.G1.gAffine, c)))
            const e2b = bn128.G2.toObject(bn128.G2.toAffine(bn128.G2.timesFr(bn128.G2.gAffine, d)))
            const result = await lib.bn256CustomCheckPairing([e1a[0], e1a[1], e1b[0][1], e1b[0][0], e1b[1][1], e1b[1][0], e2a[0], e2a[1], e2b[0][1], e2b[0][0], e2b[1][1], e2b[1][0]])
            expect(result).to.eq(true)
        })
    });
});
