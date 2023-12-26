
const G1ToAffineStruct = (bn128,point) => {
    const o = toG1AffineObject(bn128,point);
    return {
        x: o[0],
        y: o[1]
    }
}

const G2ToAffineStruct = (bn128,point) => {
    const o = toG2AffineObject(bn128,point);
    return {
        x: [o[0][1], o[0][0]],
        y: [o[1][1], o[1][0]]
    }
}

const toG1AffineObject = (bn128,point) => {
    return bn128.G1.toObject(bn128.G1.toAffine(point));
}

const toG2AffineObject = (bn128,point) => {
    return bn128.G2.toObject(bn128.G2.toAffine(point));
}

module.exports = {toG2AffineObject, toG1AffineObject, G1ToAffineStruct, G2ToAffineStruct}
