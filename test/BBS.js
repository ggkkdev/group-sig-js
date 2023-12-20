// This is an example test file. Hardhat will run every *.js file in `test/`,
// so feel free to add new ones.

// Hardhat tests are normally written with Mocha and Chai.

// We import Chai to use its asserting functions here.
const {expect, assert} = require("chai");
const {buildBn128, F1Field, getCurveFromName} = require("ffjavascript");

// We use `loadFixture` to share common setups (or fixtures) between tests.
// Using this simplifies your tests and makes them run faster, by taking
// advantage or Hardhat Network's snapshot functionality.
const {loadFixture} = require("@nomicfoundation/hardhat-network-helpers");
const {hexlify, randomBytes} = require("ethers/lib/utils");

const toHexString = (bytes) => {
    return "0x" + Array.from(bytes, (byte) => {
        return ('0' + (byte & 0xff).toString(16)).slice(-2);
    }).join('');
};

function mclToHex(arr, prefix = true) {
    //const arr = p.serialize();
    let s = '';
    for (let i = arr.length - 1; i >= 0; i--) {
        s += ('0' + arr[i].toString(16)).slice(-2);
    }
    return prefix ? '0x' + s : s;
}

describe("BBS", function () {

    async function initFixture() {
        const BBS = await ethers.getContractFactory("BBS");
        const bbs = await BBS.deploy();
        await bbs.deployed();


        const [owner, addr1, addr2] = await ethers.getSigners();
        const bn128 = await buildBn128();
        return {bbs, owner, addr1, addr2, bn128};
    }

    // You can nest describe calls to create subsections.
    describe("Deployment", function () {
        // `it` is another Mocha function. This is the one you use to define your
        // tests. It receives the test name, and a callback function.
//
        // If the callback function is async, Mocha will `await` it.
        it("Should set the right owner", async function () {// We use loadFixture to setup our environment, and then assert that
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
        it("Should set the right owner", async function () {// We use loadFixture to setup our environment, and then assert that
            const {bn128} = await loadFixture(initFixture);

            const g1a = bn128.G1.timesScalar(bn128.G1.g, 10);
            const g2a = bn128.G2.timesScalar(bn128.G2.g, 1);

            const g1b = bn128.G1.timesScalar(bn128.G1.g, 1);
            const g2b = bn128.G2.timesScalar(bn128.G2.g, 10);

            const pre1a = bn128.prepareG1(g1a);
            const pre2a = bn128.prepareG2(g2a);
            const pre1b = bn128.prepareG1(g1b);
            const pre2b = bn128.prepareG2(g2b);

            const r1 = bn128.millerLoop(pre1a, pre2a);
            const r2 = bn128.finalExponentiation(r1);
            const r3 = bn128.millerLoop(pre1b, pre2b);
            const r4 = bn128.finalExponentiation(r3);
            expect(bn128.F12.eq(r2, r4)).to.eq(true);
        })

        it("check pairing", async function () {// We use loadFixture to setup our environment, and then assert that
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

        it("check bls solidity", async function () {// We use loadFixture to setup our environment, and then assert that
            const {bbs, bn128} = await loadFixture(initFixture);
            const sk = bn128.Fr.random();
            const pk = bn128.G2.timesFr(bn128.G2.one, sk)
            const message = hexlify(randomBytes(12))


        })
        it("check pairing solidity", async function () {// We use loadFixture to setup our environment, and then assert that
            const {bbs, bn128} = await loadFixture(initFixture);
            const a = bn128.Fr.e(4)
            const b = bn128.Fr.e(3)
            const c = bn128.Fr.e(6)
            const d = bn128.Fr.e(2)

            let aa = bn128.G1.timesFr(bn128.G1.gAffine, a)
            //bn128.G1.toObject(bn128.G1.toAffine(bn128.G1.neg(bn128.G1.timesFr(bn128.G1.one,bn128.Fr.e(4)))))
            aa = bn128.G1.toObject(bn128.G1.toAffine(bn128.G1.neg(aa)))
            const bb = bn128.G2.toObject(bn128.G2.toAffine(bn128.G2.timesFr(bn128.G2.gAffine, b)))
            const cc = bn128.G1.toObject(bn128.G1.toAffine(bn128.G1.timesFr(bn128.G1.gAffine, c)))
            const dd = bn128.G2.toObject(bn128.G2.toAffine(bn128.G2.timesFr(bn128.G2.gAffine, d)))
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
            const result = await bbs.run(inputs)
            expect(result).to.eq(true)


        })
        it("bbs plus (one message)", async function () {// We use loadFixture to setup our environment, and then assert that
            const {bn128, bbs} = await loadFixture(initFixture);

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
            const result = await bbs.run(inputs)
            expect(result).to.eq(true)
        })

        it("bbs ", async function () {// We use loadFixture to setup our environment, and then assert that
            const {bn128, bbs} = await loadFixture(initFixture);
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

            //let cd = bn128.pairing(bn128.G1.timesFr(T3, rx), bn128.G2.one)
        })
        it("test pairings ", async function () {
            const {bn128, bbs} = await loadFixture(initFixture);

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

        it("ps signatures ", async function () {
            const {bn128, bbs} = await loadFixture(initFixture);
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

            const result = await bbs.run([e1a[0], e1a[1], e1b[0][1], e1b[0][0], e1b[1][1], e1b[1][0], e2a[0], e2a[1], e2b[0][1], e2b[0][0], e2b[1][1], e2b[1][0]])
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
            console.log("Gas used for ps verification function"+resVerif2.gasUsed.toString())
            expect(resVerif2.events[resVerif2.events.length - 1].args.result).to.eq(true)

            //openG
            let lopenpairing = bn128.pairing(sigma2random, g)
            lopenpairing = bn128.Gt.mul(lopenpairing, bn128.pairing(bn128.G1.neg(sigma1random), gx))
            let ropenpairing = bn128.pairing(sigma1random, tautilde)
            expect(bn128.Gt.eq(lopenpairing, ropenpairing)).to.eq(true)


        })
    });
});
