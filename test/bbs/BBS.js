const {expect} = require("chai");
const {buildBn128} = require("ffjavascript");
const {loadFixture} = require("@nomicfoundation/hardhat-network-helpers");

describe("BBS", function () {

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

        it("bbs plus (one message)", async function () {// We use loadFixture to setup our environment, and then assert that
            const {bn128, lib} = await loadFixture(initFixture);

            //const h0sk = bn128.F1.random();
            //const h0 = bn128.G1.timesFr(bn128.G1.one, r1);
            //const h1sk = bn128.F1.random();
            //const h1 = bn128.G1.timesScalar(bn128.G1.g, BigInt(toHexString(h1sk)));
            const h0 = bn128.G1.timesFr(bn128.G1.one, 2);
            const h1 = bn128.G1.timesFr(bn128.G1.one, 3);
            const sk = bn128.Fr.random();
            const pk = bn128.G2.timesFr(bn128.G2.one, sk)

            //sign
            const e = bn128.Fr.random()
            const s = bn128.Fr.random();
            const m = bn128.Fr.random();
            const h0s = bn128.G1.timesFr(h0, s)
            const h1m = bn128.G1.timesFr(h1, m)
            const invesk = bn128.Fr.inv(bn128.Fr.add(e, sk))
            //let _A = bn128.G1.add(bn128.G1.g, h0s)
            let _A = bn128.G1.add(h0s, h1m)
            const A = bn128.G1.timesFr(_A, invesk)

            //verif
            const pkg2e = bn128.G2.add(pk, bn128.G2.timesFr(bn128.G2.one, e))
            //const gh0s=bn128.G1.add(bn128.G1.g,h0s)
            //const gh0sh2m=bn128.G1.add(gh0s,h1m)
            const ea = bn128.pairing(A, pkg2e)
            const eb = bn128.pairing(_A, bn128.G2.one)
            expect(bn128.F12.eq(ea, eb)).to.eq(true);

            // pok
            const r1 = bn128.Fr.random();
            const r2 = bn128.Fr.random();
            const r3 = bn128.Fr.inv(r1);
            const APrime = bn128.G1.timesFr(A, r1)
            let ABar = bn128.G1.timesFr(APrime, sk)
            let d = bn128.G1.timesFr(_A, r1)
            d = bn128.G1.add(d, bn128.G1.timesFr(h0, bn128.Fr.neg(r2)))
            // not needed as we don't hide messages atm
            // const sPrime = bn128.Fr.add(s, bn128.Fr.neg(bn128.Fr.mul(r2, r3)))

            // pok verification
            const ea2 = bn128.pairing(APrime, pk)
            const eb2 = bn128.pairing(ABar, bn128.G2.one)
            expect(bn128.F12.eq(ea2, eb2)).to.eq(true);
            const lhs = bn128.G1.add(ABar, bn128.G1.neg(d))
            const rhs = bn128.G1.add(bn128.G1.timesFr(APrime, bn128.Fr.neg(e)), bn128.G1.timesFr(h0, r2))
            expect(bn128.G1.eq(lhs, rhs)).to.eq(true);

            // pok solidity verification
            const aa = bn128.G1.toObject(bn128.G1.toAffine(APrime))
            const bb = bn128.G2.toObject(bn128.G2.toAffine(pk))
            const cc = bn128.G1.toObject(bn128.G1.toAffine(bn128.G1.neg(ABar)))
            const dd = bn128.G2.toObject(bn128.G2.toAffine(bn128.G2.one))
            let inputs = []
            inputs[0] = aa[0]
            inputs[1] = aa[1]
            inputs[2] = bb[0][1]
            inputs[3] = bb[0][0]
            inputs[4] = bb[1][1]
            inputs[5] = bb[1][0]
            inputs[6] = cc[0]
            inputs[7] = cc[1]
            inputs[8] = dd[0][1]
            inputs[9] = dd[0][0]
            inputs[10] = dd[1][1]
            inputs[11] = dd[1][0]
            const result = await lib.bn256CustomCheckPairing(inputs)
            expect(result).to.eq(true)
        })

        it("bbs ", async function () {// We use loadFixture to setup our environment, and then assert that
            const {bn128} = await loadFixture(initFixture);
            const xi1 = bn128.Fr.random()
            const xi2 = bn128.Fr.random()

            const preu = bn128.Fr.random();
            const u = bn128.G1.timesFr(bn128.G1.one, preu)
            const h = bn128.G1.timesFr(u, xi1);
            const prev = bn128.Fr.div(bn128.Fr.mul(preu, xi1), xi2)
            expect(bn128.Fr.eq(bn128.Fr.mul(preu, xi1), bn128.Fr.mul(prev, xi2))).to.eq(true)
            const v = bn128.G1.timesFr(bn128.G1.one, prev);
            const h2 = bn128.G1.timesFr(v, xi2)
            expect(bn128.G1.eq(h, h2)).to.eq(true);
            const gamma = bn128.Fr.random();
            const w = bn128.G2.timesFr(bn128.G2.one, gamma)
            const gpk = (h, u, v, w);
            const gmsk = (xi1, xi2);

            const n = 2;
            const usersKeys = [...Array(n).keys()].map(_ => {
                const xi = bn128.Fr.random();
                const Ai = bn128.G1.timesFr(bn128.G1.one, bn128.Fr.inv(bn128.Fr.add(gamma, xi)))
                return [Ai, xi];
            });

            // sign
            const M = bn128.Fr.random()
            const A = usersKeys[0][0]
            const x = usersKeys[0][1]
            const alpha = bn128.Fr.random()
            const beta = bn128.Fr.random()
            const T1 = bn128.G1.timesFr(u, alpha);
            const T2 = bn128.G1.timesFr(v, beta);
            const T3 = bn128.G1.add(A, bn128.G1.timesFr(h, bn128.Fr.add(alpha, beta)));
            const gamma1 = bn128.Fr.mul(x, alpha)
            const gamma2 = bn128.Fr.mul(x, beta)
            const ralpha = bn128.Fr.random()
            const rbeta = bn128.Fr.random()
            const rx = bn128.Fr.random()
            const rgamma1 = bn128.Fr.random()
            const rgamma2 = bn128.Fr.random()
            const R1 = bn128.G1.timesFr(u, ralpha)
            const R2 = bn128.G1.timesFr(v, rbeta)

            const minralphminbeta = bn128.Fr.sub(bn128.Fr.neg(ralpha), rbeta)
            const minrgamma1mingamma2 = bn128.Fr.sub(bn128.Fr.neg(rgamma1), rgamma2)
            let R3 = bn128.pairing(bn128.G1.timesFr(T3, rx), bn128.G2.one)
            R3 = bn128.Gt.add(R3, bn128.pairing(bn128.G1.timesFr(h, minralphminbeta), w))
            R3 = bn128.Gt.add(R3, bn128.pairing(bn128.G1.timesFr(h, minrgamma1mingamma2), bn128.G2.one))
            const R4 = bn128.G1.add(bn128.G1.timesFr(T1, rx), bn128.G1.timesFr(u, bn128.Fr.neg(rgamma1)))
            const R5 = bn128.G1.add(bn128.G1.timesFr(T2, rx), bn128.G1.timesFr(v, bn128.Fr.neg(rgamma2)))
            let c = ethers.utils.solidityKeccak256(["bytes32", "bytes", "bytes", "bytes", "bytes", "bytes", "bytes", "bytes", "bytes"], [M, T1, T2, T3, R1, R2, R3, R4, R5]);
            c = bn128.Fr.fromObject(c)
            const salpha = bn128.Fr.add(ralpha, bn128.Fr.mul(c, alpha))
            const sbeta = bn128.Fr.add(rbeta, bn128.Fr.mul(c, beta))
            const sx = bn128.Fr.add(rx, bn128.Fr.mul(c, x))
            const sgamma1 = bn128.Fr.add(rgamma1, bn128.Fr.mul(c, gamma1))
            const sgamma2 = bn128.Fr.add(rgamma2, bn128.Fr.mul(c, gamma2))

            //verif
            const minsalphminbeta = bn128.Fr.sub(bn128.Fr.neg(salpha), sbeta)
            const minsgamma1mingamma2 = bn128.Fr.sub(bn128.Fr.neg(sgamma1), sgamma2)
            const _R1 = bn128.G1.add(bn128.G1.timesFr(u, salpha), bn128.G1.timesFr(T1, bn128.Fr.neg(c)))
            const _R2 = bn128.G1.add(bn128.G1.timesFr(v, sbeta), bn128.G1.timesFr(T2, bn128.Fr.neg(c)))
            const _R4 = bn128.G1.add(bn128.G1.timesFr(u, bn128.Fr.neg(sgamma1)), bn128.G1.timesFr(T1, sx))
            const _R5 = bn128.G1.add(bn128.G1.timesFr(v, bn128.Fr.neg(sgamma2)), bn128.G1.timesFr(T2, sx))
            let _R3 = bn128.pairing(T3, bn128.G2.add(bn128.G2.timesFr(w, c), bn128.G2.timesFr(bn128.G2.one, sx)))
            _R3 = bn128.Gt.add(_R3, bn128.pairing(bn128.G1.timesFr(h, minsalphminbeta), w))
            _R3 = bn128.Gt.add(_R3, bn128.pairing(bn128.G1.timesFr(h, minsgamma1mingamma2), bn128.G2.one))
            _R3 = bn128.Gt.sub(_R3, bn128.pairing(bn128.G1.timesFr(bn128.G1.one, c), bn128.G2.one))

            const _c = bn128.Fr.fromObject(ethers.utils.solidityKeccak256(["bytes32", "bytes", "bytes", "bytes", "bytes", "bytes", "bytes", "bytes", "bytes"], [M, T1, T2, T3, _R1, _R2, _R3, _R4, _R5]))
            //expect(bn128.Fr.eq(c, _c)).to.eq(true)

            //verif2

            //open
            const _A = bn128.G1.sub(T3, bn128.G1.add(bn128.G1.timesFr(T1, xi1), bn128.G1.timesFr(T2, xi2)))
            const res = usersKeys.map((e, i) => [e[0], i]).filter(e => bn128.G1.eq(e[0], _A))
            expect(res[0][1]).to.eq(0)
            expect(bn128.G1.eq(res[0][0], _A))

        })

    });
});
